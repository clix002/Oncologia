/**
 * Módulo de análisis estadístico
 *
 * Queries SQL para el data warehouse + análisis con simple-statistics
 */

import path from "node:path";
import { createClient } from "@libsql/client";
import * as ss from "simple-statistics";

function getDbUrl(): string {
	if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
	const dbPath = path.resolve(
		process.cwd(),
		process.env.DB_PATH || "data/oncologia.db",
	);
	return `file:${dbPath}`;
}

function openDb() {
	return createClient({
		url: getDbUrl(),
		authToken: process.env.TURSO_AUTH_TOKEN,
	});
}

// ── Queries pre-armadas ──

export async function getCasosPorDeptoAnio(departamento: string, año?: number) {
	const db = openDb();

	if (año) {
		const result = await db.execute({
			sql: `SELECT t.año, COUNT(*) as casos
				FROM fact_oncologia f
				JOIN dim_geografia g ON f.geografia_id = g.id
				JOIN dim_tiempo t ON f.tiempo_id = t.id
				WHERE g.departamento = ? AND t.año = ?
				GROUP BY t.año`,
			args: [departamento, año],
		});
		return result.rows.map((r) => ({
			año: Number(r.año),
			casos: Number(r.casos),
		}));
	}

	const result = await db.execute({
		sql: `SELECT t.año, COUNT(*) as casos
			FROM fact_oncologia f
			JOIN dim_geografia g ON f.geografia_id = g.id
			JOIN dim_tiempo t ON f.tiempo_id = t.id
			WHERE g.departamento = ?
			GROUP BY t.año ORDER BY t.año`,
		args: [departamento],
	});
	return result.rows.map((r) => ({
		año: Number(r.año),
		casos: Number(r.casos),
	}));
}

export async function getTasaIncidencia(departamento: string) {
	const db = openDb();
	const result = await db.execute({
		sql: `SELECT t.año, COUNT(*) as casos, p.total as poblacion,
			ROUND(CAST(COUNT(*) AS REAL) / p.total * 100000, 2) as tasa
			FROM fact_oncologia f
			JOIN dim_geografia g ON f.geografia_id = g.id
			JOIN dim_tiempo t ON f.tiempo_id = t.id
			LEFT JOIN poblacion p ON p.departamento = g.departamento AND p.año = t.año
			WHERE g.departamento = ?
			GROUP BY t.año ORDER BY t.año`,
		args: [departamento],
	});
	return result.rows.map((r) => ({
		año: Number(r.año),
		casos: Number(r.casos),
		poblacion: Number(r.poblacion),
		tasa: Number(r.tasa),
	}));
}

export async function getDistribucionSexo(departamento?: string, año?: number) {
	const db = openDb();
	let sql = `SELECT pa.sexo, COUNT(*) as casos
		FROM fact_oncologia f
		JOIN dim_geografia g ON f.geografia_id = g.id
		JOIN dim_tiempo t ON f.tiempo_id = t.id
		JOIN dim_paciente pa ON f.paciente_id = pa.id WHERE 1=1`;
	const args: any[] = [];

	if (departamento) {
		sql += " AND g.departamento = ?";
		args.push(departamento);
	}
	if (año) {
		sql += " AND t.año = ?";
		args.push(año);
	}
	sql += " GROUP BY pa.sexo";

	const result = await db.execute({ sql, args });
	return result.rows.map((r) => ({
		sexo: String(r.sexo),
		casos: Number(r.casos),
	}));
}

export async function getDistribucionEdad(departamento?: string, año?: number) {
	const db = openDb();
	let sql = `SELECT pa.grupo_etario, COUNT(*) as casos
		FROM fact_oncologia f
		JOIN dim_geografia g ON f.geografia_id = g.id
		JOIN dim_tiempo t ON f.tiempo_id = t.id
		JOIN dim_paciente pa ON f.paciente_id = pa.id
		WHERE pa.grupo_etario != 'DESCONOCIDO'`;
	const args: any[] = [];

	if (departamento) {
		sql += " AND g.departamento = ?";
		args.push(departamento);
	}
	if (año) {
		sql += " AND t.año = ?";
		args.push(año);
	}
	sql += " GROUP BY pa.grupo_etario ORDER BY pa.grupo_etario";

	const result = await db.execute({ sql, args });
	return result.rows.map((r) => ({
		grupo_etario: String(r.grupo_etario),
		casos: Number(r.casos),
	}));
}

