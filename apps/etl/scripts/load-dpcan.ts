/**
 * load-dpcan.ts — Carga datos DPCAN a fact_dpcan
 *
 * Fuentes: data/dpcan/Reporte-Observatorio-DPCAN-*.xlsx
 * Tipos: MA (mama), CORE (colon-recto), CU (cuello uterino), PRO (próstata)
 * Columnas: DIRIS, Provincia, Distrito, renaes, EESS, CAT_ESTAB,
 *           Año, mes, Indicador, Renaes2, Sexo, Num, Den, Poblacion_70, Poblacion_100
 */
import * as XLSX from "xlsx";
import postgres from "postgres";
import path from "path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.resolve(__dirname, "../../../data");

const olap = postgres({
  host: process.env.POSTGRES_OLAP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLAP_PORT) || 5434,
  database: process.env.POSTGRES_OLAP_DB || "oncologia_olap",
  username: process.env.POSTGRES_OLAP_USER || "oncologia",
  password: process.env.POSTGRES_OLAP_PASSWORD || "oncologia_dev_2026",
  max: 5,
  idle_timeout: 60,
});

const TIPO_CANCER: Record<string, string> = {
  MA: "Mama",
  CORE: "Colon-Recto",
  CU: "Cuello Uterino",
  PRO: "Próstata",
};

const FILES = [
  "Reporte-Observatorio-DPCAN-CaMama.xlsx",
  "Reporte-Observatorio-DPCAN-Colon-recto.xlsx",
  "Reporte-Observatorio-DPCAN-CuelloUterino.xlsx",
  "Reporte-Observatorio-DPCAN-Prostata.xlsx",
];

interface Row {
  tipo_cancer: string;
  departamento: string;
  provincia: string;
  año: number;
  mes: number;
  sexo: string;
  num: number;
  den: number;
  poblacion_70: number;
  poblacion_100: number;
}

function normalizeDepto(raw: string): string {
  return String(raw || "").trim().toUpperCase();
}

function loadFile(filePath: string): Row[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["Data"];
  if (!ws) throw new Error(`Sheet 'Data' not found in ${filePath}`);
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

  const rows: Row[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.length < 12) continue;
    const indicador = String(r[8] || "").trim();
    const tipo_cancer = TIPO_CANCER[indicador] ?? indicador;
    const año = Number(r[6]);
    const mes = Number(r[7]);
    if (!año || !mes) continue;

    rows.push({
      tipo_cancer,
      departamento: normalizeDepto(r[0]),
      provincia: String(r[1] || "").trim().toUpperCase(),
      año,
      mes,
      sexo: String(r[10] || "").trim(),
      num: Number(r[11]) || 0,
      den: Number(r[12]) || 0,
      poblacion_70: Number(r[13]) || 0,
      poblacion_100: Number(r[14]) || 0,
    });
  }
  return rows;
}

async function main() {
  console.log("🗑  Truncating fact_dpcan...");
  await olap`TRUNCATE fact_dpcan RESTART IDENTITY`;

  for (const file of FILES) {
    const filePath = path.join(DATA_ROOT, "dpcan", file);
    console.log(`📂 Loading ${file}...`);
    const rows = loadFile(filePath);
    console.log(`   ${rows.length.toLocaleString()} rows parsed`);

    const BATCH = 5000;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      await olap`
        INSERT INTO fact_dpcan
          (tipo_cancer, departamento, provincia, año, mes, sexo, num, den, poblacion_70, poblacion_100)
        SELECT * FROM unnest(
          ${olap.array(chunk.map(r => r.tipo_cancer))}::text[],
          ${olap.array(chunk.map(r => r.departamento))}::text[],
          ${olap.array(chunk.map(r => r.provincia))}::text[],
          ${olap.array(chunk.map(r => r.año))}::int[],
          ${olap.array(chunk.map(r => r.mes))}::int[],
          ${olap.array(chunk.map(r => r.sexo))}::text[],
          ${olap.array(chunk.map(r => r.num))}::int[],
          ${olap.array(chunk.map(r => r.den))}::int[],
          ${olap.array(chunk.map(r => r.poblacion_70))}::int[],
          ${olap.array(chunk.map(r => r.poblacion_100))}::int[]
        )
      `;
    }
    console.log(`   ✓ inserted`);
  }

  const [{ count }] = await olap`SELECT COUNT(*) FROM fact_dpcan`;
  console.log(`\n✅ fact_dpcan: ${Number(count).toLocaleString()} total rows`);
  await olap.end();
}

main().catch(e => { console.error(e); process.exit(1); });
