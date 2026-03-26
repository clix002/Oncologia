/**
 * Seed Vectors: genera chunks de texto + embeddings para RAG
 *
 * Requiere: GEMINI_API_KEY en .env.local
 * Requiere: data/oncologia.db ya poblada (bun etl/load-db.ts)
 *
 * Corre: bun etl/seed-vectors.ts
 */

import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { embedTexts } from "../lib/embeddings";

// Cargar .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const envPath = resolve(ROOT, ".env.local");
try {
	const envContent = readFileSync(envPath, "utf-8");
	for (const line of envContent.split("\n")) {
		const [key, ...vals] = line.split("=");
		if (key && !key.startsWith("#")) {
			process.env[key.trim()] = vals.join("=").trim();
		}
	}
} catch {}

const DB_PATH = process.env.DB_PATH || resolve(ROOT, "data/oncologia.db");
const db = new Database(DB_PATH);

// Limpiar embeddings previos
db.exec("DELETE FROM embeddings");

console.log("Generando chunks de texto...\n");

interface Chunk {
	type: string;
	key: string;
	content: string;
	metadata: Record<string, unknown>;
}

const chunks: Chunk[] = [];

// ── 1. Resumen por departamento/año ──

const deptoAnio = db
	.query(`
	SELECT g.departamento, t.año, COUNT(*) as casos,
		SUM(CASE WHEN p.sexo = 'FEMENINO' THEN 1 ELSE 0 END) as femenino,
		SUM(CASE WHEN p.sexo = 'MASCULINO' THEN 1 ELSE 0 END) as masculino,
		ROUND(AVG(f.edad), 1) as edad_promedio
	FROM fact_oncologia f
	JOIN dim_geografia g ON f.geografia_id = g.id
	JOIN dim_tiempo t ON f.tiempo_id = t.id
	JOIN dim_paciente p ON f.paciente_id = p.id
	GROUP BY g.departamento, t.año
	ORDER BY g.departamento, t.año
`)
	.all() as {
	departamento: string;
	año: number;
	casos: number;
	femenino: number;
	masculino: number;
	edad_promedio: number;
}[];

for (const row of deptoAnio) {
	const pob = db
		.query("SELECT total FROM poblacion WHERE departamento = ? AND año = ?")
		.get(row.departamento, row.año) as { total: number } | null;

	const tasa = pob
		? Math.round((row.casos / pob.total) * 100000 * 100) / 100
		: 0;
	const pctFem = Math.round((row.femenino / row.casos) * 100);

	const parcial = row.año === 2025 ? " (datos parciales enero-noviembre)" : "";
	const tasaStr = pob ? `, tasa de ${tasa} por 100,000 habitantes` : "";

	chunks.push({
		type: "resumen_depto_año",
		key: `${row.departamento}_${row.año}`,
		content: `En ${row.año}${parcial}, el departamento de ${row.departamento} registró ${row.casos} casos oncológicos nuevos en el INEN${tasaStr}. Distribución por sexo: ${pctFem}% femenino, ${100 - pctFem}% masculino. Edad promedio: ${row.edad_promedio} años.`,
		metadata: {
			departamento: row.departamento,
			año: row.año,
			casos: row.casos,
			tasa,
		},
	});
}

console.log(`  Chunks depto/año: ${deptoAnio.length}`);

// ── 2. Resumen total por departamento ──

const deptoTotal = db
	.query(`
	SELECT g.departamento, COUNT(*) as casos,
		SUM(CASE WHEN p.sexo = 'FEMENINO' THEN 1 ELSE 0 END) as femenino,
		ROUND(AVG(f.edad), 1) as edad_promedio
	FROM fact_oncologia f
	JOIN dim_geografia g ON f.geografia_id = g.id
	JOIN dim_paciente p ON f.paciente_id = p.id
	GROUP BY g.departamento
	ORDER BY casos DESC
`)
	.all() as {
	departamento: string;
	casos: number;
	femenino: number;
	edad_promedio: number;
}[];

