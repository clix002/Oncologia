/**
 * load-sinadef-v2.ts — Carga defunciones oncológicas de SINADEF al OLTP
 * Versión batch optimizada con COPY para máxima velocidad.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

const sql = postgres({
  host: process.env.POSTGRES_OLTP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLTP_PORT) || 5433,
  database: process.env.POSTGRES_OLTP_DB || "oncologia_oltp",
  username: process.env.POSTGRES_OLTP_USER || "oncologia",
  password: process.env.POSTGRES_OLTP_PASSWORD || "oncologia_dev_2026",
  max: 5,
  idle_timeout: 120,
  connect_timeout: 30,
});

const SINADEF_PATH = resolve(ROOT, "data/sinadef/fallecidos_sinadef.csv");

function isCancerCode(code: string): boolean {
  if (!code || code === "SIN REGISTRO") return false;
  return /^C\d/.test(code.trim());
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  ETL FASE 1: SINADEF → Defunciones Ca.  ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // ── 0. Limpiar datos SINADEF anteriores (idempotente) ──
  console.log("🧹 Limpiando datos SINADEF previos...");
  await sql`
    DELETE FROM diagnostico WHERE paciente_id IN (
      SELECT id FROM paciente WHERE uuid_hash LIKE 'SINADEF-%'
    )
  `;
  await sql`DELETE FROM paciente WHERE uuid_hash LIKE 'SINADEF-%'`;
  await sql`DELETE FROM fuente_dato WHERE nombre = 'SINADEF'`;
  console.log("   Limpio\n");

  // ── Registrar fuente ──
  const [fuente] = await sql`
    INSERT INTO fuente_dato (nombre, archivo_origen, registros, nota)
    VALUES ('SINADEF', 'fallecidos_sinadef.csv', 0, 'Sistema Nacional de Defunciones - 2017-2024')
    RETURNING id
  `;
  const fuenteId = Number(fuente.id);
  console.log(`📋 Fuente SINADEF ID: ${fuenteId}\n`);

  // ── FASE 1: Filtrar defunciones oncológicas en memoria ──
  console.log("📖 Escaneando SINADEF (1.1M líneas)...");
  const t0 = Date.now();

  const buf = readFileSync(SINADEF_PATH);
  const text = new TextDecoder("utf-8").decode(buf);
  const lines = text.split("\n");

  type Death = {
    hash: string;
    sexo: string;
    ubigeo: string;
    departamento: string;
    provincia: string;
    cancerCode: string;
    fecha: string;
  };

  const deaths: Death[] = [];
  let nonCancer = 0;
  let skipped = 0;
  let recovered = 0;

  let pending = "";   // línea incompleta esperando continuación
  let recordIdx = 0;  // índice lógico de registro (para hash estable)

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw?.trim()) continue;

    // Intentar formar una fila completa
    let line = pending ? pending + "\n" + raw : raw;
    let cols = line.split("|");

    if (cols.length < 32) {
      // Aún incompleta — acumular y esperar la siguiente línea
      pending = line;
      continue;
    }

    // Fila completa
    pending = "";
    recordIdx++;

    // CIE-X: col 21,23,25,27,29,31
    let cancerCode = "";
    for (const idx of [21, 23, 25, 27, 29, 31]) {
      const code = cols[idx]?.trim();
      if (isCancerCode(code)) {
        cancerCode = code.substring(0, 4).trim();
        break;
      }
    }
    if (!cancerCode) { nonCancer++; continue; }

    // Limpiar sexo
    const sexoRaw = cols[2]?.trim() || "";
    const sexo = sexoRaw === "FEMENINO" ? "F" : sexoRaw === "MASCULINO" ? "M" : "X";

    // Limpiar geo
    const deptoRaw = (cols[10] || "").trim().toUpperCase();
    const provRaw  = (cols[11] || "").trim().toUpperCase();
    const departamento = (deptoRaw && deptoRaw !== "SIN REGISTRO") ? deptoRaw : "DESCONOCIDO";
    const provincia    = (provRaw  && provRaw  !== "SIN REGISTRO") ? provRaw  : "DESCONOCIDO";

    const ubigeo = (cols[8] || "").trim().substring(0, 6).padEnd(6, "0");

    const año = parseInt(cols[14], 10) || null;
    const mes = parseInt(cols[15], 10) || null;
    if (!año || !mes) { skipped++; continue; }

    if (pending === "" && cols.length > 32) recovered++;  // conteo informativo

    deaths.push({
      hash: `SINADEF-${String(recordIdx).padStart(8, "0")}`,
      sexo,
      ubigeo: ubigeo.substring(0, 6),
      departamento,
      provincia,
      cancerCode,
      fecha: `${año}-${String(mes).padStart(2, "0")}-01`,
    });
  }

  const t1 = Date.now();
  console.log(`   ${deaths.length.toLocaleString()} def. oncológicas en ${((t1 - t0) / 1000).toFixed(1)}s`);
  console.log(`   ${nonCancer.toLocaleString()} no oncológicas`);
  console.log(`   ${skipped.toLocaleString()} descartadas (sin año/mes)`);
  console.log(`   Registros partidos recuperados: incluidos en el total\n`);

  // ── FASE 2: Batch INSERT pacientes ──
  console.log("💾 Insertando pacientes...");
  const BATCH = 5000;

  for (let i = 0; i < deaths.length; i += BATCH) {
    const chunk = deaths.slice(i, i + BATCH);
    await sql`
      INSERT INTO paciente (uuid_hash, sexo, ubigeo, departamento, provincia)
      VALUES ${sql(
        chunk.map((d) => [d.hash, d.sexo, d.ubigeo, d.departamento, d.provincia])
      )}
      ON CONFLICT (uuid_hash) DO UPDATE SET
        departamento = EXCLUDED.departamento,
        provincia = EXCLUDED.provincia
    `;
    if (i % (BATCH * 10) === 0 && i > 0) {
      console.log(`   ${Math.round((i / deaths.length) * 100)}%`);
    }
  }
  console.log("   100% pacientes\n");

  // ── FASE 3: Resolver IDs ──
  console.log("🔑 Resolviendo IDs de pacientes...");
  const hashes = [...new Set(deaths.map((d) => d.hash))];
  const hashToId = new Map<string, number>();

  for (let i = 0; i < hashes.length; i += BATCH) {
    const chunk = hashes.slice(i, i + BATCH);
    const rows = await sql`
      SELECT id, uuid_hash FROM paciente
      WHERE uuid_hash = ANY(${chunk}::text[])
    `;
    for (const row of rows) {
      hashToId.set(row.uuid_hash, Number(row.id));
    }
  }
  console.log(`   ${hashToId.size.toLocaleString()} IDs resueltos\n`);

  // ── FASE 4: Asegurar que todos los CIE-10 existen ──
  console.log("🧬 Verificando catálogo CIE-10...");
  const uniqueCodes = [...new Set(deaths.map((d) => d.cancerCode))];
  for (const code of uniqueCodes) {
    await sql`
      INSERT INTO tipo_diagnostico (cod_cie10, nombre, grupo, es_oncologico)
      VALUES (${code}, ${`TUMOR MALIGNO (${code})`}, 'OTROS_ONCOLOGICOS', TRUE)
      ON CONFLICT (cod_cie10) DO NOTHING
    `;
  }
  console.log(`   ${uniqueCodes.length} códigos CIE-10 verificados\n`);

  // ── FASE 5: Batch INSERT diagnósticos ──
  console.log("📋 Insertando diagnósticos...");
  let diagOk = 0;

  for (let i = 0; i < deaths.length; i += BATCH) {
    const chunk = deaths.slice(i, i + BATCH);
    const rows: [number, string, string][] = [];

    for (const d of chunk) {
      const pid = hashToId.get(d.hash);
      if (!pid) continue;
      rows.push([pid, d.cancerCode, d.fecha]);
    }

    if (rows.length > 0) {
      await sql`
        INSERT INTO diagnostico (paciente_id, cod_cie10, fecha_diagnostico)
        VALUES ${sql(rows)}
      `;
      diagOk += rows.length;
    }

    if (i % (BATCH * 10) === 0 && i > 0) {
      console.log(`   ${Math.round((i / deaths.length) * 100)}%`);
    }
  }
  console.log(`   100% diagnósticos (${diagOk.toLocaleString()} insertados)\n`);

  // ── Actualizar fuente ──
  const finalFuenteId = fuenteId || (await sql`SELECT id FROM fuente_dato WHERE nombre='SINADEF' LIMIT 1`)[0]?.id;
  if (finalFuenteId) {
    await sql`UPDATE fuente_dato SET registros = ${deaths.length} WHERE id = ${finalFuenteId}`;
  }

  // ── Resumen ──
  const t2 = Date.now();
  console.log("╔══════════════════════════════════════════╗");
  console.log("║         RESUMEN SINADEF → OLTP           ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\n📊 Total escaneado:  ${(lines.length - 1).toLocaleString()} líneas`);
  console.log(`🎗️  Def. oncológicas: ${deaths.length.toLocaleString()}`);
  console.log(`   No oncológicas:   ${nonCancer.toLocaleString()}`);
  console.log(`\n👤 Pacientes únicos: ${hashToId.size.toLocaleString()}`);
  console.log(`📋 Diagnósticos:     ${diagOk.toLocaleString()}`);
  console.log(`⏱️  Tiempo total:     ${((t2 - t0) / 1000).toFixed(1)}s`);

  console.log("\n✅ SINADEF cargado exitosamente.");
}

main()
  .then(() => { sql.end(); process.exit(0); })
  .catch((err) => { console.error("❌", err); sql.end(); process.exit(1); });
