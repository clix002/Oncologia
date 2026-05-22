/**
 * load-mongo.ts — Puebla MongoDB con documentos clínicos simulado-realistas
 *
 * Colecciones:
 *   - informes_clinicos: informes de radiología, patología, laboratorio
 *   - notas_evolucion: notas de evolución médica
 *   - mining_results: placeholder para resultados de minería
 *   - metadata_catalogos: catálogo documentado de fuentes
 */
import postgres from "postgres";
import { MongoClient } from "mongodb";

// ── Conexiones ──
const sql = postgres({
  host: process.env.POSTGRES_OLTP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLTP_PORT) || 5433,
  database: process.env.POSTGRES_OLTP_DB || "oncologia_oltp",
  username: process.env.POSTGRES_OLTP_USER || "oncologia",
  password: process.env.POSTGRES_OLTP_PASSWORD || "oncologia_dev_2026",
  max: 5,
});

const MONGO_URI = process.env.MONGO_URI || "mongodb://admin:admin_dev_2026@localhost:27018";

const TIPO_INFORME = ["RADIOLOGIA", "PATOLOGIA", "LABORATORIO", "INTERCONSULTA", "EVOLUCION"] as const;
const TIPOS_CANCER = [
  "mama", "cervix", "colon", "prostata", "pulmon", "gastrico",
  "higado", "pancreas", "renal", "vejiga", "piel", "leucemia",
  "linfoma", "encefalo", "ovario", "testiculo", "tiroides", "esofago",
];
const SENTIMIENTOS = ["POSITIVO", "NEUTRAL", "NEGATIVO"] as const;
const DEPTOS = [
  "LIMA", "AREQUIPA", "CUSCO", "LA LIBERTAD", "PIURA",
  "AYACUCHO", "JUNIN", "LAMBAYEQUE", "ANCASH", "CAJAMARCA",
  "HUANUCO", "ICA", "PUNO", "SAN MARTIN", "LORETO",
];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: readonly T[]): T { return arr[rand(0, arr.length - 1)]; }

const NOTAS_TEMPLATES = [
  "Paciente con diagnóstico de {cancer}, en seguimiento por consulta externa. Refiere {sintoma}. Se indica {tratamiento}.",
  "Control evolutivo de {cancer}. Paciente {estado}. Últimos exámenes muestran {resultado}. Se programa nueva cita en {meses} meses.",
  "Primera consulta: paciente derivado de {departamento} con sospecha de {cancer}. Se solicita biopsia y marcadores tumorales.",
  "Resultados de biopsia confirman {cancer} en estadío {estadio}. Se discute caso en comité oncológico. Plan: {tratamiento}.",
  "Paciente en tratamiento con {tratamiento} para {cancer}. Tolera adecuadamente. Efectos secundarios: {efectos}. Continuar esquema.",
  "Interconsulta con {especialidad} por hallazgo de {cancer} metastásico. Se sugiere manejo paliativo y control del dolor.",
  "Paciente completa ciclo de {tratamiento}. Respuesta clínica: {resultado}. Se indica seguimiento cada {meses} meses.",
  "Urgencia oncológica: paciente con {cancer} presenta {sintoma} severo. Se hospitaliza para manejo. Iniciar {tratamiento}.",
];

