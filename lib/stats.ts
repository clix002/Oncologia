/**
 * Módulo de análisis estadístico — PostgreSQL OLAP
 * Reescrito para la nueva arquitectura containerizada
 */
import postgres from "postgres";
import * as ss from "simple-statistics";

function getSql() {
  return postgres({
    host: process.env.POSTGRES_OLAP_HOST || "localhost",
    port: Number(process.env.POSTGRES_OLAP_PORT) || 5434,
    database: process.env.POSTGRES_OLAP_DB || "oncologia_olap",
    username: process.env.POSTGRES_OLAP_USER || "oncologia",
    password: process.env.POSTGRES_OLAP_PASSWORD || "oncologia_dev_2026",
    max: 10,
  });
}

let _sql: ReturnType<typeof getSql> | null = null;
function sql() {
  if (!_sql) _sql = getSql();
  return _sql;
}

// ── Queries ──

export async function getCasosPorDeptoAnio(departamento: string, año?: number) {
  const s = sql();
  const rows = año
    ? await s`
        SELECT año, SUM(casos)::int as casos
        FROM dm_geografia
        WHERE departamento ILIKE ${departamento} AND año = ${año}
        GROUP BY año ORDER BY año`
    : await s`
        SELECT año, SUM(casos)::int as casos
        FROM dm_geografia
        WHERE departamento ILIKE ${departamento}
        GROUP BY año ORDER BY año`;
  return rows.map((r: any) => ({ año: Number(r.año), casos: Number(r.casos) }));
}

/**
 * Retorna casos por año desglosados por fuente (INEN, SINADEF, etc.).
 * Útil para el forecast: permite usar solo atenciones (INEN) o solo
 * defunciones (SINADEF) en lugar de mezclarlas en una misma serie.
 */
export async function getCasosPorDeptoAnioFuente(departamento: string) {
  const s = sql();
  const rows = await s`
    SELECT año, fuente, SUM(casos)::int as casos
    FROM dm_geografia
    WHERE departamento ILIKE ${departamento}
    GROUP BY año, fuente
    ORDER BY fuente, año`;
  return rows.map((r: any) => ({
    año: Number(r.año),
    fuente: String(r.fuente),
    casos: Number(r.casos),
  }));
}

export async function getTasaIncidencia(departamento: string) {
  const s = sql();
  const rows = await s`
    SELECT año, SUM(casos)::int as casos,
           MAX(poblacion) as poblacion,
           ROUND(AVG(tasa_por_100k), 2) as tasa
    FROM dm_geografia
    WHERE departamento ILIKE ${departamento}
    GROUP BY año ORDER BY año`;
  return rows.map((r: any) => ({
    año: Number(r.año),
    casos: Number(r.casos),
    poblacion: Number(r.poblacion || 0),
    tasa: Number(r.tasa || 0),
  }));
}

export async function getDistribucionSexo(departamento?: string, año?: number) {
  const s = sql();
  const rows = await s`
    SELECT sexo, SUM(casos)::int as casos
    FROM dm_demografia
    WHERE 1=1
    ${departamento ? s`AND departamento ILIKE ${departamento}` : s``}
    ${año ? s`AND año = ${año}` : s``}
    GROUP BY sexo`;
  return rows.map((r: any) => ({ sexo: String(r.sexo), casos: Number(r.casos) }));
}

export async function getDistribucionEdad(departamento?: string, año?: number) {
  const s = sql();
  const rows = await s`
    SELECT grupo_etario_10 as grupo_etario, SUM(casos)::int as casos
    FROM dm_demografia
    WHERE grupo_etario_10 != 'DESCONOCIDO'
    ${departamento ? s`AND departamento ILIKE ${departamento}` : s``}
    ${año ? s`AND año = ${año}` : s``}
    GROUP BY grupo_etario_10 ORDER BY grupo_etario_10`;
  return rows.map((r: any) => ({
    grupo_etario: String(r.grupo_etario),
    casos: Number(r.casos),
  }));
}

export async function getRankingDepartamentos(año?: number) {
  const s = sql();
  const rows = await s`
    SELECT departamento, SUM(casos)::int as casos
    FROM dm_geografia
    ${año ? s`WHERE año = ${año}` : s``}
    GROUP BY departamento ORDER BY casos DESC`;
  return rows.map((r: any) => ({
    departamento: String(r.departamento),
    casos: Number(r.casos),
  }));
}

export async function getTendenciaMensual(departamento: string, año: number) {
  const s = sql();
  const rows = await s`
    SELECT mes, SUM(casos)::int as casos
    FROM dm_geografia
    WHERE departamento ILIKE ${departamento} AND año = ${año}
    GROUP BY mes ORDER BY mes`;
  return rows.map((r: any) => ({ mes: Number(r.mes), casos: Number(r.casos) }));
}

