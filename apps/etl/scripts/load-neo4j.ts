/**
 * load-neo4j.ts — Puebla Neo4j con Grafo de Conocimiento Oncológico
 *
 * Nodos: Departamento, Provincia, Paciente, TipoCancer
 * Relaciones: RESIDE_EN, DIAGNOSTICADO_CON, TIENE_INCIDENCIA, ATENDIDO_EN
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

const sql = postgres({
  host: process.env.POSTGRES_OLTP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLTP_PORT) || 5433,
  database: process.env.POSTGRES_OLTP_DB || "oncologia_oltp",
  username: process.env.POSTGRES_OLTP_USER || "oncologia",
  password: process.env.POSTGRES_OLTP_PASSWORD || "oncologia_dev_2026",
  max: 5,
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

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  FASE 5: Neo4j — Grafo de Conocimiento   ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const session = driver.session({ database: "neo4j" });

  // ── Limpiar ──
  console.log("🧹 Limpiando grafo existente...");
  await session.run("MATCH (n) DETACH DELETE n");
  console.log("   Grafo limpio\n");

  // ── 1. Nodos: Departamento ──
  console.log("🗺️  Creando nodos Departamento...");
  const deptos = Object.keys(DEPTO_ZONAS);

  for (const depto of deptos) {
    await session.run(
      `MERGE (d:Departamento {nombre: $nombre})
       SET d.zona = $zona`,
      { nombre: depto, zona: DEPTO_ZONAS[depto] }
    );
  }

  // ── Nodos: Provincia ──
  console.log("   Creando nodos Provincia...");
  const provincias = await sql`
    SELECT DISTINCT departamento, provincia FROM establecimiento
    WHERE departamento != 'DESCONOCIDO' AND provincia != 'DESCONOCIDO'
    ORDER BY departamento, provincia
    LIMIT 200
  `;

  for (const p of provincias) {
    await session.run(
      `MERGE (prov:Provincia {nombre: $nombre, departamento: $depto})
       WITH prov
       MATCH (d:Departamento {nombre: $depto})
       MERGE (prov)-[:PERTENECE_A]->(d)`,
      { nombre: String(p.provincia).toUpperCase(), depto: String(p.departamento).toUpperCase() }
    );
  }
  console.log(`   ${provincias.length} provincias\n`);

  // ── 2. Nodos: TipoCancer ──
  console.log("🧬 Creando nodos TipoCancer...");
  const canceres = await sql`
    SELECT cod_cie10, nombre, grupo FROM tipo_diagnostico WHERE es_oncologico = TRUE ORDER BY cod_cie10
  `;

  for (const c of canceres) {
    await session.run(
      `MERGE (t:TipoCancer {cod_cie10: $cod})
       SET t.nombre = $nombre, t.grupo = $grupo`,
      { cod: String(c.cod_cie10), nombre: String(c.nombre), grupo: String(c.grupo || "OTROS") }
    );
  }
  console.log(`   ${canceres.length} tipos de cáncer\n`);

  // ── 3. Nodos: Paciente (muestra) ──
  console.log("👤 Creando nodos Paciente (muestra)...");
  const pacientes = await sql`
    SELECT p.id, p.uuid_hash, p.sexo, e.departamento, e.provincia
    FROM paciente p
    JOIN atencion a ON a.paciente_id = p.id
    JOIN establecimiento e ON a.establecimiento_id = e.id
    WHERE p.uuid_hash NOT LIKE 'SINADEF-%'
    LIMIT 5000
  `;

  let pacCount = 0;
  for (const p of pacientes) {
    await session.run(
      `MERGE (pac:Paciente {hash: $hash})
       SET pac.sexo = $sexo`,
      { hash: String(p.uuid_hash), sexo: String(p.sexo) }
    );

    // Relación RESIDE_EN
    const depto = String(p.departamento || "DESCONOCIDO").toUpperCase();
    if (DEPTO_ZONAS[depto]) {
      await session.run(
        `MATCH (pac:Paciente {hash: $hash})
         MATCH (d:Departamento {nombre: $depto})
         MERGE (pac)-[:RESIDE_EN]->(d)`,
        { hash: String(p.uuid_hash), depto }
      );
    }

    pacCount++;
    if (pacCount % 1000 === 0) console.log(`   ${pacCount} pacientes...`);
  }
  console.log(`   ${pacCount} pacientes (muestra)\n`);

  // ── 4. Relaciones: DIAGNOSTICADO_CON ──
  console.log("🔗 Creando relaciones DIAGNOSTICADO_CON...");

  const diagnosticos = await sql`
    SELECT p.uuid_hash, d.cod_cie10, d.fecha_diagnostico
    FROM diagnostico d
    JOIN paciente p ON d.paciente_id = p.id
    WHERE p.uuid_hash LIKE 'SINADEF-%'
    LIMIT 10000
  `;

  let diagRelCount = 0;
  for (const d of diagnosticos) {
    const hash = `SINADEF-pac-${d.uuid_hash}`;
    await session.run(
      `MERGE (pac:Paciente {hash: $hash})
       WITH pac
       MATCH (t:TipoCancer {cod_cie10: $cod})
       MERGE (pac)-[:DIAGNOSTICADO_CON {fecha: $fecha}]->(t)`,
      { hash, cod: String(d.cod_cie10), fecha: String(d.fecha_diagnostico || "2023-01-01") }
    );
    diagRelCount++;
    if (diagRelCount % 2000 === 0) console.log(`   ${diagRelCount} relaciones...`);
  }
  console.log(`   ${diagRelCount} relaciones DIAGNOSTICADO_CON\n`);

  // ── 5. Relaciones: TIENE_INCIDENCIA ──
  console.log("📊 Creando relaciones TIENE_INCIDENCIA...");

  const incidencias = await sql`
    SELECT e.departamento, COUNT(*)::int as casos
    FROM atencion a
    JOIN establecimiento e ON a.establecimiento_id = e.id
    WHERE e.departamento != 'DESCONOCIDO'
    GROUP BY e.departamento
    ORDER BY casos DESC
  `;

  for (const inc of incidencias) {
    const depto = String(inc.departamento).toUpperCase();
    if (!DEPTO_ZONAS[depto]) continue;

    // Vincular con TipoCancer más frecuente (usamos genérico)
    await session.run(
      `MATCH (d:Departamento {nombre: $depto})
       MATCH (t:TipoCancer {cod_cie10: 'C50'})
       MERGE (d)-[:TIENE_INCIDENCIA {casos: $casos, tipo: 'mama'}]->(t)`,
      { depto, casos: Number(inc.casos) }
    );
  }
  console.log(`   ${incidencias.length} relaciones de incidencia\n`);

  // ── 6. Nodos: FactorRiesgo ──
  console.log("⚠️  Creando nodos FactorRiesgo...");

  for (const [depto, factores] of Object.entries(FACTORES_RIESGO)) {
    for (const factor of factores) {
      await session.run(
        `MERGE (f:FactorRiesgo {nombre: $nombre})
         WITH f
         MATCH (d:Departamento {zona: $zona})
         MERGE (d)-[:PRESENTA_FACTOR]->(f)`,
        { nombre: factor, zona: depto }
      );
    }
  }

  // ── 7. Resumen ──
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║         RESUMEN Neo4j                    ║");
  console.log("╚══════════════════════════════════════════╝");

  const counts: Record<string, string> = {
    "Departamento": "MATCH (n:Departamento) RETURN COUNT(n) as c",
    "Provincia": "MATCH (n:Provincia) RETURN COUNT(n) as c",
    "Paciente": "MATCH (n:Paciente) RETURN COUNT(n) as c",
    "TipoCancer": "MATCH (n:TipoCancer) RETURN COUNT(n) as c",
    "FactorRiesgo": "MATCH (n:FactorRiesgo) RETURN COUNT(n) as c",
    "RESIDE_EN": "MATCH ()-[r:RESIDE_EN]->() RETURN COUNT(r) as c",
    "DIAGNOSTICADO_CON": "MATCH ()-[r:DIAGNOSTICADO_CON]->() RETURN COUNT(r) as c",
    "TIENE_INCIDENCIA": "MATCH ()-[r:TIENE_INCIDENCIA]->() RETURN COUNT(r) as c",
    "PRESENTA_FACTOR": "MATCH ()-[r:PRESENTA_FACTOR]->() RETURN COUNT(r) as c",
    "PERTENECE_A": "MATCH ()-[r:PERTENECE_A]->() RETURN COUNT(r) as c",
  };

  for (const [label, query] of Object.entries(counts)) {
    try {
      const result = await session.run(query);
      const count = result.records[0]?.get("c")?.toNumber?.() ?? result.records[0]?.get("c");
      console.log(`   ${label}: ${typeof count === 'bigint' ? count.toString() : count}`);
    } catch {
      console.log(`   ${label}: ❌`);
    }
  }

  await session.close();
  console.log("\n✅ Neo4j poblado correctamente.");
}

main()
  .then(() => { driver.close(); sql.end(); process.exit(0); })
  .catch((err) => { console.error("❌", err); driver.close(); sql.end(); process.exit(1); });