for (const row of deptoTotal) {
	// Top provincia
	const topProv = db
		.query(`
		SELECT g.provincia, COUNT(*) as casos
		FROM fact_oncologia f
		JOIN dim_geografia g ON f.geografia_id = g.id
		WHERE g.departamento = ?
		GROUP BY g.provincia
		ORDER BY casos DESC
		LIMIT 1
	`)
		.get(row.departamento) as { provincia: string; casos: number } | null;

	const pctFem = Math.round((row.femenino / row.casos) * 100);
	const provStr = topProv
		? ` La provincia con mayor carga es ${topProv.provincia} con ${topProv.casos} casos (${Math.round((topProv.casos / row.casos) * 100)}%).`
		: "";

	chunks.push({
		type: "resumen_depto_total",
		key: `${row.departamento}_total`,
		content: `El departamento de ${row.departamento} acumuló ${row.casos.toLocaleString()} casos oncológicos nuevos entre 2022 y 2025 en el INEN. ${pctFem}% son mujeres, edad promedio ${row.edad_promedio} años.${provStr}`,
		metadata: { departamento: row.departamento, casos: row.casos },
	});
}

console.log(`  Chunks depto total: ${deptoTotal.length}`);

// ── 3. Tendencia mensual por departamento/año ──

const deptoMensual = db
	.query(`
	SELECT g.departamento, t.año, t.mes, COUNT(*) as casos
	FROM fact_oncologia f
	JOIN dim_geografia g ON f.geografia_id = g.id
	JOIN dim_tiempo t ON f.tiempo_id = t.id
	GROUP BY g.departamento, t.año, t.mes
	ORDER BY g.departamento, t.año, t.mes
`)
	.all() as { departamento: string; año: number; mes: number; casos: number }[];

// Agrupar por depto+año
const mensualMap = new Map<string, { mes: number; casos: number }[]>();
for (const row of deptoMensual) {
	const key = `${row.departamento}_${row.año}`;
	if (!mensualMap.has(key)) mensualMap.set(key, []);
	mensualMap.get(key)?.push({ mes: row.mes, casos: row.casos });
}

const meses = [
	"Ene",
	"Feb",
	"Mar",
	"Abr",
	"May",
	"Jun",
	"Jul",
	"Ago",
	"Sep",
	"Oct",
	"Nov",
	"Dic",
];
let mensualCount = 0;

for (const [key, datos] of mensualMap) {
	const [depto, añoStr] = key.split("_");
	if (datos.length < 3) continue; // ignorar si muy pocos meses

	const mesStr = datos.map((d) => `${meses[d.mes - 1]}=${d.casos}`).join(", ");
	const max = datos.reduce((a, b) => (b.casos > a.casos ? b : a));
	const promedio = Math.round(
		datos.reduce((s, d) => s + d.casos, 0) / datos.length,
	);

	chunks.push({
		type: "tendencia_mensual",
		key,
		content: `En ${depto} ${añoStr}, la distribución mensual de casos fue: ${mesStr}. El pico se registró en ${meses[max.mes - 1]} con ${max.casos} casos. Promedio mensual: ${promedio}.`,
		metadata: { departamento: depto, año: parseInt(añoStr, 10) },
	});
	mensualCount++;
}

console.log(`  Chunks tendencia mensual: ${mensualCount}`);

// ── 4. Ranking de departamentos por año ──

const años = [2022, 2023, 2024, 2025];

for (const año of años) {
	const ranking = db
		.query(`
		SELECT g.departamento, COUNT(*) as casos
		FROM fact_oncologia f
		JOIN dim_geografia g ON f.geografia_id = g.id
		JOIN dim_tiempo t ON f.tiempo_id = t.id
		WHERE t.año = ?
		GROUP BY g.departamento
		ORDER BY casos DESC
	`)
		.all(año) as { departamento: string; casos: number }[];

	const top10 = ranking.slice(0, 10);
	const rankStr = top10
		.map((r, i) => `${i + 1}. ${r.departamento} (${r.casos})`)
		.join(", ");
	const parcial = año === 2025 ? " (datos parciales)" : "";

	chunks.push({
		type: "ranking_deptos",
		key: `ranking_${año}`,
		content: `Ranking de departamentos por número de casos oncológicos registrados en INEN ${año}${parcial}: ${rankStr}. Total nacional: ${ranking.reduce((s, r) => s + r.casos, 0).toLocaleString()} casos.`,
		metadata: { año },
	});
}

