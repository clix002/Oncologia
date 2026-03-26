/**
 * ETL Nacional: INEN CSV + INEI XLSX → SQLite (star schema)
 *
 * Procesa TODAS las regiones del Perú (~66k filas)
 * Corre: bun etl/load-db.ts
 */

import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const CSV_PATH = resolve(
	ROOT,
	"app/data/raw/inen/inen_pacientes_2022_2025.csv",
);
const XLSX_PATH = resolve(
	ROOT,
	"app/data/raw/inei/inei_poblacion_departamentos.xlsx",
);
const DB_PATH = process.env.DB_PATH || resolve(ROOT, "data/oncologia.db");

// ── Helpers ──

function ageGroup(age: number): string {
	if (age <= 20) return "0-20";
	if (age <= 30) return "21-30";
	if (age <= 40) return "31-40";
	if (age <= 50) return "41-50";
	if (age <= 60) return "51-60";
	if (age <= 70) return "61-70";
	if (age <= 80) return "71-80";
	return "81+";
}

function trimestre(mes: number): number {
	return Math.ceil(mes / 3);
}

// ── 1. Abrir DB ──

const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Limpiar tablas existentes (re-run safe)
db.exec(`
	DELETE FROM fact_oncologia;
	DELETE FROM dim_tiempo;
	DELETE FROM dim_geografia;
	DELETE FROM dim_paciente;
	DELETE FROM dim_fuente;
	DELETE FROM poblacion;
`);
console.log("DB limpia, cargando datos...\n");

// ── 2. Leer INEI XLSX (población de TODOS los departamentos) ──

console.log("Leyendo INEI xlsx...");

const SHEET_YEARS: Record<string, [number, number, number]> = {
	"2015-2017": [2015, 2016, 2017],
	"2018-2020": [2018, 2019, 2020],
	"2021-2023": [2021, 2022, 2023],
	"2024-2026": [2024, 2025, 2026],
};

// Departamentos con ubigeo (6 dígitos terminados en 0000)
const poblacionData: {
	departamento: string;
	año: number;
	total: number;
	hombres: number;
	mujeres: number;
}[] = [];

const wb = XLSX.readFile(XLSX_PATH);

for (const [sheetName, years] of Object.entries(SHEET_YEARS)) {
	const ws = wb.Sheets[sheetName];
	if (!ws) continue;

	const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
		header: 1,
		defval: "",
	});

	for (const row of rows) {
		const ubigeo = String(row[0]).trim();
		// Solo departamentos: ubigeo de 6 dígitos que termina en 0000
		if (!/^\d{2}0000$/.test(ubigeo)) continue;
		// Excluir el total nacional (000000)
		if (ubigeo === "000000") continue;

		const nombre = String(row[1]).trim().toUpperCase();

		for (let idx = 0; idx < 3; idx++) {
			const year = years[idx];
			if (year < 2022 || year > 2025) continue; // solo años relevantes

			const baseCol = 2 + idx * 3;
			const total = Number(row[baseCol]) || 0;
			const hombres = Number(row[baseCol + 1]) || 0;
			const mujeres = Number(row[baseCol + 2]) || 0;

			if (total > 0) {
				poblacionData.push({
					departamento: nombre,
					año: year,
					total,
					hombres,
					mujeres,
				});
			}
		}
	}
}

// Insertar población
const insertPob = db.prepare(
	"INSERT INTO poblacion (departamento, año, total, hombres, mujeres) VALUES (?, ?, ?, ?, ?)",
);

const insertPobTx = db.transaction(() => {
	for (const p of poblacionData) {
		insertPob.run(p.departamento, p.año, p.total, p.hombres, p.mujeres);
	}
});
insertPobTx();

const deptosPob = new Set(poblacionData.map((p) => p.departamento));
console.log(
	`  ${poblacionData.length} registros de población (${deptosPob.size} departamentos)`,
);

// ── 3. Leer CSV INEN (todo el Perú) ──

console.log("Leyendo CSV INEN (todas las regiones)...");

const csvBuffer = readFileSync(CSV_PATH);
const csvText = new TextDecoder("latin1").decode(csvBuffer);

interface InenRow {
	UUID: string;
	FEC_FILIACION: string;
	SEXO: string;
	EDAD: string;
	UBIGEO_LUGAR_RESIDENCIA: string;
	LUGAR_RESIDENCIA: string;
	CANT_ATENCIONES_CEX: string;
	[key: string]: string;
}

const parsed = Papa.parse<InenRow>(csvText, {
	header: true,
	skipEmptyLines: true,
	transformHeader: (h) => h.trim().replace(/^"|"$/g, ""),
});

console.log(`  Total filas CSV: ${parsed.data.length}`);

// ── 4. Insertar dimensiones + facts ──

// Fuente
const insertFuente = db.prepare(
	"INSERT INTO dim_fuente (nombre, rango_fechas, nota) VALUES (?, ?, ?)",
);
const fuenteInen = insertFuente.run(
	"INEN",
	"Enero 2022 - Noviembre 2025",
	"Listado de Pacientes Nuevos registrados en el INEN",
);
const fuenteInenId = Number(fuenteInen.lastInsertRowid);

// Dimension caches: key → id
const tiempoCache = new Map<string, number>();
const geoCache = new Map<string, number>();
const pacienteCache = new Map<string, number>();

const insertTiempo = db.prepare(
	"INSERT INTO dim_tiempo (año, mes, trimestre, completo) VALUES (?, ?, ?, ?)",
);
const insertGeo = db.prepare(
	"INSERT INTO dim_geografia (departamento, provincia, distrito, ubigeo) VALUES (?, ?, ?, ?)",
);
const insertPaciente = db.prepare(
	"INSERT INTO dim_paciente (sexo, grupo_etario) VALUES (?, ?)",
);
const insertFact = db.prepare(
	"INSERT INTO fact_oncologia (uuid_hash, tiempo_id, geografia_id, paciente_id, fuente_id, edad, cant_atenciones_cex) VALUES (?, ?, ?, ?, ?, ?, ?)",
);

