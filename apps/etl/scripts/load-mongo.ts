/**
 * load-mongo.ts — Puebla MongoDB con documentos clínicos basados en datos reales
 *
 * Colecciones:
 *   - informes_clinicos: informes con hashes reales INEN (hash + sexo + depto + año)
 *   - notas_evolucion:   notas con hashes reales SINADEF (hash + CIE-10 real + depto)
 *   - mining_results:    resultados calculados desde OLAP real
 *   - metadata_catalogos: catálogo de fuentes de datos
 */
import postgres from "postgres";
import { MongoClient } from "mongodb";

const oltp = postgres({
  host: process.env.POSTGRES_OLTP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLTP_PORT) || 5433,
  database: process.env.POSTGRES_OLTP_DB || "oncologia_oltp",
  username: process.env.POSTGRES_OLTP_USER || "oncologia",
  password: process.env.POSTGRES_OLTP_PASSWORD || "oncologia_dev_2026",
  max: 5,
  idle_timeout: 60,
});

const olap = postgres({
  host: process.env.POSTGRES_OLAP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLAP_PORT) || 5434,
  database: process.env.POSTGRES_OLAP_DB || "oncologia_olap",
  username: process.env.POSTGRES_OLAP_USER || "oncologia",
  password: process.env.POSTGRES_OLAP_PASSWORD || "oncologia_dev_2026",
  max: 5,
  idle_timeout: 60,
});

const MONGO_URI = process.env.MONGO_URI || "mongodb://admin:admin_dev_2026@localhost:27018";

// ── Helpers ──
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const TIPO_INFORME = ["RADIOLOGIA", "PATOLOGIA", "LABORATORIO", "INTERCONSULTA", "EVOLUCION"] as const;
const MEDICOS = ["Dr. García", "Dr. López", "Dr. Martínez", "Dra. Rodríguez", "Dra. Fernández", "Dr. Gonzales", "Dra. Torres"];
const SENTIMIENTOS = ["POSITIVO", "NEUTRAL", "NEGATIVO"] as const;

// CIE-10 → nombre legible (subconjunto oncológico)
const CIE_NOMBRES: Record<string, string> = {
  C50: "mama", C53: "cuello uterino", C61: "próstata", C18: "colon",
  C34: "pulmón", C16: "estómago", C22: "hígado", C25: "páncreas",
  C64: "riñón", C67: "vejiga", C73: "tiroides", C83: "linfoma no Hodgkin",
  C91: "leucemia linfática", C43: "melanoma", C56: "ovario", C62: "testículo",
};

function cieToNombre(cod: string): string {
  const base = cod.substring(0, 3);
  return CIE_NOMBRES[base] || `tumor maligno (${cod})`;
}

const NOTAS_TEMPLATES = [
  "Paciente con diagnóstico de {cancer}, en seguimiento por consulta externa. Refiere {sintoma}. Se indica {tratamiento}.",
  "Control evolutivo de {cancer}. Paciente {estado}. Últimos exámenes: {resultado}. Nueva cita en {meses} meses.",
  "Resultados confirman {cancer} en estadío {estadio}. Plan discutido en comité oncológico: {tratamiento}.",
  "Paciente en {tratamiento} para {cancer}. Tolera adecuadamente. Efectos: {efectos}. Continuar esquema.",
  "Urgencia oncológica: paciente con {cancer} presenta {sintoma} severo. Se hospitaliza. Iniciar {tratamiento}.",
  "Paciente completa ciclo de {tratamiento}. Respuesta: {resultado}. Seguimiento cada {meses} meses.",
];

