/**
 * load-tasas.ts — Carga tasas de mortalidad oncológica a fact_tasas_mortalidad
 *
 * Fuente: data/tasas_mortalidad/Tasa_Grupo10_LM_v1.xlsx
 * Filtro: ggrupos = "Enfermedades neoplasicas"
 * Años: 2000-2024, 25 departamentos + "#PERU" (nacional)
 */
import * as XLSX from "xlsx";
import postgres from "postgres";
import path from "path";

const olap = postgres({
  host: process.env.POSTGRES_OLAP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLAP_PORT) || 5434,
  database: process.env.POSTGRES_OLAP_DB || "oncologia_olap",
  username: process.env.POSTGRES_OLAP_USER || "oncologia",
  password: process.env.POSTGRES_OLAP_PASSWORD || "oncologia_dev_2026",
  max: 3,
  idle_timeout: 60,
});

const DATA_ROOT = path.resolve(__dirname, "../../../data");
const XLSX_PATH = path.resolve(
  process.env.DATA_PATH ||
    path.join(DATA_ROOT, "tasas_mortalidad/Tasa_Grupo10_LM_v1.xlsx")
);

function normalizeSexo(raw: string): string {
  if (raw === "#Total") return "Total";
  return raw; // "Hombre" | "Mujer"
}

function normalizeDepto(raw: string): string {
  if (raw === "#PERU") return "PERU";
  return raw.toUpperCase();
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  FASE 4b: Tasas Mortalidad Oncológica    ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // ── Leer xlsx ──
  console.log(`📂 Leyendo ${path.basename(XLSX_PATH)}...`);
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(ws, { defval: null }) as any[];
  console.log(`   ${allRows.length.toLocaleString()} filas totales\n`);

  // ── Filtrar oncológicas ──
  const rows = allRows.filter((r) => r.ggrupos === "Enfermedades neoplasicas");
  console.log(`🔬 Filas oncológicas (ggrupos = "Enfermedades neoplasicas"): ${rows.length.toLocaleString()}`);

  // ── Idempotente: limpiar ──
  console.log("🧹 Limpiando fact_tasas_mortalidad...");
  await olap`TRUNCATE fact_tasas_mortalidad RESTART IDENTITY`;

  // ── Insertar en batch usando unnest ──
  console.log("📥 Insertando registros...");
  const BATCH = 500;
  let inserted = 0;

  // Columnas como arrays paralelos para unnest
  const años: number[] = [];
  const deptos: string[] = [];
  const sexos: string[] = [];
  const ndefuns: number[] = [];
  const tasas_brutas: (number | null)[] = [];
  const tasas_ajusts: (number | null)[] = [];
  const errors: (number | null)[] = [];
  const lis: (number | null)[] = [];
  const lss: (number | null)[] = [];

  for (const r of rows) {
    años.push(Number(r.anofall));
    deptos.push(normalizeDepto(String(r.Departamento)));
    sexos.push(normalizeSexo(String(r.sexo)));
    ndefuns.push(Number(r.ndefun_) || 0);
    tasas_brutas.push(r.tasa_bruta != null ? Number(r.tasa_bruta) : null);
    tasas_ajusts.push(r.tasa_ajust != null ? Number(r.tasa_ajust) : null);
    errors.push(r.error != null ? Number(r.error) : null);
    lis.push(r.Li != null ? Number(r.Li) : null);
    lss.push(r.Ls != null ? Number(r.Ls) : null);
  }

  for (let i = 0; i < años.length; i += BATCH) {
    const slice = (arr: any[]) => arr.slice(i, i + BATCH);

    await olap`
      INSERT INTO fact_tasas_mortalidad
        (año, departamento, sexo, ndefun, tasa_bruta, tasa_ajust, error, li, ls)
      SELECT * FROM unnest(
        ${slice(años)}::smallint[],
        ${slice(deptos)}::varchar[],
        ${slice(sexos)}::varchar[],
        ${slice(ndefuns)}::integer[],
        ${slice(tasas_brutas)}::numeric[],
        ${slice(tasas_ajusts)}::numeric[],
        ${slice(errors)}::numeric[],
        ${slice(lis)}::numeric[],
        ${slice(lss)}::numeric[]
      ) AS t(año, departamento, sexo, ndefun, tasa_bruta, tasa_ajust, error, li, ls)
      ON CONFLICT (año, departamento, sexo) DO UPDATE
        SET ndefun     = EXCLUDED.ndefun,
            tasa_bruta = EXCLUDED.tasa_bruta,
            tasa_ajust = EXCLUDED.tasa_ajust,
            error      = EXCLUDED.error,
            li         = EXCLUDED.li,
            ls         = EXCLUDED.ls
    `;

    inserted += Math.min(BATCH, años.length - i);
    process.stdout.write(`\r   ${inserted}/${rows.length} filas...`);
  }

  console.log(`\n\n✅ ${inserted.toLocaleString()} registros insertados en fact_tasas_mortalidad\n`);

  // ── Verificación rápida ──
  const check = await olap`
    SELECT año, departamento, sexo, ndefun, ROUND(tasa_ajust::numeric, 2) AS tasa_ajust
    FROM fact_tasas_mortalidad
    WHERE departamento = 'PERU'
    ORDER BY año DESC, sexo
    LIMIT 9
  `;
  console.log("📊 Muestra (PERU, últimos años):");
  for (const r of check) {
    console.log(`   ${r.año}  ${String(r.departamento).padEnd(12)} ${String(r.sexo).padEnd(8)} ${String(r.ndefun).padStart(6)} defun  tasa=${r.tasa_ajust}`);
  }

  const totales = await olap`
    SELECT COUNT(*) as total, MIN(año) as desde, MAX(año) as hasta,
           COUNT(DISTINCT departamento) as deptos
    FROM fact_tasas_mortalidad
  `;
  const t = totales[0];
  console.log(`\n   Total: ${t.total} filas | Años: ${t.desde}-${t.hasta} | Deptos: ${t.deptos}`);
}

main()
  .then(() => { olap.end(); process.exit(0); })
  .catch((err) => { console.error("❌", err); olap.end(); process.exit(1); });
