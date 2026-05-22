/**
 * load-oltp.ts — Pobla la base transaccional OLTP desde INEN CSV + INEI XLSX
 *
 * Fuentes:
 *   - docker/data/inen/inen_pacientes_2022_2025.csv
 *   - docker/data/inei/inei_poblacion_departamentos.xlsx
 *
 * Tablas pobladas:
 *   - paciente, establecimiento, atencion, fuente_dato
 *
 * Ejecutar: bun run docker/etl-service/scripts/load-oltp.ts
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
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
  max: 10,
});

// ── Rutas ──
const CSV_PATH = resolve(ROOT, "data/inen/inen_pacientes_2022_2025.csv");
const INEI_PATH = resolve(ROOT, "data/inei/inei_poblacion_departamentos.xlsx");

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

// ── Estadísticas ──
const stats = {
  pacientes: { inserted: 0, skipped: 0, failed: 0 },
  establecimientos: { inserted: 0, skipped: 0 },
  atenciones: { inserted: 0 },
  totalRows: 0,
  discardedNoFecha: 0,
  discardedBadDate: 0,
  deptosVistos: new Set<string>(),
};

// Cachés en memoria
const pacienteCache = new Map<string, number>(); // uuid_hash → id
const establecimientoCache = new Map<string, number>(); // "departamento|provincia|distrito" → id
const deptosConEstablecimiento = new Set<string>();

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   ETL FASE 1: OLTP — INEN → PostgreSQL  ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // ── 1. Registrar fuente ──
  console.log("📋 Registrando fuente INEN...");
  const [fuente] = await sql`
    INSERT INTO fuente_dato (nombre, archivo_origen, registros, nota)
    VALUES (
      'INEN',
      'inen_pacientes_2022_2025.csv',
      0,
      'Listado de Pacientes Nuevos INEN - Enero 2022 a Noviembre 2025'
    )
    RETURNING id
  `;
  const fuenteId = Number(fuente.id);
  console.log(`   Fuente ID: ${fuenteId}`);

  // ── 2. Leer CSV ──
  console.log("📖 Leyendo CSV INEN...");
  const csvBuffer = readFileSync(CSV_PATH);
  const csvText = new TextDecoder("latin1").decode(csvBuffer);

  const parsed = Papa.parse<InenRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^"|"$/g, ""),
  });

  stats.totalRows = parsed.data.length;
  console.log(`   ${parsed.data.length.toLocaleString()} filas leídas`);

  // ── 3. Insertar en lotes ──
  console.log("💾 Insertando pacientes y atenciones...");

  let batch = 0;
  const BATCH_SIZE = 1000;

  for (let i = 0; i < parsed.data.length; i += BATCH_SIZE) {
    const chunk = parsed.data.slice(i, i + BATCH_SIZE);

    for (const row of chunk) {
      // Fecha
      const fec = String(row.FEC_FILIACION ?? "").trim().replace(/"/g, "");
      if (fec.length < 6) {
        stats.discardedNoFecha++;
        continue;
      }
      const año = parseInt(fec.substring(0, 4), 10);
      const mes = parseInt(fec.substring(4, 6), 10);
      if (año < 2022 || año > 2025 || mes < 1 || mes > 12) {
        stats.discardedBadDate++;
        continue;
      }

      // UUID completo (32 chars) — no truncar, los prefijos se repiten
      const uuid = String(row.UUID ?? "").trim().replace(/"/g, "");

      // Sexo
      const sexo = String(row.SEXO ?? "")
        .trim()
        .replace(/"/g, "")
        .toUpperCase();
      const validSexo = sexo === "FEMENINO" ? "F" : sexo === "MASCULINO" ? "M" : "X";

      // Edad
      const edad = parseInt(String(row.EDAD ?? "").trim().replace(/"/g, ""), 10);
      const grupoEtario = Number.isNaN(edad) ? "DESCONOCIDO" : ageGroup(edad);

      // Geografía
      const lugarRaw = String(row.LUGAR_RESIDENCIA ?? "").trim().replace(/"/g, "");
      const ubigeo = String(row.UBIGEO_LUGAR_RESIDENCIA ?? "").trim();
      const partes = lugarRaw.split("-");
      const departamento = (partes[0] || "DESCONOCIDO").trim().toUpperCase();
      const provincia = (partes[1] || "DESCONOCIDO").trim().toUpperCase();
      const distrito = (partes[2] || "").trim().toUpperCase();

      // CEX
      const cex = parseInt(
        String(row.CANT_ATENCIONES_CEX ?? "").trim().replace(/"/g, ""),
        10,
      );

      try {
        // ── Paciente (upsert por uuid_hash) ──
        let pacienteId = pacienteCache.get(uuid);
        if (!pacienteId) {
          const existing = await sql`
            SELECT id FROM paciente WHERE uuid_hash = ${uuid} LIMIT 1
          `;

          if (existing.length > 0) {
            pacienteId = Number(existing[0].id);
            stats.pacientes.skipped++;
          } else {
            const [newP] = await sql`
              INSERT INTO paciente (uuid_hash, sexo, ubigeo)
              VALUES (${uuid}, ${validSexo}, ${ubigeo || null})
              RETURNING id
            `;
            pacienteId = Number(newP.id);
            stats.pacientes.inserted++;
          }
          pacienteCache.set(uuid, pacienteId);
        }

        // ── Establecimiento (virtual: "departamento-provincia") ──
        const estKey = `${departamento}|${provincia}`;
        let estId = establecimientoCache.get(estKey);
        if (!estId) {
          const existing = await sql`
            SELECT id FROM establecimiento
            WHERE departamento = ${departamento} AND provincia = ${provincia}
            LIMIT 1
          `;

          if (existing.length > 0) {
            estId = Number(existing[0].id);
            stats.establecimientos.skipped++;
          } else {
            const [newE] = await sql`
              INSERT INTO establecimiento (nombre, nivel, departamento, provincia, distrito)
              VALUES (
                ${`INEN-${departamento}-${provincia}`},
                'III-2',
                ${departamento},
                ${provincia},
                ${distrito || null}
              )
              RETURNING id
            `;
            estId = Number(newE.id);
            stats.establecimientos.inserted++;
            deptosConEstablecimiento.add(departamento);
          }
          establecimientoCache.set(estKey, estId);
        }

        // ── Atención ──
        await sql`
          INSERT INTO atencion (paciente_id, establecimiento_id, fecha_atencion, tipo_atencion, es_nuevo_caso)
          VALUES (
            ${pacienteId},
            ${estId},
            ${`${año}-${String(mes).padStart(2, "0")}-01`},
            'CONSULTA_EXTERNA',
            TRUE
          )
        `;
        stats.atenciones.inserted++;

        stats.deptosVistos.add(departamento);
      } catch (err) {
        stats.pacientes.failed++;
        if (stats.pacientes.failed <= 5) {
          console.error(`   ⚠️ Error fila ${i}:`, (err as Error).message?.substring(0, 120));
        }
      }
    }

    batch++;
    if (batch % 10 === 0) {
      const pct = Math.round((i / parsed.data.length) * 100);
      console.log(`   ${pct}% (${i.toLocaleString()}/${parsed.data.length.toLocaleString()})`);
    }
  }

  // ── 4. Actualizar conteo en fuente_dato ──
  await sql`
    UPDATE fuente_dato
    SET registros = ${stats.atenciones.inserted}
    WHERE id = ${fuenteId}
  `;

  // ── 5. Resumen ──
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║            RESUMEN ETL OLTP              ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\n📊 Filas CSV:       ${stats.totalRows.toLocaleString()}`);
  console.log(`   Descartadas (sin fecha): ${stats.discardedNoFecha}`);
  console.log(`   Descartadas (fecha mala): ${stats.discardedBadDate}`);
  console.log(`\n👤 Pacientes:`);
  console.log(`   Insertados: ${stats.pacientes.inserted.toLocaleString()}`);
  console.log(`   Ya existían: ${stats.pacientes.skipped.toLocaleString()}`);
  console.log(`   Errores: ${stats.pacientes.failed}`);
  console.log(`\n🏥 Establecimientos:`);
  console.log(`   Insertados: ${stats.establecimientos.inserted}`);
  console.log(`   Ya existían: ${stats.establecimientos.skipped}`);
  console.log(`\n📋 Atenciones:`);
  console.log(`   Insertadas: ${stats.atenciones.inserted.toLocaleString()}`);
  console.log(`\n🗺️  Departamentos: ${stats.deptosVistos.size}`);

  // Top departamentos
  const topDeptos = await sql`
    SELECT departamento, COUNT(*)::int as casos
    FROM establecimiento e
    JOIN atencion a ON a.establecimiento_id = e.id
    GROUP BY departamento
    ORDER BY casos DESC
    LIMIT 10
  `;

  console.log("\n📈 Top 10 departamentos:");
  for (const d of topDeptos) {
    console.log(`   ${d.departamento}: ${d.casos.toLocaleString()} atenciones`);
  }

  console.log("\n✅ ETL OLTP completado.");
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
