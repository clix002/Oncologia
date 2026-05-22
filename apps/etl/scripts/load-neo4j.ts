/**
 * load-neo4j.ts — Puebla Neo4j con Grafo de Conocimiento Oncológico
 *
 * Nodos: Departamento, Provincia, Paciente, TipoCancer, FactorRiesgo
 * Relaciones: RESIDE_EN, PERTENECE_A, DIAGNOSTICADO_CON, TIENE_INCIDENCIA, PRESENTA_FACTOR
 *
 * Fuentes:
 *  - INEN (66k): uuid_hash real, sexo, departamento — sin CIE-10
 *  - SINADEF (140k): uuid_hash real, sexo, departamento, CIE-10 real
 */
import neo4j from "neo4j-driver";
import postgres from "postgres";

const driver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://localhost:7688",
  neo4j.auth.basic(
    process.env.NEO4J_USER || "neo4j",
    process.env.NEO4J_PASSWORD || "oncologia_graph_2026"
  )
);

const oltp = postgres({
  host: process.env.POSTGRES_OLTP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLTP_PORT) || 5433,
  database: process.env.POSTGRES_OLTP_DB || "oncologia_oltp",
  username: process.env.POSTGRES_OLTP_USER || "oncologia",
  password: process.env.POSTGRES_OLTP_PASSWORD || "oncologia_dev_2026",
  max: 5,
  idle_timeout: 120,
});

const olap = postgres({
  host: process.env.POSTGRES_OLAP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLAP_PORT) || 5434,
  database: process.env.POSTGRES_OLAP_DB || "oncologia_olap",
  username: process.env.POSTGRES_OLAP_USER || "oncologia",
  password: process.env.POSTGRES_OLAP_PASSWORD || "oncologia_dev_2026",
  max: 5,
  idle_timeout: 120,
});

const DEPTO_ZONAS: Record<string, string> = {
  "AMAZONAS": "SELVA", "ANCASH": "SIERRA", "APURIMAC": "SIERRA",
  "AREQUIPA": "SIERRA", "AYACUCHO": "SIERRA", "CAJAMARCA": "SIERRA",
  "CALLAO": "COSTA", "CUSCO": "SIERRA", "HUANCAVELICA": "SIERRA",
  "HUANUCO": "SIERRA", "ICA": "COSTA", "JUNIN": "SIERRA",
  "LA LIBERTAD": "COSTA", "LAMBAYEQUE": "COSTA", "LIMA": "COSTA",
  "LORETO": "SELVA", "MADRE DE DIOS": "SELVA", "MOQUEGUA": "COSTA",
  "PASCO": "SIERRA", "PIURA": "COSTA", "PUNO": "SIERRA",
  "SAN MARTIN": "SELVA", "TACNA": "COSTA", "TUMBES": "COSTA",
  "UCAYALI": "SELVA",
};

const FACTORES_RIESGO: Record<string, string[]> = {
  "COSTA": ["tabaquismo", "obesidad", "sedentarismo", "alcohol"],
  "SIERRA": ["tabaquismo", "desnutricion", "falta_tamizaje", "altitud"],
  "SELVA": ["tabaquismo", "falta_acceso_salud", "desnutricion", "infecciones_endemicas"],
};

const BATCH = 1000;