function getOrCreateTiempo(año: number, mes: number): number {
	const key = `${año}-${mes}`;
	const cached = tiempoCache.get(key);
	if (cached) return cached;

	const result = insertTiempo.run(
		año,
		mes,
		trimestre(mes),
		año !== 2025 ? 1 : 0,
	);
	const id = Number(result.lastInsertRowid);
	tiempoCache.set(key, id);
	return id;
}

function getOrCreateGeo(
	departamento: string,
	provincia: string,
	distrito: string,
	ubigeo: string,
): number {
	const key = `${departamento}|${provincia}|${distrito}`;
	const cached = geoCache.get(key);
	if (cached) return cached;

	const result = insertGeo.run(departamento, provincia, distrito, ubigeo);
	const id = Number(result.lastInsertRowid);
	geoCache.set(key, id);
	return id;
}

function getOrCreatePaciente(sexo: string, grupoEtario: string): number {
	const key = `${sexo}|${grupoEtario}`;
	const cached = pacienteCache.get(key);
	if (cached) return cached;

	const result = insertPaciente.run(sexo, grupoEtario);
	const id = Number(result.lastInsertRowid);
	pacienteCache.set(key, id);
	return id;
}

// Procesar en transacción
let insertados = 0;
let descartados = 0;
const deptosVistos = new Set<string>();

const loadFacts = db.transaction(() => {
	for (const row of parsed.data) {
		// Fecha
		const fec = String(row.FEC_FILIACION ?? "")
			.trim()
			.replace(/"/g, "");
		if (fec.length < 6) {
			descartados++;
			continue;
		}
		const año = parseInt(fec.substring(0, 4), 10);
		const mes = parseInt(fec.substring(4, 6), 10);
		if (año < 2022 || año > 2025 || mes < 1 || mes > 12) {
			descartados++;
			continue;
		}

		// Sexo
		const sexo = String(row.SEXO ?? "")
			.trim()
			.replace(/"/g, "")
			.toUpperCase();
		const validSexo =
			sexo === "FEMENINO" || sexo === "MASCULINO" ? sexo : "DESCONOCIDO";

		// Edad
		const edad = parseInt(
			String(row.EDAD ?? "")
				.trim()
				.replace(/"/g, ""),
			10,
		);
		const grupo = Number.isNaN(edad) ? "DESCONOCIDO" : ageGroup(edad);

		// Geografía: LUGAR_RESIDENCIA = " DPTO-PROVINCIA-DISTRITO"
		const lugarRaw = String(row.LUGAR_RESIDENCIA ?? "")
			.trim()
			.replace(/"/g, "");
		const ubigeo = String(row.UBIGEO_LUGAR_RESIDENCIA ?? "")
			.trim()
			.replace(/"/g, "");
		const partes = lugarRaw.split("-");
		const departamento = (partes[0] || "DESCONOCIDO").trim().toUpperCase();
		const provincia = (partes[1] || "DESCONOCIDO").trim().toUpperCase();
		const distrito = (partes[2] || "").trim().toUpperCase();

		// CEX
		const cex = parseInt(
			String(row.CANT_ATENCIONES_CEX ?? "")
				.trim()
				.replace(/"/g, ""),
			10,
		);

		// UUID
		const uuid = String(row.UUID ?? "")
			.trim()
			.replace(/"/g, "")
			.substring(0, 16);

		// Insertar
		const tiempoId = getOrCreateTiempo(año, mes);
		const geoId = getOrCreateGeo(departamento, provincia, distrito, ubigeo);
		const pacienteId = getOrCreatePaciente(validSexo, grupo);

		insertFact.run(
			uuid,
			tiempoId,
			geoId,
			pacienteId,
			fuenteInenId,
			Number.isNaN(edad) ? null : edad,
			Number.isNaN(cex) ? null : cex,
		);

		deptosVistos.add(departamento);
		insertados++;
	}
});

console.log("Insertando facts...");
loadFacts();

// ── 5. Resumen ──

console.log(`\n--- Resumen ETL Nacional ---`);
console.log(`Facts insertados:  ${insertados.toLocaleString()}`);
console.log(`Descartados:       ${descartados}`);
console.log(`Departamentos:     ${deptosVistos.size}`);
console.log(`Provincias:        ${geoCache.size}`);
console.log(`Periodos tiempo:   ${tiempoCache.size}`);
console.log(`Grupos paciente:   ${pacienteCache.size}`);

// Contar por tabla
const counts = [
	"fact_oncologia",
	"dim_tiempo",
	"dim_geografia",
	"dim_paciente",
	"dim_fuente",
	"poblacion",
];

console.log("\nConteo por tabla:");
for (const table of counts) {
	const row = db.query(`SELECT COUNT(*) as c FROM ${table}`).get() as {
		c: number;
	};
	console.log(`  ${table}: ${row.c}`);
}

// Top 5 departamentos
console.log("\nTop 5 departamentos por casos:");
const topDeptos = db
	.query(`
	SELECT g.departamento, COUNT(*) as casos
	FROM fact_oncologia f
	JOIN dim_geografia g ON f.geografia_id = g.id
	GROUP BY g.departamento
	ORDER BY casos DESC
	LIMIT 5
`)
	.all() as { departamento: string; casos: number }[];

for (const d of topDeptos) {
	console.log(`  ${d.departamento}: ${d.casos.toLocaleString()} casos`);
}

db.close();
console.log("\nETL completado.");
