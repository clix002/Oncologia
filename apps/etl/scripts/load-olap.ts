/**
 * load-olap.ts — ETL: OLTP → OLAP (Star Schema + Data Marts)
 *
 * Transforma datos normalizados del OLTP al Data Warehouse dimensional.
 * Puebla: dim_tiempo, dim_geografia, dim_paciente, dim_diagnostico,
 *         dim_establecimiento, dim_fuente, fact_oncologia, poblacion.
 * Refresca: dm_geografia, dm_demografia, dm_temporal, dm_diagnostico.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import XLSX from "xlsx";
import Papa from "papaparse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ── Conexiones ──
const oltp = postgres({
  host: process.env.POSTGRES_OLTP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLTP_PORT) || 5433,
  database: process.env.POSTGRES_OLTP_DB || "oncologia_oltp",
  username: process.env.POSTGRES_OLTP_USER || "oncologia",
  password: process.env.POSTGRES_OLTP_PASSWORD || "oncologia_dev_2026",
});

const olap = postgres({
  host: process.env.POSTGRES_OLAP_HOST || "localhost",
  port: Number(process.env.POSTGRES_OLAP_PORT) || 5434,
  database: process.env.POSTGRES_OLAP_DB || "oncologia_olap",
  username: process.env.POSTGRES_OLAP_USER || "oncologia",
  password: process.env.POSTGRES_OLAP_PASSWORD || "oncologia_dev_2026",
});

// ── Helpers ──
function trimestre(mes: number): number {
  return Math.ceil(mes / 3);
}
function semestre(mes: number): number {
  return mes <= 6 ? 1 : 2;
}
function ageGroup10(age: number): string {
  if (age <= 10) return "0-10";
  if (age <= 20) return "11-20";
  if (age <= 30) return "21-30";
  if (age <= 40) return "31-40";
  if (age <= 50) return "41-50";
  if (age <= 60) return "51-60";
  if (age <= 70) return "61-70";
  if (age <= 80) return "71-80";
  return "81+";
}
function ageGroup20(age: number): string {
  if (age <= 20) return "0-20";
  if (age <= 40) return "21-40";
  if (age <= 60) return "41-60";
  if (age <= 80) return "61-80";
  return "81+";
}

const DEPTO_ZONA: Record<string, string> = {
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

const INEI_PATH = resolve(ROOT, "data/inei/inei_poblacion_departamentos.xlsx");

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   ETL FASE 2: OLTP → OLAP Star Schema   ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // ── 0. Limpiar OLAP para ETL idempotente ──
  console.log("🧹 Limpiando tablas OLAP...");
  await olap`TRUNCATE TABLE fact_oncologia, dim_tiempo, dim_geografia, dim_paciente, dim_fuente, dim_diagnostico, dim_establecimiento, poblacion RESTART IDENTITY CASCADE`;
  console.log("   Tablas limpias\n");

  // ── 1. Cargar población INEI → OLAP ──
  console.log("📊 Cargando población INEI...");
  const wb = XLSX.readFile(INEI_PATH);
  const SHEET_YEARS: Record<string, [number, number, number]> = {
    "2015-2017": [2015, 2016, 2017],
    "2018-2020": [2018, 2019, 2020],
    "2021-2023": [2021, 2022, 2023],
    "2024-2026": [2024, 2025, 2026],
  };

  const poblacionData: { depto: string; año: number; total: number; h: number; m: number }[] = [];

  for (const [sheet, years] of Object.entries(SHEET_YEARS)) {
    const ws = wb.Sheets[sheet];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: "" });
    for (const row of rows) {
      const ubigeo = String(row[0]).trim();
      if (!/^\d{2}0000$/.test(ubigeo) || ubigeo === "000000") continue;
      const nombre = String(row[1]).trim().toUpperCase();
      for (let idx = 0; idx < 3; idx++) {
        const año = years[idx];
        const baseCol = 2 + idx * 3;
        const total = Number(row[baseCol]) || 0;
        if (total > 0) {
          poblacionData.push({
            depto: nombre,
            año,
            total,
            h: Number(row[baseCol + 1]) || 0,
            m: Number(row[baseCol + 2]) || 0,
          });
        }
      }
    }
  }

  // Upsert población
  let popCount = 0;
  for (const p of poblacionData) {
    await olap`
      INSERT INTO poblacion (departamento, año, total, hombres, mujeres)
      VALUES (${p.depto}, ${p.año}, ${p.total}, ${p.h}, ${p.m})
      ON CONFLICT DO NOTHING
    `;
    popCount++;
  }
  console.log(`   ${popCount} registros de población\n`);

  // ── 2. Transformar OLTP → dimensiones OLAP ──
  console.log("🔄 Transformando pacientes → dim_paciente...");

  // Obtener sexo + grupo_etario de INEN (usamos la tabla paciente del OLTP)
  const inenPacientes = await oltp`
    SELECT p.sexo,
           EXTRACT(YEAR FROM a.fecha_atencion)::int as año,
           COUNT(*) as casos
    FROM paciente p
    JOIN atencion a ON a.paciente_id = p.id
    WHERE p.uuid_hash NOT LIKE 'SINADEF-%'
    GROUP BY p.sexo, año
    ORDER BY año
  `;

  // Insertar dim_paciente (combinaciones únicas sexo + grupos)
  // Usamos la edad real de los pacientes del CSV original
  // Como la edad no está en nuestra tabla OLTP (simplificada), 
  // la extraemos del CSV source directamente
  const dimPacienteSet = new Set<string>();
  
  // Leer del CSV fuente para obtener edad+sexo
  
  const csvPath = resolve(ROOT, "data/inen/inen_pacientes_2022_2025.csv");
  const buf = readFileSync(csvPath);
  const text = new TextDecoder("latin1").decode(buf);
  const parsed = Papa.parse(text, {
    header: true, skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().replace(/^"|"$/g, ""),
  });

  for (const row of parsed.data as any[]) {
    const sexo = String(row.SEXO ?? "").trim().replace(/"/g, "").toUpperCase();
    const validSexo = sexo === "FEMENINO" ? "F" : sexo === "MASCULINO" ? "M" : "X";
    const edad = parseInt(String(row.EDAD ?? "").trim().replace(/"/g, ""), 10);
    const g10 = Number.isNaN(edad) ? "DESCONOCIDO" : ageGroup10(edad);
    const g20 = Number.isNaN(edad) ? "DESCONOCIDO" : ageGroup20(edad);
    dimPacienteSet.add(`${validSexo}|${g10}|${g20}`);
  }

  // SINADEF: age groups from death records
  const sinadefPath = resolve(ROOT, "data/sinadef/fallecidos_sinadef.csv");
  const sBuf = readFileSync(sinadefPath);
  const sText = new TextDecoder("utf-8").decode(sBuf);
  const sLines = sText.split("\n");
  let sinadefCount = 0;
  let sPending = "";
  for (let i = 1; i < sLines.length && sinadefCount < 100000; i++) {
    const raw = sLines[i];
    if (!raw?.trim()) continue;

    const line = sPending ? sPending + "\n" + raw : raw;
    const cols = line.split("|");

    if (cols.length < 32) { sPending = line; continue; }
    sPending = "";

    // Only cancer deaths
    let isCancer = false;
    for (const idx of [21, 23, 25, 27, 29, 31]) {
      if (/^C\d/.test(cols[idx]?.trim() || "")) { isCancer = true; break; }
    }
    if (!isCancer) continue;

    const sexoRaw = cols[2]?.trim() || "DESCONOCIDO";
    const sexo = sexoRaw === "FEMENINO" ? "F" : sexoRaw === "MASCULINO" ? "M" : "X";
    const edad = parseInt(cols[3], 10);
    const g10 = Number.isNaN(edad) ? "DESCONOCIDO" : ageGroup10(edad);
    const g20 = Number.isNaN(edad) ? "DESCONOCIDO" : ageGroup20(edad);
    dimPacienteSet.add(`${sexo}|${g10}|${g20}`);
    sinadefCount++;
  }

  // Insertar dim_paciente
  let dimPacCount = 0;
  for (const key of dimPacienteSet) {
    const [sexo, grupo10, grupo20] = key.split("|");
    await olap`
      INSERT INTO dim_paciente (sexo, grupo_etario_10, grupo_etario_20)
      VALUES (${sexo}, ${grupo10}, ${grupo20})
      ON CONFLICT DO NOTHING
    `;
    dimPacCount++;
  }
  
  const [pacTotal] = await olap`SELECT COUNT(*)::int as c FROM dim_paciente`;
  console.log(`   ${pacTotal.c} grupos únicos paciente\n`);

  // ── 3. dim_geografia ──
  console.log("🗺️  Transformando geografía...");

  // Get unique departamentos/provincias from OLTP atenciones
  const oltpGeoRows = await oltp`
    SELECT DISTINCT e.departamento, e.provincia, e.distrito
    FROM establecimiento e
    JOIN atencion a ON a.establecimiento_id = e.id
    ORDER BY departamento, provincia
  `;

  for (const g of oltpGeoRows) {
    const depto = String(g.departamento).toUpperCase();
    const prov = String(g.provincia).toUpperCase();
    const dist = (g.distrito || "").toUpperCase();
    const zona = DEPTO_ZONA[depto] || null;

    await olap`
      INSERT INTO dim_geografia (departamento, provincia, distrito, zona)
      VALUES (${depto}, ${prov}, ${dist || null}, ${zona})
      ON CONFLICT DO NOTHING
    `;
  }

  const [geoT] = await olap`SELECT COUNT(*)::int as c FROM dim_geografia`;
  console.log(`   ${geoT.c} registros geográficos\n`);

  // ── 4. dim_fuente ──
  console.log("📋 Insertando fuentes...");
  const fuentes = await oltp`SELECT nombre, archivo_origen as rango_fechas, nota FROM fuente_dato`;
  for (const f of fuentes) {
    await olap`
      INSERT INTO dim_fuente (nombre, rango_fechas, nota)
      VALUES (${String(f.nombre)}, ${String(f.rango_fechas || "")}, ${String(f.nota || "")})
    `;
  }
  const [fuT] = await olap`SELECT COUNT(*)::int as c FROM dim_fuente`;
  console.log(`   ${fuT.c} fuentes\n`);

  // ── 5. dim_diagnostico ──
  console.log("🧬 Cargando dimensiones diagnóstico...");
  const diags = await oltp`SELECT cod_cie10, nombre, grupo FROM tipo_diagnostico WHERE es_oncologico = TRUE`;
  for (const d of diags) {
    await olap`
      INSERT INTO dim_diagnostico (cod_cie10, nombre, grupo)
      VALUES (${String(d.cod_cie10)}, ${String(d.nombre)}, ${String(d.grupo)})
      ON CONFLICT (cod_cie10) DO UPDATE SET nombre = EXCLUDED.nombre, grupo = EXCLUDED.grupo
    `;
  }
  const [diT] = await olap`SELECT COUNT(*)::int as c FROM dim_diagnostico`;
  console.log(`   ${diT.c} diagnósticos\n`);

  // ── 6. dim_establecimiento ──
  console.log("🏥 Cargando establecimientos...");
  const ests = await oltp`
    SELECT DISTINCT nombre, nivel, departamento, provincia
    FROM establecimiento
  `;
  for (const e of ests) {
    await olap`
      INSERT INTO dim_establecimiento (nombre, nivel, tipo)
      VALUES (${String(e.nombre)}, ${String(e.nivel || "")}, 'INEN')
      ON CONFLICT DO NOTHING
    `;
  }
  const [esT] = await olap`SELECT COUNT(*)::int as c FROM dim_establecimiento`;
  console.log(`   ${esT.c} establecimientos\n`);

  // ── 7. dim_tiempo ──
  console.log("📅 Generando dimensión tiempo...");
  for (let año = 2017; año <= 2025; año++) {
    for (let mes = 1; mes <= 12; mes++) {
      await olap`
        INSERT INTO dim_tiempo (año, mes, trimestre, semestre, completo)
        VALUES (${año}, ${mes}, ${trimestre(mes)}, ${semestre(mes)}, ${año !== 2025})
        ON CONFLICT DO NOTHING
      `;
    }
  }
  const [tiT] = await olap`SELECT COUNT(*)::int as c FROM dim_tiempo`;
  console.log(`   ${tiT.c} periodos\n`);

  // ── 8. fact_oncologia — desde OLTP ──
  console.log("📊 Construyendo tabla de hechos...");

  // 8a. Hechos desde INEN (atenciones)
  console.log("   Desde INEN (atenciones)...");
  
  // Resolver IDs en batch
  const dims = {
    tiempo: new Map<string, number>(),
    geo: new Map<string, number>(),
    paciente: new Map<string, number>(),
    fuente: new Map<string, number>(),
  };

  // Cache de dimensiones
  const tiempoRows = await olap`SELECT id, año, mes FROM dim_tiempo`;
  for (const t of tiempoRows) dims.tiempo.set(`${t.año}-${t.mes}`, Number(t.id));

  const geoRows = await olap`SELECT id, departamento, provincia FROM dim_geografia`;
  for (const g of geoRows) dims.geo.set(`${g.departamento}|${g.provincia}`, Number(g.id));

  const pacRows = await olap`SELECT id, sexo, grupo_etario_10 FROM dim_paciente`;
  for (const p of pacRows) dims.paciente.set(`${p.sexo}|${p.grupo_etario_10}`, Number(p.id));

  const fuenteRows = await olap`SELECT id, nombre FROM dim_fuente`;
  for (const f of fuenteRows) dims.fuente.set(String(f.nombre), Number(f.id));

  // Obtener atenciones con joins
  const atencionesData = await oltp`
    SELECT 
      p.uuid_hash, p.sexo,
      e.departamento, e.provincia,
      EXTRACT(YEAR FROM a.fecha_atencion)::int as año,
      EXTRACT(MONTH FROM a.fecha_atencion)::int as mes
    FROM atencion a
    JOIN paciente p ON a.paciente_id = p.id
    JOIN establecimiento e ON a.establecimiento_id = e.id
    WHERE p.uuid_hash NOT LIKE 'SINADEF-%'
  `;

  // Leer edades del CSV nuevamente para mapear uuid_hash → edad
  const uuidToEdad = new Map<string, number>();
  for (const row of parsed.data as any[]) {
    const uuid = String(row.UUID ?? "").trim().replace(/"/g, "");
    const edad = parseInt(String(row.EDAD ?? "").trim().replace(/"/g, ""), 10);
    uuidToEdad.set(uuid, Number.isNaN(edad) ? 0 : edad);
  }

  const inenFuenteId = dims.fuente.get("INEN") || 1;
  let factsFromInen = 0;

  for (const a of atencionesData) {
    const sexo = String(a.sexo);
    const depto = String(a.departamento).toUpperCase();
    const prov = String(a.provincia).toUpperCase();
    const año = Number(a.año);
    const mes = Number(a.mes);
    const uuid = String(a.uuid_hash);

    const tiempoId = dims.tiempo.get(`${año}-${mes}`);
    const geoId = dims.geo.get(`${depto}|${prov}`);
    const edad = uuidToEdad.get(uuid) || 0;
    const g10 = ageGroup10(edad);
    const pacienteId = dims.paciente.get(`${sexo}|${g10}`);

    if (tiempoId && geoId && pacienteId) {
      await olap`
        INSERT INTO fact_oncologia
          (uuid_hash, tiempo_id, geografia_id, paciente_id, fuente_id, edad, es_nuevo_caso)
        VALUES (${uuid}, ${tiempoId}, ${geoId}, ${pacienteId}, ${inenFuenteId}, ${edad || null}, TRUE)
      `;
      factsFromInen++;
    }
  }
  console.log(`   ${factsFromInen.toLocaleString()} hechos desde INEN`);

  // 8b. Hechos desde SINADEF (defunciones oncológicas)
  console.log("   Desde SINADEF (defunciones)...");
  
  const sinadefDeaths = await oltp`
    SELECT 
      p.sexo, p.ubigeo, p.departamento, p.provincia,
      d.cod_cie10,
      EXTRACT(YEAR FROM d.fecha_diagnostico)::int as año,
      EXTRACT(MONTH FROM d.fecha_diagnostico)::int as mes
    FROM diagnostico d
    JOIN paciente p ON d.paciente_id = p.id
    WHERE p.uuid_hash LIKE 'SINADEF-%'
  `;

  // Resolver dim_diagnostico IDs
  const diagDimRows = await olap`SELECT id, cod_cie10 FROM dim_diagnostico`;
  const diagIdMap = new Map<string, number>();
  for (const d of diagDimRows) diagIdMap.set(String(d.cod_cie10), Number(d.id));

  const sinaFuenteId = dims.fuente.get("SINADEF") || 2;
  let factsFromSina = 0;

  // Agregar grupos SINADEF a dim_paciente si no existen
  for (const sd of sinadefDeaths) {
    const sexo = String(sd.sexo);
    const g10 = "DESCONOCIDO"; // SINADEF age not in OLTP paciente table
    let pid = dims.paciente.get(`${sexo}|${g10}`);
    if (!pid) {
      await olap`
        INSERT INTO dim_paciente (sexo, grupo_etario_10, grupo_etario_20)
        VALUES (${sexo}, ${g10}, 'DESCONOCIDO')
        ON CONFLICT DO NOTHING
      `;
      const [newP] = await olap`
        SELECT id FROM dim_paciente WHERE sexo = ${sexo} AND grupo_etario_10 = ${g10} LIMIT 1
      `;
      pid = Number(newP?.id);
      dims.paciente.set(`${sexo}|${g10}`, pid);
    }
  }

  // Ahora insertar todos los facts de SINADEF en batch
  const geoDefaultId = dims.geo.get("LIMA|LIMA") || 1; // fallback
  const tiempoDefaultId = dims.tiempo.get("2023-1") || 1;
  const SINA_BATCH = 1000;

  type FactRow = [string, number, number, number, number, number];
  let batchRows: FactRow[] = [];

  const flushBatch = async () => {
    if (batchRows.length === 0) return;
    await olap`
      INSERT INTO fact_oncologia
        (uuid_hash, tiempo_id, geografia_id, paciente_id, diagnostico_id, fuente_id)
      VALUES ${olap(batchRows)}
      ON CONFLICT DO NOTHING
    `;
    batchRows = [];
  };

  for (const sd of sinadefDeaths) {
    const sexo = String(sd.sexo);
    const año = Number(sd.año);
    const mes = Number(sd.mes);
    const codCie = String(sd.cod_cie10);

    const g10 = "DESCONOCIDO";
    const pid = dims.paciente.get(`${sexo}|${g10}`) || 1;
    const did = diagIdMap.get(codCie) || 1;
    const tid = dims.tiempo.get(`${año}-${mes}`) || tiempoDefaultId;

    // Geografía desde departamento/provincia (capturados del CSV SINADEF)
    const depto = String(sd.departamento || "").toUpperCase().trim();
    const prov = String(sd.provincia || "").toUpperCase().trim();
    const gid = (depto && prov && dims.geo.get(`${depto}|${prov}`))
      || (depto && dims.geo.get(`${depto}|${depto}`))
      || geoDefaultId;

    if (pid && tid) {
      batchRows.push([`SIN-${factsFromSina}`, tid, gid, pid, did, sinaFuenteId]);
      factsFromSina++;
      if (batchRows.length >= SINA_BATCH) await flushBatch();
    }
  }
  await flushBatch();
  console.log(`   ${factsFromSina.toLocaleString()} hechos desde SINADEF\n`);

  // ── 9. Refrescar Data Marts ──
  console.log("🔄 Refrescando Data Marts...");
  await olap`REFRESH MATERIALIZED VIEW dm_geografia`;
  await olap`REFRESH MATERIALIZED VIEW dm_demografia`;
  await olap`REFRESH MATERIALIZED VIEW dm_temporal`;
  await olap`REFRESH MATERIALIZED VIEW dm_diagnostico`;
  console.log("   Data Marts actualizados\n");

  // ── 10. Resumen ──
  console.log("╔══════════════════════════════════════════╗");
  console.log("║         RESUMEN OLTP → OLAP              ║");
  console.log("╚══════════════════════════════════════════╝");

  const counts = [
    "dim_tiempo", "dim_geografia", "dim_paciente", "dim_diagnostico",
    "dim_establecimiento", "dim_fuente", "fact_oncologia", "poblacion",
    "dm_geografia", "dm_demografia", "dm_temporal", "dm_diagnostico"
  ];

  for (const table of counts) {
    try {
      const [r] = await olap.unsafe(`SELECT COUNT(*)::int as c FROM ${table}`);
      console.log(`   ${table}: ${r.c.toLocaleString()}`);
    } catch {
      console.log(`   ${table}: ❌`);
    }
  }

  const [factT] = await olap`SELECT COUNT(*)::int as c FROM fact_oncologia`;
  const [tiemT] = await olap`SELECT MIN(año) as min, MAX(año) as max FROM dim_tiempo t JOIN fact_oncologia f ON f.tiempo_id = t.id`;
  console.log(`\n📅 Rango: ${tiemT.min} - ${tiemT.max}`);
  console.log(`📊 Total hechos: ${factT.c.toLocaleString()}`);
  console.log("\n✅ ETL OLAP completado.");
}

main()
  .then(() => { oltp.end(); olap.end(); process.exit(0); })
  .catch((err) => { console.error("❌", err); oltp.end(); olap.end(); process.exit(1); });