export async function getProvincias(departamento: string, año?: number) {
  const s = sql();
  const rows = await s`
    SELECT provincia, SUM(casos)::int as casos
    FROM dm_geografia
    WHERE departamento ILIKE ${departamento}
    ${año ? s`AND año = ${año}` : s``}
    GROUP BY provincia ORDER BY casos DESC`;
  return rows.map((r: any) => ({
    provincia: String(r.provincia),
    casos: Number(r.casos),
  }));
}

// ── Análisis estadístico ──

export async function calcularTendencia(departamento: string) {
  const datos = await getTasaIncidencia(departamento);
  if (datos.length < 2) return null;

  const points: [number, number][] = datos
    .filter((d) => d.tasa > 0)
    .map((d) => [d.año, d.tasa]);
  if (points.length < 2) return null;

  const regression = ss.linearRegression(points);
  const line = ss.linearRegressionLine(regression);
  const rSquared = ss.rSquared(points, line);
  const tasas = points.map((p) => p[1]);

  return {
    pendiente: Math.round(regression.m * 100) / 100,
    intercepto: Math.round(regression.b * 100) / 100,
    r_cuadrado: Math.round(rSquared * 1000) / 1000,
    tendencia: regression.m > 0.5 ? "creciente" : regression.m < -0.5 ? "decreciente" : "estable",
    media_tasa: Math.round(ss.mean(tasas) * 100) / 100,
    desviacion: Math.round(ss.standardDeviation(tasas) * 100) / 100,
    datos: datos.map((d) => ({
      año: d.año,
      casos: d.casos,
      tasa: d.tasa,
      tasa_proyectada: Math.round(line(d.año) * 100) / 100,
    })),
  };
}

export async function getTasasMortalidad(departamento: string) {
  const s = sql();
  // Normaliza "#PERU" → "PERU" en la tabla; el frontend pasa "PERU" o un depto
  const depto = departamento.toUpperCase() === "ALL" ? "PERU" : departamento.toUpperCase();
  const rows = await s`
    SELECT año, sexo, ndefun,
           tasa_bruta::float  AS tasa_bruta,
           tasa_ajust::float  AS tasa_ajust
    FROM fact_tasas_mortalidad
    WHERE departamento = ${depto}
    ORDER BY año, sexo
  `;
  return rows.map((r: any) => ({
    año: Number(r.año),
    sexo: String(r.sexo) as "Hombre" | "Mujer" | "Total",
    ndefun: Number(r.ndefun),
    tasa_bruta: r.tasa_bruta != null ? Number(r.tasa_bruta) : null,
    tasa_ajust: r.tasa_ajust != null ? Number(r.tasa_ajust) : null,
  }));
}

export async function resumenDepartamento(departamento: string) {
  const [por_año, por_fuente, sexo, edad, provincias, tendencia] = await Promise.all([
    getCasosPorDeptoAnio(departamento),
    getCasosPorDeptoAnioFuente(departamento),
    getDistribucionSexo(departamento),
    getDistribucionEdad(departamento),
    getProvincias(departamento),
    calcularTendencia(departamento),
  ]);

  return {
    departamento,
    total_casos: por_año.reduce((s, a) => s + a.casos, 0),
    por_año,
    por_fuente,
    sexo,
    edad,
    provincias,
    tendencia,
  };
}

// Mapa CIE-10 → nombre legible
const CIE10_NOMBRES: Record<string, string> = {
  C169: "Estómago", C349: "Pulmón", C509: "Mama", C539: "Cuello uterino",
  C61X: "Próstata", C189: "Colon", C259: "Páncreas", C229: "Hígado",
  C64X: "Riñón", C719: "Cerebro", C56X: "Ovario", C859: "Linfoma no Hodgkin",
  C900: "Mieloma múltiple", C250: "Páncreas (cabeza)", C180: "Colon (ciego)",
  C679: "Vejiga", C159: "Esófago", C809: "Primario desconocido",
  C329: "Laringe", C530: "Cuello uterino (endocérvix)", C910: "Leucemia linfoide",
  C920: "Leucemia mieloide", C73X: "Tiroides", C499: "Tejido blando",
  C449: "Piel (melanoma)", C209: "Recto", C199: "Unión recto-sigma",
};

function cie10Label(cod: string): string {
  const key = cod.replace(/\s/g, "").toUpperCase();
  return CIE10_NOMBRES[key] ?? cod;
}

export async function getCancerPorRegion(departamento: string): Promise<
  { tipo: string; cod_cie10: string; casos: number }[]
> {
  const s = sql();
  const rows = await s`
    SELECT dd.cod_cie10, COUNT(*) AS casos
    FROM fact_oncologia fo
    JOIN dim_diagnostico dd ON fo.diagnostico_id = dd.id
    JOIN dim_geografia dg ON fo.geografia_id = dg.id
    WHERE UPPER(dg.departamento) = UPPER(${departamento})
      AND dd.cod_cie10 IS NOT NULL
    GROUP BY dd.cod_cie10
    ORDER BY casos DESC
    LIMIT 15
  `;
  return rows.map((r) => ({
    cod_cie10: String(r.cod_cie10),
    tipo: cie10Label(String(r.cod_cie10)),
    casos: Number(r.casos),
  }));
}
