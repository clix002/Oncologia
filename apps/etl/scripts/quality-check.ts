/**
 * quality-check.ts — Data Quality validation para OLTP
 *
 * Verifica: completitud, unicidad, consistencia, precisión.
 * Registra resultados en data_quality_log.
 */
import postgres from "postgres";

const sql = postgres({
  host: process.env.POSTGRES_OLTP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLTP_PORT) || 5433,
  database: process.env.POSTGRES_OLTP_DB || "oncologia_oltp",
  username: process.env.POSTGRES_OLTP_USER || "oncologia",
  password: process.env.POSTGRES_OLTP_PASSWORD || "oncologia_dev_2026",
});

interface QCheck {
  tabla: string;
  columna: string;
  regla: string;
  query: string;
}

const CHECKS: QCheck[] = [
  // ── Completitud ──
  {
    tabla: "paciente",
    columna: "uuid_hash",
    regla: "NOT NULL",
    query: `SELECT COUNT(*) as ok FROM paciente WHERE uuid_hash IS NOT NULL`,
  },
  {
    tabla: "paciente",
    columna: "sexo",
    regla: "IN ('M','F','X')",
    query: `SELECT COUNT(*) as ok FROM paciente WHERE sexo IN ('M','F','X')`,
  },
  {
    tabla: "atencion",
    columna: "fecha_atencion",
    regla: "NOT NULL",
    query: `SELECT COUNT(*) as ok FROM atencion WHERE fecha_atencion IS NOT NULL`,
  },
  {
    tabla: "atencion",
    columna: "tipo_atencion",
    regla: "IN (tipos válidos)",
    query: `SELECT COUNT(*) as ok FROM atencion WHERE tipo_atencion IN ('CONSULTA_EXTERNA','EMERGENCIA','HOSPITALIZACION','TELEMEDICINA')`,
  },
  {
    tabla: "diagnostico",
    columna: "cod_cie10",
    regla: "NOT NULL",
    query: `SELECT COUNT(*) as ok FROM diagnostico WHERE cod_cie10 IS NOT NULL`,
  },
  // ── Unicidad ──
  {
    tabla: "paciente",
    columna: "uuid_hash",
    regla: "UNIQUE",
    query: `SELECT COUNT(DISTINCT uuid_hash) as ok FROM paciente`,
  },
  {
    tabla: "tipo_diagnostico",
    columna: "cod_cie10",
    regla: "UNIQUE",
    query: `SELECT COUNT(DISTINCT cod_cie10) as ok FROM tipo_diagnostico`,
  },
  // ── Consistencia ──
  {
    tabla: "atencion",
    columna: "paciente_id",
    regla: "FK → paciente",
    query: `SELECT COUNT(*) as ok FROM atencion a WHERE EXISTS (SELECT 1 FROM paciente p WHERE p.id = a.paciente_id)`,
  },
  {
    tabla: "atencion",
    columna: "establecimiento_id",
    regla: "FK → establecimiento",
    query: `SELECT COUNT(*) as ok FROM atencion a WHERE EXISTS (SELECT 1 FROM establecimiento e WHERE e.id = a.establecimiento_id)`,
  },
  {
    tabla: "diagnostico",
    columna: "cod_cie10",
    regla: "FK → tipo_diagnostico",
    query: `SELECT COUNT(*) as ok FROM diagnostico d WHERE EXISTS (SELECT 1 FROM tipo_diagnostico t WHERE t.cod_cie10 = d.cod_cie10)`,
  },
  // ── Precisión ──
  {
    tabla: "atencion",
    columna: "fecha_atencion",
    regla: "año >= 2020",
    query: `SELECT COUNT(*) as ok FROM atencion WHERE EXTRACT(YEAR FROM fecha_atencion) >= 2020`,
  },
  {
    tabla: "diagnostico",
    columna: "fecha_diagnostico",
    regla: "año >= 2017",
    query: `SELECT COUNT(*) as ok FROM diagnostico WHERE EXTRACT(YEAR FROM fecha_diagnostico) >= 2017`,
  },
];

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║        DATA QUALITY CHECK — OLTP         ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Totales por tabla
  const totales: Record<string, number> = {};
  for (const tabla of ["paciente", "atencion", "diagnostico", "tipo_diagnostico", "establecimiento", "fuente_dato"]) {
    const [row] = await sql.unsafe(`SELECT COUNT(*)::int as c FROM ${tabla}`);
    totales[tabla] = Number(row.c);
  }

  console.log("📊 Registros por tabla:");
  for (const [t, c] of Object.entries(totales)) {
    console.log(`   ${t}: ${c.toLocaleString()}`);
  }
  console.log("");

  // Ejecutar checks
  const resultados: {
    tabla: string;
    columna: string;
    regla: string;
    ok: number;
    fail: number;
    pct: number;
  }[] = [];

  console.log("🔍 Ejecutando checks de calidad...\n");

  for (const check of CHECKS) {
    const [row] = await sql.unsafe(check.query);
    const ok = Number(row.ok);
    const total = totales[check.tabla] || ok;
    const fail = Math.max(0, total - ok);
    const pct = total > 0 ? Math.round((ok / total) * 10000) / 100 : 100;

    const icon = pct >= 99.9 ? "✅" : pct >= 95 ? "⚠️" : "❌";

    console.log(
      `   ${icon} ${check.tabla}.${check.columna} | ${check.regla} | ${ok.toLocaleString()}/${total.toLocaleString()} (${pct}%)`,
    );

    resultados.push({ ...check, ok, fail, pct });

    // Guardar en log
    await sql`
      INSERT INTO data_quality_log (tabla, columna, regla, registros_ok, registros_fail, porcentaje_ok)
      VALUES (${check.tabla}, ${check.columna}, ${check.regla}, ${ok}, ${fail}, ${pct})
    `;
  }

  // ── Resumen ──
  const avgPct =
    Math.round(
      (resultados.reduce((s, r) => s + r.pct, 0) / resultados.length) * 100,
    ) / 100;

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║           RESUMEN CALIDAD                ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\n   Checks ejecutados: ${resultados.length}`);
  console.log(`   Calidad promedio:  ${avgPct}%`);

  const passing = resultados.filter((r) => r.pct >= 99.9).length;
  const warning = resultados.filter((r) => r.pct >= 95 && r.pct < 99.9).length;
  const failing = resultados.filter((r) => r.pct < 95).length;

  console.log(`   ✅ Pass: ${passing}`);
  console.log(`   ⚠️  Warn: ${warning}`);
  console.log(`   ❌ Fail: ${failing}`);

  console.log("\n✅ Data quality check completado.");
}

main()
  .then(() => {
    sql.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    sql.end();
    process.exit(1);
  });