export async function getRankingDepartamentos(año?: number) {
	const db = openDb();
	let sql = `SELECT g.departamento, COUNT(*) as casos
		FROM fact_oncologia f
		JOIN dim_geografia g ON f.geografia_id = g.id
		JOIN dim_tiempo t ON f.tiempo_id = t.id`;
	const args: any[] = [];

	if (año) {
		sql += " WHERE t.año = ?";
		args.push(año);
	}
	sql += " GROUP BY g.departamento ORDER BY casos DESC";

	const result = await db.execute({ sql, args });
	return result.rows.map((r) => ({
		departamento: String(r.departamento),
		casos: Number(r.casos),
	}));
}

export async function getTendenciaMensual(departamento: string, año: number) {
	const db = openDb();
	const result = await db.execute({
		sql: `SELECT t.mes, COUNT(*) as casos
			FROM fact_oncologia f
			JOIN dim_geografia g ON f.geografia_id = g.id
			JOIN dim_tiempo t ON f.tiempo_id = t.id
			WHERE g.departamento = ? AND t.año = ?
			GROUP BY t.mes ORDER BY t.mes`,
		args: [departamento, año],
	});
	return result.rows.map((r) => ({
		mes: Number(r.mes),
		casos: Number(r.casos),
	}));
}

export async function getProvincias(departamento: string, año?: number) {
	const db = openDb();
	let sql = `SELECT g.provincia, COUNT(*) as casos
		FROM fact_oncologia f
		JOIN dim_geografia g ON f.geografia_id = g.id
		JOIN dim_tiempo t ON f.tiempo_id = t.id
		WHERE g.departamento = ?`;
	const args: any[] = [departamento];

	if (año) {
		sql += " AND t.año = ?";
		args.push(año);
	}
	sql += " GROUP BY g.provincia ORDER BY casos DESC";

	const result = await db.execute({ sql, args });
	return result.rows.map((r) => ({
		provincia: String(r.provincia),
		casos: Number(r.casos),
	}));
}

// ── Análisis estadístico con simple-statistics ──

export async function calcularTendencia(departamento: string) {
	const datos = await getTasaIncidencia(departamento);
	if (datos.length < 2) return null;

	const points: [number, number][] = datos
		.filter((d) => d.tasa)
		.map((d) => [d.año, d.tasa]);

	if (points.length < 2) return null;

	const regression = ss.linearRegression(points);
	const line = ss.linearRegressionLine(regression);
	const rSquared = ss.rSquared(points, line);

	const tasas = points.map((p) => p[1]);

	return {
		pendiente: Math.round(regression.m * 100) / 100,
		intercepto: Math.round(regression.b * 100) / 100,
		r_cuadrado: Math.round(rSquared * 1000) / 1000,
		tendencia:
			regression.m > 0.5
				? "creciente"
				: regression.m < -0.5
					? "decreciente"
					: "estable",
		media_tasa: Math.round(ss.mean(tasas) * 100) / 100,
		desviacion: Math.round(ss.standardDeviation(tasas) * 100) / 100,
		datos: datos.map((d) => ({
			año: d.año,
			casos: d.casos,
			tasa: d.tasa,
			tasa_proyectada: Math.round(line(d.año) * 100) / 100,
		})),
	};
}

/**
 * Resumen estadístico completo de un departamento
 */
export async function resumenDepartamento(departamento: string) {
	const db = openDb();
	const totalResult = await db.execute({
		sql: `SELECT COUNT(*) as casos, AVG(f.edad) as edad_promedio
			FROM fact_oncologia f
			JOIN dim_geografia g ON f.geografia_id = g.id
			WHERE g.departamento = ?`,
		args: [departamento],
	});
	const total = totalResult.rows[0];

	return {
		departamento,
		total_casos: Number(total.casos),
		edad_promedio: Math.round((Number(total.edad_promedio) || 0) * 10) / 10,
		por_año: await getCasosPorDeptoAnio(departamento),
		sexo: await getDistribucionSexo(departamento),
		edad: await getDistribucionEdad(departamento),
		provincias: await getProvincias(departamento),
		tendencia: await calcularTendencia(departamento),
	};
}