console.log(`  Chunks ranking: ${años.length}`);

// ── 5. Distribución por grupo etario por departamento ──

const deptoEdad = db
	.query(`
	SELECT g.departamento, p.grupo_etario, COUNT(*) as casos
	FROM fact_oncologia f
	JOIN dim_geografia g ON f.geografia_id = g.id
	JOIN dim_paciente p ON f.paciente_id = p.id
	WHERE p.grupo_etario != 'DESCONOCIDO'
	GROUP BY g.departamento, p.grupo_etario
	ORDER BY g.departamento, p.grupo_etario
`)
	.all() as { departamento: string; grupo_etario: string; casos: number }[];

const edadMap = new Map<string, { grupo: string; casos: number }[]>();
for (const row of deptoEdad) {
	if (!edadMap.has(row.departamento)) edadMap.set(row.departamento, []);
	edadMap
		.get(row.departamento)
		?.push({ grupo: row.grupo_etario, casos: row.casos });
}

let edadCount = 0;
for (const [depto, grupos] of edadMap) {
	const totalDepto = grupos.reduce((s, g) => s + g.casos, 0);
	const grupoMax = grupos.reduce((a, b) => (b.casos > a.casos ? b : a));
	const grupoStr = grupos
		.map(
			(g) =>
				`${g.grupo}: ${g.casos} (${Math.round((g.casos / totalDepto) * 100)}%)`,
		)
		.join(", ");

	chunks.push({
		type: "distribucion_edad",
		key: `${depto}_edad`,
		content: `Distribución por grupo etario en ${depto} (2022-2025): ${grupoStr}. El grupo con mayor incidencia es ${grupoMax.grupo} con ${grupoMax.casos} casos (${Math.round((grupoMax.casos / totalDepto) * 100)}%).`,
		metadata: { departamento: depto },
	});
	edadCount++;
}

console.log(`  Chunks distribución edad: ${edadCount}`);

// ── 6. Detalle provincial (top provincias por depto) ──

let provCount = 0;
for (const depto of deptoTotal) {
	const provs = db
		.query(`
		SELECT g.provincia, COUNT(*) as casos
		FROM fact_oncologia f
		JOIN dim_geografia g ON f.geografia_id = g.id
		WHERE g.departamento = ?
		GROUP BY g.provincia
		ORDER BY casos DESC
		LIMIT 5
	`)
		.all(depto.departamento) as { provincia: string; casos: number }[];

	if (provs.length < 2) continue;

	const provStr = provs
		.map(
			(p) =>
				`${p.provincia}: ${p.casos} (${Math.round((p.casos / depto.casos) * 100)}%)`,
		)
		.join(", ");

	chunks.push({
		type: "detalle_provincial",
		key: `${depto.departamento}_provincias`,
		content: `Principales provincias de ${depto.departamento} por casos oncológicos (2022-2025): ${provStr}.`,
		metadata: { departamento: depto.departamento },
	});
	provCount++;
}

console.log(`  Chunks detalle provincial: ${provCount}`);

// ── Total chunks ──

console.log(`\nTotal chunks generados: ${chunks.length}`);

// ── 7. Generar embeddings ──

console.log("Generando embeddings con Google API...\n");

const texts = chunks.map((c) => c.content);
const embeddingsData = await embedTexts(texts);

console.log(`Embeddings generados: ${embeddingsData.length}`);

// ── 8. Insertar en DB ──

console.log("Insertando en DB...");

const insertEmb = db.prepare(
	"INSERT INTO embeddings (chunk_type, chunk_key, content, embedding, metadata_json) VALUES (?, ?, ?, ?, ?)",
);

const insertTx = db.transaction(() => {
	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		const emb = embeddingsData[i];
		const buffer = Buffer.from(emb.buffer);

		insertEmb.run(
			chunk.type,
			chunk.key,
			chunk.content,
			buffer,
			JSON.stringify(chunk.metadata),
		);
	}
});
insertTx();

const embCount = db.query("SELECT COUNT(*) as c FROM embeddings").get() as {
	c: number;
};
console.log(`Embeddings en DB: ${embCount.c}`);

db.close();
console.log("\nSeed de vectores completado.");