async function runBatch(session: ReturnType<typeof driver.session>, query: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += BATCH) {
    await session.run(query, { batch: rows.slice(i, i + BATCH) });
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  FASE 5: Neo4j — Grafo de Conocimiento   ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const session = driver.session({ database: "neo4j" });

  // ── Limpiar ──
  console.log("🧹 Limpiando grafo existente...");
  await session.run("MATCH (n) DETACH DELETE n");
  console.log("   Grafo limpio\n");

  // ── Constraints e índices ──
  await session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (d:Departamento) REQUIRE d.nombre IS UNIQUE").catch(() => {});
  await session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Paciente) REQUIRE p.hash IS UNIQUE").catch(() => {});
  await session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (t:TipoCancer) REQUIRE t.cod_cie10 IS UNIQUE").catch(() => {});
  await session.run("CREATE INDEX IF NOT EXISTS FOR (p:Paciente) ON (p.departamento)").catch(() => {});

  // ── 1. Nodos: Departamento ──
  console.log("🗺️  Creando nodos Departamento...");
  await runBatch(session,
    `UNWIND $batch AS row
     MERGE (d:Departamento {nombre: row.nombre})
     SET d.zona = row.zona`,
    Object.entries(DEPTO_ZONAS).map(([nombre, zona]) => ({ nombre, zona }))
  );
  console.log(`   ${Object.keys(DEPTO_ZONAS).length} departamentos\n`);

  // ── 2. Nodos: Provincia — desde paciente.departamento/provincia ──
  console.log("🏙️  Creando nodos Provincia...");
  const provincias = await oltp`
    SELECT DISTINCT
      UPPER(departamento) AS departamento,
      UPPER(provincia)    AS provincia
    FROM paciente
    WHERE departamento IS NOT NULL
      AND provincia IS NOT NULL
      AND departamento != ''
      AND provincia != ''
      AND departamento != 'DESCONOCIDO'
      AND provincia != 'DESCONOCIDO'
    ORDER BY departamento, provincia
  `;

  await runBatch(session,
    `UNWIND $batch AS row
     MERGE (prov:Provincia {nombre: row.provincia, departamento: row.departamento})
     WITH prov, row
     MATCH (d:Departamento {nombre: row.departamento})
     MERGE (prov)-[:PERTENECE_A]->(d)`,
    provincias.map(p => ({ departamento: String(p.departamento), provincia: String(p.provincia) }))
  );
  console.log(`   ${provincias.length} provincias\n`);

  // ── 3. Nodos: TipoCancer — desde dim_diagnostico OLAP ──
  console.log("🧬 Creando nodos TipoCancer...");
  const canceres = await olap`
    SELECT cod_cie10, nombre, grupo FROM dim_diagnostico ORDER BY cod_cie10
  `;

  await runBatch(session,
    `UNWIND $batch AS row
     MERGE (t:TipoCancer {cod_cie10: row.cod})
     SET t.nombre = row.nombre, t.grupo = row.grupo`,
    canceres.map(c => ({ cod: String(c.cod_cie10), nombre: String(c.nombre || c.cod_cie10), grupo: String(c.grupo || "OTROS") }))
  );
  console.log(`   ${canceres.length} tipos de cáncer\n`);

  // ── 4. FactorRiesgo ──
  console.log("⚠️  Creando nodos FactorRiesgo...");
  const factorRows: { nombre: string; zona: string }[] = [];
  for (const [zona, factores] of Object.entries(FACTORES_RIESGO)) {
    for (const f of factores) factorRows.push({ nombre: f, zona });
  }

  await runBatch(session,
    `UNWIND $batch AS row
     MERGE (f:FactorRiesgo {nombre: row.nombre})
     WITH f, row
     MATCH (d:Departamento {zona: row.zona})
     MERGE (d)-[:PRESENTA_FACTOR]->(f)`,
    factorRows
  );
  console.log(`   ${factorRows.length} factores de riesgo enlazados\n`);

  // ── 5. Pacientes SINADEF — todos, con CIE-10 real ──
  console.log("👤 Cargando pacientes SINADEF con diagnóstico...");
  let offset = 0;
  let sinCount = 0;

  while (true) {
    const rows = await oltp`
      SELECT p.uuid_hash, p.sexo,
             UPPER(COALESCE(p.departamento, 'DESCONOCIDO')) AS departamento,
             UPPER(COALESCE(p.provincia, 'DESCONOCIDO'))    AS provincia,
             d.cod_cie10,
             TO_CHAR(d.fecha_diagnostico, 'YYYY-MM-DD')     AS fecha_dx
      FROM paciente p
      JOIN diagnostico d ON d.paciente_id = p.id
      WHERE p.uuid_hash LIKE 'SINADEF-%'
      ORDER BY p.id
      LIMIT ${BATCH} OFFSET ${offset}
    `;
    if (rows.length === 0) break;

    // Crear nodos Paciente
    await session.run(
      `UNWIND $batch AS row
       MERGE (pac:Paciente {hash: row.hash})
       SET pac.sexo = row.sexo, pac.fuente = 'SINADEF',
           pac.departamento = row.departamento`,
      { batch: rows.map(r => ({ hash: String(r.uuid_hash), sexo: String(r.sexo), departamento: String(r.departamento) })) }
    );

    // Relación RESIDE_EN
    const conDepto = rows.filter(r => DEPTO_ZONAS[String(r.departamento)]);
    if (conDepto.length > 0) {
      await session.run(
        `UNWIND $batch AS row
         MATCH (pac:Paciente {hash: row.hash})
         MATCH (d:Departamento {nombre: row.departamento})
         MERGE (pac)-[:RESIDE_EN]->(d)`,
        { batch: conDepto.map(r => ({ hash: String(r.uuid_hash), departamento: String(r.departamento) })) }
      );
    }

    // Relación DIAGNOSTICADO_CON
    const conCie = rows.filter(r => r.cod_cie10);
    if (conCie.length > 0) {
      await session.run(
        `UNWIND $batch AS row
         MATCH (pac:Paciente {hash: row.hash})
         MATCH (t:TipoCancer {cod_cie10: row.cod})
         MERGE (pac)-[:DIAGNOSTICADO_CON {fecha: row.fecha}]->(t)`,
        { batch: conCie.map(r => ({ hash: String(r.uuid_hash), cod: String(r.cod_cie10), fecha: String(r.fecha_dx || "2023-01-01") })) }
      );
    }

    sinCount += rows.length;
    offset += BATCH;
    process.stdout.write(`\r   SINADEF: ${sinCount.toLocaleString()} pacientes...`);
  }
  console.log(`\n   ${sinCount.toLocaleString()} pacientes SINADEF cargados\n`);

  // ── 6. Pacientes INEN — todos, sin CIE-10 ──
  console.log("👤 Cargando pacientes INEN...");
  offset = 0;
  let inenCount = 0;

  while (true) {
    const rows = await oltp`
      SELECT uuid_hash, sexo,
             UPPER(COALESCE(departamento, 'DESCONOCIDO')) AS departamento
      FROM paciente
      WHERE uuid_hash NOT LIKE 'SINADEF-%'
      ORDER BY id
      LIMIT ${BATCH} OFFSET ${offset}
    `;
    if (rows.length === 0) break;

    await session.run(
      `UNWIND $batch AS row
       MERGE (pac:Paciente {hash: row.hash})
       SET pac.sexo = row.sexo, pac.fuente = 'INEN',
           pac.departamento = row.departamento`,
      { batch: rows.map(r => ({ hash: String(r.uuid_hash), sexo: String(r.sexo), departamento: String(r.departamento) })) }
    );

    const conDepto = rows.filter(r => DEPTO_ZONAS[String(r.departamento)]);
    if (conDepto.length > 0) {
      await session.run(
        `UNWIND $batch AS row
         MATCH (pac:Paciente {hash: row.hash})
         MATCH (d:Departamento {nombre: row.departamento})
         MERGE (pac)-[:RESIDE_EN]->(d)`,
        { batch: conDepto.map(r => ({ hash: String(r.uuid_hash), departamento: String(r.departamento) })) }
      );
    }

    inenCount += rows.length;
    offset += BATCH;
    process.stdout.write(`\r   INEN: ${inenCount.toLocaleString()} pacientes...`);
  }
  console.log(`\n   ${inenCount.toLocaleString()} pacientes INEN cargados\n`);

  // ── 7. TIENE_INCIDENCIA — desde OLAP: casos por depto y tipo de cáncer ──
  console.log("📊 Creando relaciones TIENE_INCIDENCIA...");
  const incidencias = await olap`
    SELECT g.departamento, dg.cod_cie10, COUNT(*)::int AS casos
    FROM fact_oncologia f
    JOIN dim_geografia g ON f.geografia_id = g.id
    JOIN dim_diagnostico dg ON f.diagnostico_id = dg.id
    WHERE g.departamento != 'DESCONOCIDO'
      AND f.diagnostico_id IS NOT NULL
    GROUP BY g.departamento, dg.cod_cie10
    ORDER BY casos DESC
    LIMIT 500
  `;

  await runBatch(session,
    `UNWIND $batch AS row
     MATCH (d:Departamento {nombre: row.depto})
     MATCH (t:TipoCancer {cod_cie10: row.cod})
     MERGE (d)-[r:TIENE_INCIDENCIA {cod_cie10: row.cod}]->(t)
     SET r.casos = row.casos`,
    incidencias
      .filter(r => DEPTO_ZONAS[String(r.departamento)])
      .map(r => ({ depto: String(r.departamento), cod: String(r.cod_cie10), casos: Number(r.casos) }))
  );
  console.log(`   ${incidencias.length} relaciones TIENE_INCIDENCIA\n`);

  // ── Resumen ──
  console.log("╔══════════════════════════════════════════╗");
  console.log("║         RESUMEN Neo4j                    ║");
  console.log("╚══════════════════════════════════════════╝");

  const queries: Record<string, string> = {
    "Departamento":        "MATCH (n:Departamento) RETURN COUNT(n) as c",
    "Provincia":           "MATCH (n:Provincia) RETURN COUNT(n) as c",
    "Paciente":            "MATCH (n:Paciente) RETURN COUNT(n) as c",
    "TipoCancer":          "MATCH (n:TipoCancer) RETURN COUNT(n) as c",
    "FactorRiesgo":        "MATCH (n:FactorRiesgo) RETURN COUNT(n) as c",
    "RESIDE_EN":           "MATCH ()-[r:RESIDE_EN]->() RETURN COUNT(r) as c",
    "DIAGNOSTICADO_CON":   "MATCH ()-[r:DIAGNOSTICADO_CON]->() RETURN COUNT(r) as c",
    "TIENE_INCIDENCIA":    "MATCH ()-[r:TIENE_INCIDENCIA]->() RETURN COUNT(r) as c",
    "PRESENTA_FACTOR":     "MATCH ()-[r:PRESENTA_FACTOR]->() RETURN COUNT(r) as c",
    "PERTENECE_A":         "MATCH ()-[r:PERTENECE_A]->() RETURN COUNT(r) as c",
  };

  for (const [label, q] of Object.entries(queries)) {
    const result = await session.run(q);
    const c = result.records[0]?.get("c");
    const val = typeof c?.toNumber === "function" ? c.toNumber() : Number(c);
    console.log(`   ${label}: ${val.toLocaleString()}`);
  }

  await session.close();
  console.log("\n✅ Neo4j poblado correctamente.");
}

main()
  .then(() => { driver.close(); oltp.end(); olap.end(); process.exit(0); })
  .catch((err) => { console.error("❌", err); driver.close(); oltp.end(); olap.end(); process.exit(1); });
