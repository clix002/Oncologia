/**
 * load-sinadef.ts — Carga defunciones oncológicas de SINADEF al OLTP
 *
 * Filtra registros donde al menos una causa (A-F) es C00-C97 (cáncer).
 * Inserta en: paciente, diagnostico, y fuente_dato.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const sql = postgres({
  host: process.env.POSTGRES_OLTP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLTP_PORT) || 5433,
  database: process.env.POSTGRES_OLTP_DB || "oncologia_oltp",
  username: process.env.POSTGRES_OLTP_USER || "oncologia",
  password: process.env.POSTGRES_OLTP_PASSWORD || "oncologia_dev_2026",
  max: 10,
});

const SINADEF_PATH = resolve(ROOT, "data/sinadef/fallecidos_sinadef.csv");

// ── Estadísticas ──
const stats = {
  totalLines: 0,
  cancerDeaths: 0,
  nonCancer: 0,
  insertedPacientes: 0,
  insertedDiagnosticos: 0,
  skippedPacientes: 0,
  errors: 0,
  deptosVistos: new Set<string>(),
};

function isCancerCode(code: string): boolean {
  if (!code || code === "SIN REGISTRO") return false;
  return /^C\d/.test(code.trim());
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  ETL FASE 1: SINADEF → Defunciones Ca.  ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // ── Registrar fuente ──
  const [fuente] = await sql`
    INSERT INTO fuente_dato (nombre, archivo_origen, registros, nota)
    VALUES ('SINADEF', 'fallecidos_sinadef.csv', 0, 'Sistema Nacional de Defunciones - 2017-2024')
    RETURNING id
  `;
  const fuenteId = Number(fuente.id);
  console.log(`📋 Fuente SINADEF ID: ${fuenteId}`);

  // ── Crear establecimiento genérico SINADEF ──
  const [estSina] = await sql`
    INSERT INTO establecimiento (nombre, nivel, departamento, provincia, distrito)
    VALUES ('SINADEF-NACIONAL', 'III-2', 'LIMA', 'LIMA', 'LIMA')
    ON CONFLICT DO NOTHING
    RETURNING id
  `;
  const estId = Number(estSina?.id);

  if (!estId) {
    const [existing] = await sql`
      SELECT id FROM establecimiento WHERE nombre = 'SINADEF-NACIONAL' LIMIT 1
    `;
    // Si no existe con ese nombre exacto, tomar el primer establecimiento
    if (!existing) {
      console.log("⚠️ Usando primer establecimiento existente");
    }
  }

  // ── Leer SINADEF línea por línea (366 MB, no cargar en RAM) ──
  console.log("📖 Procesando SINADEF (1.1M líneas, pipe-delimited)...");

  const fileStream = readFileSync(SINADEF_PATH);
  const text = new TextDecoder("utf-8").decode(fileStream);
  const lines = text.split("\n");
  stats.totalLines = lines.length - 1; // -header

  // Cachés
  const pacienteCache = new Map<string, number>();

  let batch = 0;
  const batchSize = 2000;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split("|");
    if (cols.length < 21) continue;

    // Buscar causas con código C (cáncer)
    // Columnas CIE-X = 21, 23, 25, 27, 29, 31 (0-indexed)
    const cieCols = [21, 23, 25, 27, 29, 31].map((c) => cols[c]?.trim());
    let hasCancer = false;
    let cancerCode = "";

    for (const code of cieCols) {
      if (isCancerCode(code)) {
        hasCancer = true;
        cancerCode = code.substring(0, 3);
        break;
      }
    }

    if (!hasCancer) {
      stats.nonCancer++;
      continue;
    }

    stats.cancerDeaths++;

    // Campos
    const sexoRaw = cols[2]?.trim() || "DESCONOCIDO";
    const sexo = sexoRaw === "FEMENINO" ? "F" : sexoRaw === "MASCULINO" ? "M" : "X";
    const edad = parseInt(cols[3], 10) || null;
    const depto = (cols[10] || "DESCONOCIDO").trim().toUpperCase();
    const provincia = (cols[11] || "DESCONOCIDO").trim().toUpperCase();
    const distrito = (cols[12] || "").trim().toUpperCase();
    const ubigeo = (cols[8] || "").trim().substring(0, 6);
    const año = parseInt(cols[14], 10) || null;
    const mes = parseInt(cols[15], 10) || null;
    const fecha = año && mes ? `${año}-${String(mes).padStart(2, "0")}-01` : null;

    // Generar hash para paciente
    const hash = `SINADEF-${String(i).padStart(8, "0")}`;

    try {
      // ── Paciente ──
      let pacienteId = pacienteCache.get(hash);
      if (!pacienteId) {
        const existing = await sql`
          SELECT id FROM paciente WHERE uuid_hash = ${hash} LIMIT 1
        `;
        if (existing.length > 0) {
          pacienteId = Number(existing[0].id);
          stats.skippedPacientes++;
        } else {
          const [newP] = await sql`
            INSERT INTO paciente (uuid_hash, sexo, ubigeo)
            VALUES (${hash}, ${sexo}, ${ubigeo || null})
            RETURNING id
          `;
          pacienteId = Number(newP.id);
          stats.insertedPacientes++;
        }
        pacienteCache.set(hash, pacienteId);
      }

      // ── Diagnóstico (usando CIE-10 ya cargado en tipo_diagnostico) ──
      if (fecha) {
        await sql`
          INSERT INTO diagnostico (atencion_id, paciente_id, cod_cie10, fecha_diagnostico)
          VALUES (NULL, ${pacienteId}, ${cancerCode}, ${fecha}::date)
        `;
        stats.insertedDiagnosticos++;
      }

      stats.deptosVistos.add(depto);
    } catch (err) {
      stats.errors++;
      if (stats.errors <= 5) {
        console.error(`   ⚠️ Error línea ${i}:`, (err as Error).message?.substring(0, 100));
      }
    }

    if (stats.cancerDeaths % 10000 === 0) {
      console.log(
        `   ${stats.cancerDeaths.toLocaleString()} defunciones oncológicas procesadas...`,
      );
    }
  }

  // ── Actualizar fuente ──
  await sql`
    UPDATE fuente_dato
    SET registros = ${stats.cancerDeaths}
    WHERE id = ${fuenteId}
  `;

  // ── Resumen ──
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║         RESUMEN SINADEF → OLTP           ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\n📊 Total líneas:     ${stats.totalLines.toLocaleString()}`);
  console.log(`🎗️  Def. oncológicas: ${stats.cancerDeaths.toLocaleString()}`);
  console.log(`   No oncológicas:   ${stats.nonCancer.toLocaleString()}`);
  console.log(`\n👤 Pacientes SINADEF:`);
  console.log(`   Insertados: ${stats.insertedPacientes.toLocaleString()}`);
  console.log(`   Ya existían: ${stats.skippedPacientes.toLocaleString()}`);
  console.log(`\n📋 Diagnósticos insertados: ${stats.insertedDiagnosticos.toLocaleString()}`);
  console.log(`❌ Errores: ${stats.errors}`);
  console.log(`🗺️  Departamentos: ${stats.deptosVistos.size}`);

  console.log("\n✅ SINADEF cargado exitosamente.");
}

main()
  .then(() => {
    sql.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error fatal:", err);
    sql.end();
    process.exit(1);
  });