function genNota(depto: string, cancer: string): string {
  const t = pick(NOTAS_TEMPLATES);
  return t
    .replace("{cancer}", `cáncer de ${cancer}`)
    .replace("{sintoma}", pick(["dolor localizado", "pérdida de peso", "fatiga", "fiebre", "anorexia", "disnea"]))
    .replace("{tratamiento}", pick(["quimioterapia", "radioterapia", "cirugía", "hormonoterapia", "inmunoterapia", "terapia dirigida"]))
    .replace("{estado}", pick(["evoluciona favorablemente", "presenta estabilidad clínica", "muestra progresión lenta"]))
    .replace("{resultado}", pick(["reducción tumoral del 30%", "marcadores en descenso", "estabilidad de enfermedad", "progresión mínima"]))
    .replace("{meses}", String(rand(3, 12)))
    .replace("{departamento}", depto)
    .replace("{estadio}", pick(["I", "II", "III", "IV"]))
    .replace("{efectos}", pick(["náuseas leves", "fatiga grado 1", "alopecia", "neuropatía leve", "ninguno significativo"]))
    .replace("{especialidad}", pick(["Cirugía Oncológica", "Radioterapia", "Cuidados Paliativos", "Oncología Clínica"]));
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   FASE 4: MongoDB — Docs Clínicos       ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db("oncologia_docs");
  console.log("📡 MongoDB conectado");

  // ── 1. metadata_catalogos ──
  console.log("📋 Insertando catálogo de metadatos...");
  const catalogo = [
    {
      nombre: "INEN Pacientes Nuevos",
      fuente: "INEN",
      descripcion: "Listado de pacientes oncológicos registrados en el INEN 2022-2025",
      frecuencia_actualizacion: "Anual",
      responsable: "MINSA-INEN",
      campos: [
        { nombre: "UUID", tipo: "TEXT", descripcion: "Identificador anonimizado" },
        { nombre: "SEXO", tipo: "TEXT", descripcion: "FEMENINO / MASCULINO" },
        { nombre: "EDAD", tipo: "INTEGER", descripcion: "Edad al momento de filiación" },
        { nombre: "UBIGEO", tipo: "TEXT(6)", descripcion: "Código ubigeo de residencia" },
        { nombre: "LUGAR_RESIDENCIA", tipo: "TEXT", descripcion: "DPTO-PROVINCIA-DISTRITO" },
      ],
    },
    {
      nombre: "SINADEF Defunciones",
      fuente: "MINSA-SINADEF",
      descripcion: "Registro nacional de defunciones 2017-2024, pipe-delimited",
      frecuencia_actualizacion: "Mensual",
      responsable: "MINSA-RENIEC",
      campos: [
        { nombre: "SEXO", tipo: "TEXT", descripcion: "FEMENINO / MASCULINO" },
        { nombre: "EDAD", tipo: "INTEGER", descripcion: "Edad al fallecer" },
        { nombre: "DEPARTAMENTO", tipo: "TEXT", descripcion: "Ubicación del fallecido" },
        { nombre: "CAUSA A-F (CIE-X)", tipo: "TEXT", descripcion: "Códigos CIE-10 de causas de muerte" },
      ],
    },
    {
      nombre: "INEI Población",
      fuente: "INEI",
      descripcion: "Proyecciones departamentales de población 2000-2026",
      frecuencia_actualizacion: "Anual",
      responsable: "INEI",
      campos: [
        { nombre: "UBIGEO", tipo: "TEXT(6)", descripcion: "Código ubigeo del departamento" },
        { nombre: "TOTAL", tipo: "INTEGER", descripcion: "Población total proyectada" },
      ],
    },
  ];

  for (const c of catalogo) {
    await db.collection("metadata_catalogos").insertOne({
      ...c,
      _created: new Date(),
    });
  }
  console.log(`   ${catalogo.length} catálogos insertados`);

  // ── 2. informes_clinicos ──
  console.log("🏥 Generando informes clínicos...");

  // Obtener pacientes del OLTP
  const pacientes = await sql`
    SELECT p.id, p.uuid_hash, p.sexo, p.ubigeo, e.departamento
    FROM paciente p
    LEFT JOIN atencion a ON a.paciente_id = p.id
    LEFT JOIN establecimiento e ON a.establecimiento_id = e.id
    WHERE p.uuid_hash NOT LIKE 'SINADEF-%'
    LIMIT 2000
  `;

  const informes: any[] = [];
  for (const p of pacientes) {
    // Generar 1-3 informes por paciente
    const num = rand(1, 3);
    for (let j = 0; j < num; j++) {
      const tipo = pick(TIPO_INFORME);
      const cancer = pick(TIPOS_CANCER);
      const depto = String(p.departamento || "LIMA");

      informes.push({
        paciente_id_hash: String(p.uuid_hash),
        fecha: new Date(2022 + rand(0, 3), rand(0, 11), rand(1, 28)),
        tipo_informe: tipo,
        contenido: genNota(depto, cancer) + " Informe " + tipo.toLowerCase() + " generado.",
        medico: `Dr. ${pick(["García", "López", "Martínez", "Rodríguez", "Fernández", "González"])}`,
        departamento: depto,
        palabras_clave: [cancer, tipo, depto.toLowerCase(), "oncologia", pick(["biopsia", "marcadores", "tratamiento", "seguimiento"])],
        _created: new Date(),
      });
    }
  }

  if (informes.length > 0) {
    await db.collection("informes_clinicos").insertMany(informes);
  }
  console.log(`   ${informes.length} informes clínicos generados`);

  // ── 3. notas_evolucion ──
  console.log("📝 Generando notas de evolución...");
  
  const notas: any[] = [];
  for (let i = 0; i < 3000; i++) {
    const depto = pick(DEPTOS);
    const cancer = pick(TIPOS_CANCER);
    const sentimiento = pick(SENTIMIENTOS);
    const cie10 = `C${rand(15, 92)}`;

    notas.push({
      paciente_id_hash: `SIM-${String(i).padStart(6, "0")}`,
      fecha: new Date(2022 + rand(0, 3), rand(0, 11), rand(1, 28)),
      nota: genNota(depto, cancer),
      medico: `Dr. ${pick(["García", "López", "Martínez", "Rodríguez"])}`,
      diagnostico_cie10: cie10,
      sentimiento,
      _created: new Date(),
    });
  }

  await db.collection("notas_evolucion").insertMany(notas);
  console.log(`   ${notas.length} notas de evolución generadas`);

  // ── 4. mining_results (placeholder) ──
  console.log("🔬 Insertando placeholder de minería...");
  
  await db.collection("mining_results").insertMany([
    {
      tipo: "clustering",
      algoritmo: "K-means",
      parametros: { k: 5, variables: ["tasa_incidencia", "sex_ratio", "poblacion"] },
      fecha_ejecucion: new Date(),
      resultado: {
        clusters: [
          { id: 0, deptos: ["LIMA", "CALLAO"], perfil: "alta_incidencia_urbana", size: 2 },
          { id: 1, deptos: ["AYACUCHO", "HUANCAVELICA", "HUANUCO", "PASCO"], perfil: "media_incidencia_sierra", size: 4 },
          { id: 2, deptos: ["LORETO", "UCAYALI", "MADRE DE DIOS", "AMAZONAS"], perfil: "baja_incidencia_selva", size: 4 },
          { id: 3, deptos: ["AREQUIPA", "CUSCO", "PUNO", "JUNIN"], perfil: "media_alta_incidencia_sierra_sur", size: 4 },
          { id: 4, deptos: ["PIURA", "CAJAMARCA", "LA LIBERTAD", "LAMBAYEQUE", "ANCASH", "TUMBES"], perfil: "media_incidencia_costa_norte", size: 6 },
        ],
        metricas: { silhouette: 0.62, inertia: 1234.5 },
      },
      metricas: { silhouette_score: 0.62 },
      dataset_size: 25,
    },
    {
      tipo: "asociacion",
      algoritmo: "Apriori",
      parametros: { min_support: 0.1, min_confidence: 0.5 },
      fecha_ejecucion: new Date(),
      resultado: {
        reglas: [
          { antecedente: ["cervix"], consecuente: ["mama"], confidence: 0.65, lift: 1.8 },
          { antecedente: ["prostata"], consecuente: ["colon"], confidence: 0.55, lift: 1.4 },
          { antecedente: ["pulmon"], consecuente: ["gastrico"], confidence: 0.48, lift: 1.3 },
        ],
      },
      metricas: { total_reglas: 12 },
      dataset_size: 95,
    },
  ]);
  console.log("   2 resultados de minería placeholder\n");

  // ── Resumen ──
  console.log("╔══════════════════════════════════════════╗");
  console.log("║         RESUMEN MongoDB                   ║");
  console.log("╚══════════════════════════════════════════╝");

  const counts = [
    { name: "metadata_catalogos", col: "metadata_catalogos" },
    { name: "informes_clinicos", col: "informes_clinicos" },
    { name: "notas_evolucion", col: "notas_evolucion" },
    { name: "mining_results", col: "mining_results" },
  ];

  for (const c of counts) {
    const count = await db.collection(c.col).countDocuments();
    console.log(`   ${c.name}: ${count.toLocaleString()}`);
  }

  console.log("\n✅ MongoDB poblado correctamente.");
  await mongo.close();
}

main().catch((err) => { console.error("❌", err); process.exit(1); });
