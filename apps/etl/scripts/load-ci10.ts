/**
 * load-ci10.ts — Pobla catálogo tipo_diagnostico con códigos CIE-10
 * desde los datos de SINADEF (causas de muerte oncológicas C00-C97)
 * y catálogo manual de los cánceres DPCAN
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

// ── Conexión ──
const sql = postgres({
  host: process.env.POSTGRES_OLTP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLTP_PORT) || 5433,
  database: process.env.POSTGRES_OLTP_DB || "oncologia_oltp",
  username: process.env.POSTGRES_OLTP_USER || "oncologia",
  password: process.env.POSTGRES_OLTP_PASSWORD || "oncologia_dev_2026",
});

// ── Catálogo CIE-10 de cánceres ──
const CANCER_CATALOG: [string, string, string][] = [
  // DPCAN + comunes
  ["C50", "TUMOR MALIGNO DE LA MAMA", "MAMA"],
  ["C53", "TUMOR MALIGNO DEL CUELLO UTERINO", "CERVIX"],
  ["C18", "TUMOR MALIGNO DEL COLON", "COLON-RECTO"],
  ["C19", "TUMOR MALIGNO DE LA UNION RECTOSIGMOIDEA", "COLON-RECTO"],
  ["C20", "TUMOR MALIGNO DEL RECTO", "COLON-RECTO"],
  ["C61", "TUMOR MALIGNO DE LA PROSTATA", "PROSTATA"],
  ["C34", "TUMOR MALIGNO DE LOS BRONQUIOS Y DEL PULMON", "PULMON"],
  ["C16", "TUMOR MALIGNO DEL ESTOMAGO", "GASTRICO"],
  ["C22", "TUMOR MALIGNO DEL HIGADO Y VIAS BILIARES", "HIGADO"],
  ["C25", "TUMOR MALIGNO DEL PANCREAS", "PANCREAS"],
  ["C64", "TUMOR MALIGNO DEL RIÑON", "RENAL"],
  ["C67", "TUMOR MALIGNO DE LA VEJIGA", "VEJIGA"],
  ["C71", "TUMOR MALIGNO DEL ENCEFALO", "CEREBRAL"],
  ["C90", "MIELOMA MULTIPLE", "HEMATOLOGICO"],
  ["C91", "LEUCEMIA LINFOIDE", "HEMATOLOGICO"],
  ["C92", "LEUCEMIA MIELOIDE", "HEMATOLOGICO"],
  ["C44", "TUMOR MALIGNO DE LA PIEL", "PIEL"],
  ["C15", "TUMOR MALIGNO DEL ESOFAGO", "DIGESTIVO"],
  ["C32", "TUMOR MALIGNO DE LA LARINGE", "CABEZA-CUELLO"],
  ["C56", "TUMOR MALIGNO DEL OVARIO", "GINECOLOGICO"],
  ["C54", "TUMOR MALIGNO DEL CUERPO UTERINO", "GINECOLOGICO"],
  ["C62", "TUMOR MALIGNO DEL TESTICULO", "GENITOURINARIO"],
  ["C82", "LINFOMA NO HODGKIN", "HEMATOLOGICO"],
  ["C81", "LINFOMA DE HODGKIN", "HEMATOLOGICO"],
];

async function loadCi10Catalog() {
  console.log("🧬 Poblando catálogo CIE-10 oncológico...\n");

  let inserted = 0;
  let skipped = 0;

  for (const [cod_cie10, nombre, grupo] of CANCER_CATALOG) {
    const exists = await sql`
      SELECT 1 FROM tipo_diagnostico WHERE cod_cie10 = ${cod_cie10} LIMIT 1
    `;

    if (exists.length === 0) {
      await sql`
        INSERT INTO tipo_diagnostico (cod_cie10, nombre, grupo, es_oncologico)
        VALUES (${cod_cie10}, ${nombre}, ${grupo}, TRUE)
      `;
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`  ${inserted} CIE-10 insertados, ${skipped} ya existían`);

  // ── Extraer CIE-10 oncológicos de SINADEF ──
  console.log("\n🔍 Extrayendo CIE-10 oncológicos de SINADEF...");

  const sqlSINADEFPATH = resolve(ROOT, "data/sinadef/fallecidos_sinadef.csv");
  const buf = readFileSync(sqlSINADEFPATH);
  const text = new TextDecoder("utf-8").decode(buf);
  const lines = text.split("\n");

  const cancerCodes = new Set<string>();
  const cancerNames = new Map<string, string>();
  const cancerRegex = /^C\d/;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("|");
    // Columnas CIE-X: 21, 23, 25, 27, 29, 31 (0-indexed)
    const cieCols = [21, 23, 25, 27, 29, 31].map((c) => cols[c]?.trim());

    for (const code of cieCols) {
      if (!code || code === "SIN REGISTRO") continue;
      // Solo códigos C (oncológicos)
      if (!cancerRegex.test(code)) continue;

      const baseCode = code.substring(0, 3); // C50, C16, etc.
      if (!cancerCodes.has(baseCode)) {
        cancerCodes.add(baseCode);

                // Buscar nombre en columna previa (CAUSA A/B/C/D/E/F)
                const causeColIdx = cieCols.indexOf(code);
                const causeNameCol = [20, 22, 24, 26, 28, 30][causeColIdx];
                const causeName = cols[causeNameCol]?.trim();
        if (causeName && causeName !== "SIN REGISTRO") {
          cancerNames.set(baseCode, causeName);
        }
      }

      if (cancerCodes.size >= 1000) break; // límite seguro
    }
    if (cancerCodes.size >= 1000) break;
  }

  console.log(`  Encontrados ${cancerCodes.size} códigos C oncológicos únicos`);

  // Insertar los que no están en el catálogo
  let fromSinadef = 0;
  for (const code of cancerCodes) {
    if (CANCER_CATALOG.some(([c]) => c === code)) continue;

    const exists = await sql`
      SELECT 1 FROM tipo_diagnostico WHERE cod_cie10 = ${code} LIMIT 1
    `;
    if (exists.length > 0) continue;

    const name = cancerNames.get(code) || `TUMOR MALIGNO (${code})`;
    await sql`
      INSERT INTO tipo_diagnostico (cod_cie10, nombre, grupo, es_oncologico)
      VALUES (${code}, ${name}, 'OTROS_ONCOLOGICOS', TRUE)
    `;
    fromSinadef++;
  }

  console.log(`  ${fromSinadef} nuevos CIE-10 desde SINADEF`);

  // Total
  const [total] = await sql`SELECT COUNT(*)::int as c FROM tipo_diagnostico`;
  console.log(`\n📊 Total catálogo CIE-10: ${total.c} códigos`);
}

loadCi10Catalog()
  .then(() => {
    console.log("✅ CIE-10 cargado exitosamente");
    sql.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    sql.end();
    process.exit(1);
  });
