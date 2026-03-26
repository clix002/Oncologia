/**
 * ETL: INEN + INEI → ayacucho.json
 *
 * Fuentes:
 *   - INEN: inen_pacientes_2022_2025.csv  (latin-1, ~66k filas)
 *   - INEI: inei_poblacion_departamentos.xlsx
 *
 * Salida: app/data/processed/ayacucho.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------
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
const OUT_DIR = resolve(ROOT, "app/data/processed");
const OUT_PATH = resolve(OUT_DIR, "ayacucho.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function median(arr: number[]): number {
	if (arr.length === 0) return 0;
	const sorted = [...arr].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

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

function inc<T extends Record<string, number>>(obj: T, key: string, by = 1) {
	(obj as Record<string, number>)[key] =
		((obj as Record<string, number>)[key] ?? 0) + by;
}

// ---------------------------------------------------------------------------
// 1. Leer INEI
// ---------------------------------------------------------------------------
console.log("Leyendo INEI xlsx…");

interface PopEntry {
	total: number;
	hombres: number;
	mujeres: number;
}

const AYACUCHO_UBIGEO = "050000";

// Mapping: año → columna-base (0-indexed en el array de la fila)
// Estructura de cada hoja: [ubigeo, nombre, yr1_total, yr1_h, yr1_m, yr2_total, yr2_h, yr2_m, yr3_total, yr3_h, yr3_m, ...]
const SHEET_YEARS: Record<string, [number, number, number]> = {
	"2015-2017": [2015, 2016, 2017],
	"2018-2020": [2018, 2019, 2020],
	"2021-2023": [2021, 2022, 2023],
	"2024-2026": [2024, 2025, 2026],
};

const poblacionInei: Record<string, PopEntry> = {};

const wb = XLSX.readFile(XLSX_PATH);

for (const [sheetName, years] of Object.entries(SHEET_YEARS)) {
	const ws = wb.Sheets[sheetName];
	if (!ws) {
		console.warn(`  Hoja no encontrada: ${sheetName}`);
		continue;
	}
	const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
		header: 1,
		defval: "",
	});

	const ayRow = rows.find((r) => String(r[0]).trim() === AYACUCHO_UBIGEO) as
		| (string | number)[]
		| undefined;

	if (!ayRow) {
		console.warn(`  Ayacucho no encontrado en hoja ${sheetName}`);
		continue;
	}

	years.forEach((year, idx) => {
		const baseCol = 2 + idx * 3; // 2, 5, 8
		poblacionInei[String(year)] = {
			total: Number(ayRow[baseCol]) || 0,
			hombres: Number(ayRow[baseCol + 1]) || 0,
			mujeres: Number(ayRow[baseCol + 2]) || 0,
		};
	});
}

console.log(
	"  Población INEI cargada para años:",
	Object.keys(poblacionInei).sort().join(", "),
);

// ---------------------------------------------------------------------------
// 2. Leer CSV INEN (latin-1)
// ---------------------------------------------------------------------------
console.log("Leyendo CSV INEN…");

const csvBuffer = readFileSync(CSV_PATH);
const csvText = new TextDecoder("latin1").decode(csvBuffer);

interface InenRow {
	UUID: string;
	HISTORIA: string;
	FEC_FILIACION: string;
	SEXO: string;
	EDAD: string;
	UBIGEO_LUGAR_RESIDENCIA: string;
	LUGAR_RESIDENCIA: string;
	CANT_ATENCIONES_CEX: string;
	FECHA_CORTE: string;
	[key: string]: string;
}

const parsed = Papa.parse<InenRow>(csvText, {
	header: true,
	skipEmptyLines: true,
	transformHeader: (h) => h.trim().replace(/^"|"$/g, ""),
});

if (parsed.errors.length > 0) {
	console.warn("  Advertencias del parser:", parsed.errors.slice(0, 5));
}

console.log(`  Total filas CSV: ${parsed.data.length}`);

// Filtrar Ayacucho
const ayacuchoRows = parsed.data.filter((row) =>
	row.LUGAR_RESIDENCIA?.toUpperCase().includes("AYACUCHO"),
);

console.log(`  Filas de Ayacucho: ${ayacuchoRows.length}`);

// ---------------------------------------------------------------------------
// 3. Procesar filas de Ayacucho
// ---------------------------------------------------------------------------
const YEARS = ["2022", "2023", "2024", "2025"];
const AGE_GROUPS = [
	"0-20",
	"21-30",
	"31-40",
	"41-50",
	"51-60",
	"61-70",
	"71-80",
	"81+",
];

// Estructuras de acumulación
const porAño: Record<string, number> = {};
const porMes: Record<string, Record<string, number>> = {};
const porSexo: Record<string, Record<string, number>> = {};
const porSexoTotal: Record<string, number> = { FEMENINO: 0, MASCULINO: 0 };
const porGrupoEtario: Record<string, Record<string, number>> = {};
const porGrupoEtarioTotal: Record<string, number> = {};
const porProvincia: Record<string, Record<string, number>> = {};
const porProvinciaTotal: Record<string, number> = {};
// Para atenciones CEX
const cexPorAño: Record<string, number[]> = {};

for (const year of YEARS) {
	porAño[year] = 0;
	porMes[year] = {};
	porSexo[year] = { FEMENINO: 0, MASCULINO: 0 };
	porGrupoEtario[year] = {};
	porProvincia[year] = {};
	cexPorAño[year] = [];
}

let totalCasos = 0;
let skippedFecha = 0;

for (const row of ayacuchoRows) {
	// Fecha de filiación: AAAAMMDD
	const fec = String(row.FEC_FILIACION ?? "")
		.trim()
		.replace(/"/g, "");
	if (fec.length < 6) {
		skippedFecha++;
		continue;
	}
	const year = fec.substring(0, 4);
	const month = String(parseInt(fec.substring(4, 6), 10)); // sin cero inicial

	if (!YEARS.includes(year)) continue;

	// Sexo
	const sexo = String(row.SEXO ?? "")
		.trim()
		.replace(/"/g, "")
		.toUpperCase();
	const validSexo = sexo === "FEMENINO" || sexo === "MASCULINO" ? sexo : null;

	// Edad
	const edad = parseInt(
		String(row.EDAD ?? "")
			.trim()
			.replace(/"/g, ""),
		10,
	);
	const grupo = Number.isNaN(edad) ? "desconocido" : ageGroup(edad);

	// Provincia: LUGAR_RESIDENCIA = " DPTO-PROVINCIA-DISTRITO"
	const lugarRaw = String(row.LUGAR_RESIDENCIA ?? "")
		.trim()
		.replace(/"/g, "");
	const partes = lugarRaw.split("-");
	const provincia = partes.length >= 2 ? partes[1].trim() : "DESCONOCIDA";

	// CEX
	const cex = parseInt(
		String(row.CANT_ATENCIONES_CEX ?? "")
			.trim()
			.replace(/"/g, ""),
		10,
	);

	// Acumular
	totalCasos++;
	inc(porAño, year);
	inc(porMes[year], month);

	if (validSexo) {
		inc(porSexo[year], validSexo);
		inc(porSexoTotal, validSexo);
	}

	inc(porGrupoEtario[year], grupo);
	inc(porGrupoEtarioTotal, grupo);

	inc(porProvincia[year], provincia);
	inc(porProvinciaTotal, provincia);

	if (!Number.isNaN(cex)) {
		cexPorAño[year].push(cex);
	}
}

if (skippedFecha > 0) {
	console.warn(`  Filas con fecha inválida descartadas: ${skippedFecha}`);
}

console.log(`  Total casos Ayacucho procesados: ${totalCasos}`);

// ---------------------------------------------------------------------------
// 4. Calcular tasas y estadísticas CEX
// ---------------------------------------------------------------------------
function tasa(casos: number, poblacion: number): number {
	if (!poblacion) return 0;
	return Math.round((casos / poblacion) * 100000 * 100) / 100;
}

const porAñoFinal: Record<
	string,
	{ casos: number; poblacion: number; tasa_por_100k: number; completo: boolean }
> = {};

for (const year of YEARS) {
	const pop = poblacionInei[year]?.total ?? 0;
	porAñoFinal[year] = {
		casos: porAño[year],
		poblacion: pop,
		tasa_por_100k: tasa(porAño[year], pop),
		completo: year !== "2025",
	};
}

// Atenciones CEX
const allCex: number[] = Object.values(cexPorAño).flat();
const avgTotal =
	allCex.length > 0
		? Math.round((allCex.reduce((a, b) => a + b, 0) / allCex.length) * 100) /
			100
		: 0;

const cexPorAñoFinal: Record<
	string,
	{ promedio: number; mediana: number; max: number }
> = {};

for (const year of YEARS) {
	const arr = cexPorAño[year];
	if (arr.length === 0) {
		cexPorAñoFinal[year] = { promedio: 0, mediana: 0, max: 0 };
		continue;
	}
	const sum = arr.reduce((a, b) => a + b, 0);
	cexPorAñoFinal[year] = {
		promedio: Math.round((sum / arr.length) * 100) / 100,
		mediana: median(arr),
		max: Math.max(...arr),
	};
}

// ---------------------------------------------------------------------------
// 5. Construir JSON final
// ---------------------------------------------------------------------------
const output = {
	meta: {
		fuente_casos:
			"INEN — Listado de Pacientes Nuevos Enero 2022-Noviembre 2025",
		fuente_poblacion:
			"INEI — Estimaciones y Proyecciones Departamentales 2000-2026",
		fecha_corte: "2025-11-29",
		año_parcial: 2025,
		nota_2025:
			"Datos solo hasta noviembre 2025, no comparar directamente con años completos",
		total_casos_ayacucho: totalCasos,
		departamento: "AYACUCHO",
	},
	por_año: porAñoFinal,
	por_mes: porMes,
	por_sexo: {
		...Object.fromEntries(YEARS.map((y) => [y, porSexo[y]])),
		total: porSexoTotal,
	},
	por_grupo_etario: {
		grupos: AGE_GROUPS,
		...Object.fromEntries(YEARS.map((y) => [y, porGrupoEtario[y]])),
		total: porGrupoEtarioTotal,
	},
	por_provincia: {
		...Object.fromEntries(YEARS.map((y) => [y, porProvincia[y]])),
		total: porProvinciaTotal,
	},
	atenciones_cex: {
		promedio_total: avgTotal,
		por_año: cexPorAñoFinal,
	},
	poblacion_inei: {
		2022: poblacionInei["2022"] ?? { total: 0, hombres: 0, mujeres: 0 },
		2023: poblacionInei["2023"] ?? { total: 0, hombres: 0, mujeres: 0 },
		2024: poblacionInei["2024"] ?? { total: 0, hombres: 0, mujeres: 0 },
		2025: poblacionInei["2025"] ?? { total: 0, hombres: 0, mujeres: 0 },
	},
};

// ---------------------------------------------------------------------------
// 6. Escribir
// ---------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");

console.log(`\nArchivo generado: ${OUT_PATH}`);
console.log("\n--- Resumen ---");
console.log("Total casos Ayacucho:", totalCasos);
for (const year of YEARS) {
	const d = porAñoFinal[year];
	console.log(
		`  ${year}: ${d.casos} casos | pob: ${d.poblacion.toLocaleString()} | tasa: ${d.tasa_por_100k}/100k`,
	);
}