function genNota(cancer: string): string {
  return pick(NOTAS_TEMPLATES)
    .replace("{cancer}", `cáncer de ${cancer}`)
    .replace("{sintoma}", pick(["dolor localizado", "pérdida de peso", "fatiga", "fiebre", "disnea"]))
    .replace("{tratamiento}", pick(["quimioterapia", "radioterapia", "cirugía", "hormonoterapia", "inmunoterapia"]))
    .replace("{estado}", pick(["evoluciona favorablemente", "estabilidad clínica", "progresión lenta"]))
    .replace("{resultado}", pick(["reducción tumoral 30%", "marcadores en descenso", "estabilidad de enfermedad"]))
    .replace("{meses}", String(rand(3, 12)))
    .replace("{estadio}", pick(["I", "II", "III", "IV"]))
    .replace("{efectos}", pick(["náuseas leves", "fatiga grado 1", "alopecia", "neuropatía leve", "ninguno significativo"]));
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   FASE 4: MongoDB — Docs Clínicos       ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db("oncologia_docs");
  console.log("📡 MongoDB conectado\n");

  // ── 0. Limpiar colecciones (idempotente) ──
  console.log("🧹 Limpiando colecciones anteriores...");
  await db.collection("informes_clinicos").drop().catch(() => {});
  await db.collection("notas_evolucion").drop().catch(() => {});
  await db.collection("mining_results").drop().catch(() => {});
  await db.collection("metadata_catalogos").drop().catch(() => {});
  console.log("   Limpio\n");

  // ── 1. metadata_catalogos ──
  console.log("📋 Insertando catálogo de metadatos...");
  await db.collection("metadata_catalogos").insertMany([
    {
      nombre: "INEN Pacientes Nuevos",
      fuente: "INEN",
      descripcion: "Pacientes oncológicos registrados en el INEN 2022-2025",
      frecuencia_actualizacion: "Anual",
      responsable: "MINSA-INEN",
      registros: 66145,
      años: [2022, 2023, 2024, 2025],
      campos: ["UUID", "SEXO", "EDAD", "UBIGEO", "LUGAR_RESIDENCIA"],
      _created: new Date(),
    },
    {
      nombre: "SINADEF Defunciones Oncológicas",
      fuente: "MINSA-SINADEF",
      descripcion: "Defunciones oncológicas (CIE-10 C*) del registro nacional 2017-2024",
      frecuencia_actualizacion: "Mensual",
      responsable: "MINSA-RENIEC",
      registros: 140513,
      años: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
      campos: ["SEXO", "EDAD", "DEPARTAMENTO", "PROVINCIA", "CAUSA CIE-10"],
      _created: new Date(),
    },
    {
      nombre: "INEI Población Departamental",
      fuente: "INEI",
      descripcion: "Proyecciones departamentales de población 2000-2026",
      frecuencia_actualizacion: "Anual",
      responsable: "INEI",
      registros: 300,
      años: Array.from({ length: 27 }, (_, i) => 2000 + i),
      campos: ["UBIGEO", "DEPARTAMENTO", "TOTAL", "HOMBRES", "MUJERES"],
      _created: new Date(),
    },
  ]);
  console.log("   3 catálogos insertados\n");

  // ── 2. informes_clinicos — basados en pacientes INEN reales ──
  console.log("🏥 Generando informes clínicos (INEN)...");

  const inenPacientes = await oltp`
    SELECT p.uuid_hash, p.sexo, p.departamento
    FROM paciente p
    WHERE p.uuid_hash NOT LIKE 'SINADEF-%'
    ORDER BY RANDOM()
    LIMIT 10000
  `;

  const BATCH = 500;
  let totalInformes = 0;

  for (let i = 0; i < inenPacientes.length; i += BATCH) {
    const chunk = inenPacientes.slice(i, i + BATCH);
    const informes: any[] = [];

    for (const p of chunk) {
      const depto = String(p.departamento || "LIMA");
      // INEN no tiene CIE-10 — usamos los más frecuentes por sexo
      const cancerBase = String(p.sexo) === "F"
        ? pick(["mama", "cuello uterino", "tiroides", "ovario", "colon"])
        : pick(["próstata", "pulmón", "estómago", "colon", "vejiga"]);

      const numInformes = rand(1, 3);
      for (let j = 0; j < numInformes; j++) {
        informes.push({
          paciente_id_hash: String(p.uuid_hash),
          fecha: new Date(2022 + rand(0, 3), rand(0, 11), rand(1, 28)),
          tipo_informe: pick(TIPO_INFORME),
          contenido: genNota(cancerBase),
          medico: pick(MEDICOS),
          departamento: depto,
          sexo: String(p.sexo),
          fuente: "INEN",
          palabras_clave: [cancerBase, depto.toLowerCase(), "oncologia"],
          _created: new Date(),
        });
      }
    }

    if (informes.length > 0) {
      await db.collection("informes_clinicos").insertMany(informes);
      totalInformes += informes.length;
    }
  }
  console.log(`   ${totalInformes.toLocaleString()} informes clínicos insertados\n`);

  // ── 3. notas_evolucion — basadas en SINADEF reales (CIE-10 real) ──
  console.log("📝 Generando notas de evolución (SINADEF)...");

  const sinadefPacientes = await oltp`
    SELECT p.uuid_hash, p.sexo, p.departamento, d.cod_cie10, d.fecha_diagnostico
    FROM paciente p
    JOIN diagnostico d ON d.paciente_id = p.id
    WHERE p.uuid_hash LIKE 'SINADEF-%'
    ORDER BY RANDOM()
    LIMIT 15000
  `;

  let totalNotas = 0;
  for (let i = 0; i < sinadefPacientes.length; i += BATCH) {
    const chunk = sinadefPacientes.slice(i, i + BATCH);
    const notas: any[] = [];

    for (const p of chunk) {
      const cancer = cieToNombre(String(p.cod_cie10 || "C80"));
      const fechaDx = p.fecha_diagnostico ? new Date(String(p.fecha_diagnostico)) : new Date(2020, 0, 1);

      notas.push({
        paciente_id_hash: String(p.uuid_hash),
        fecha: fechaDx,
        nota: genNota(cancer),
        medico: pick(MEDICOS),
        diagnostico_cie10: String(p.cod_cie10 || "C80"),
        cancer_tipo: cancer,
        departamento: String(p.departamento || "DESCONOCIDO"),
        sexo: String(p.sexo),
        sentimiento: pick(SENTIMIENTOS),
        fuente: "SINADEF",
        _created: new Date(),
      });
    }

    if (notas.length > 0) {
      await db.collection("notas_evolucion").insertMany(notas);
      totalNotas += notas.length;
    }
  }
  console.log(`   ${totalNotas.toLocaleString()} notas de evolución insertadas\n`);

  // ── 4. mining_results — calculados desde OLAP real ──
  console.log("🔬 Calculando resultados de minería desde OLAP...");

  // K-means proxy: agrupar deptos por tasa de mortalidad SINADEF
  const tasasPorDepto = await olap`
    SELECT g.departamento, COUNT(*)::float / NULLIF(MAX(p.total), 0) * 100000 as tasa
    FROM fact_oncologia f
    JOIN dim_geografia g ON f.geografia_id = g.id
    JOIN dim_fuente df ON f.fuente_id = df.id
    LEFT JOIN poblacion p ON p.departamento = g.departamento AND p.año = 2022
    WHERE df.nombre = 'SINADEF' AND g.departamento != 'DESCONOCIDO'
    GROUP BY g.departamento
    ORDER BY tasa DESC NULLS LAST
  `;

  const deptosTasa = tasasPorDepto.map(r => ({
    depto: String(r.departamento),
    tasa: Number(r.tasa) || 0,
  }));

  // Clustering manual por cuartiles
  const sorted = [...deptosTasa].sort((a, b) => b.tasa - a.tasa);
  const n = sorted.length;
  const clusters = [
    { id: 0, perfil: "alta_incidencia", deptos: sorted.slice(0, Math.ceil(n * 0.2)).map(d => d.depto) },
    { id: 1, perfil: "media_alta_incidencia", deptos: sorted.slice(Math.ceil(n * 0.2), Math.ceil(n * 0.5)).map(d => d.depto) },
    { id: 2, perfil: "media_baja_incidencia", deptos: sorted.slice(Math.ceil(n * 0.5), Math.ceil(n * 0.8)).map(d => d.depto) },
    { id: 3, perfil: "baja_incidencia", deptos: sorted.slice(Math.ceil(n * 0.8)).map(d => d.depto) },
  ];

  // Top CIE-10 por frecuencia
  const topCanceres = await olap`
    SELECT d.cod_cie10, COUNT(*) as frecuencia
    FROM fact_oncologia f
    JOIN dim_diagnostico d ON f.diagnostico_id = d.id
    WHERE f.diagnostico_id IS NOT NULL
    GROUP BY d.cod_cie10
    ORDER BY frecuencia DESC
    LIMIT 20
  `;

  await db.collection("mining_results").insertMany([
    {
      tipo: "clustering_geografico",
      algoritmo: "Cuartiles por tasa de mortalidad",
      fecha_ejecucion: new Date(),
      dataset_size: deptosTasa.length,
      resultado: {
        clusters,
        deptos_detalle: deptosTasa,
      },
      _created: new Date(),
    },
    {
      tipo: "top_canceres",
      algoritmo: "Frecuencia absoluta SINADEF",
      fecha_ejecucion: new Date(),
      dataset_size: 140513,
      resultado: {
        ranking: topCanceres.map((r, i) => ({
          rank: i + 1,
          cod_cie10: String(r.cod_cie10),
          nombre: cieToNombre(String(r.cod_cie10)),
          frecuencia: Number(r.frecuencia),
        })),
      },
      _created: new Date(),
    },
  ]);
  console.log("   2 resultados de minería calculados desde OLAP\n");

  // ── Crear índices ──
  console.log("🔧 Creando índices...");
  await db.collection("informes_clinicos").createIndex({ paciente_id_hash: 1 });
  await db.collection("informes_clinicos").createIndex({ departamento: 1, fecha: -1 });
  await db.collection("notas_evolucion").createIndex({ paciente_id_hash: 1 });
  await db.collection("notas_evolucion").createIndex({ diagnostico_cie10: 1 });
  await db.collection("notas_evolucion").createIndex({ departamento: 1 });
  console.log("   Índices creados\n");

  // ── Resumen ──
  console.log("╔══════════════════════════════════════════╗");
  console.log("║         RESUMEN MongoDB                  ║");
  console.log("╚══════════════════════════════════════════╝");
  for (const col of ["metadata_catalogos", "informes_clinicos", "notas_evolucion", "mining_results"]) {
    const count = await db.collection(col).countDocuments();
    console.log(`   ${col}: ${count.toLocaleString()}`);
  }

  console.log("\n✅ MongoDB poblado correctamente.");
  await mongo.close();
}

main()
  .then(() => { oltp.end(); olap.end(); process.exit(0); })
  .catch((err) => { console.error("❌", err); oltp.end(); olap.end(); process.exit(1); });
