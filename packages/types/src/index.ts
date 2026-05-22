// ── Tipos compartidos entre frontend y ETL ──

export interface CasosPorAnio {
  año: number;
  casos: number;
}

export interface DistribucionSexo {
  sexo: string;
  casos: number;
}

export interface DistribucionEdad {
  grupo_etario: string;
  casos: number;
}

export interface Provincia {
  provincia: string;
  casos: number;
}

export interface TendenciaMensual {
  mes: number;
  casos: number;
}

export interface RankingDepto {
  departamento: string;
  casos: number;
}

export interface DashboardData {
  departamento: string;
  por_año: CasosPorAnio[];
  sexo: DistribucionSexo[];
  edad: DistribucionEdad[];
  provincias: Provincia[];
  mensual: TendenciaMensual[];
}

export interface NationalData {
  departamento: string;
  total_casos: number;
  ranking: RankingDepto[];
  año?: string;
}

export interface TendenciaStats {
  pendiente: number;
  intercepto: number;
  r_cuadrado: number;
  tendencia: "creciente" | "decreciente" | "estable";
  media_tasa: number;
  desviacion: number;
  datos: {
    año: number;
    casos: number;
    tasa: number;
    tasa_proyectada: number;
  }[];
}

export interface GraficaData {
  tipo: "bar" | "line" | "pie" | "area" | null;
  titulo: string;
  datos: { nombre: string; valor: number }[];
  ejeX: string;
  ejeY: string;
}

export interface ChatResponse {
  texto: string;
  grafica?: GraficaData;
}

export interface FuenteDato {
  id: number;
  nombre: string;
  archivo_origen: string;
  fecha_carga: Date;
  registros: number;
}

export interface DataQualityResult {
  tabla: string;
  columna: string;
  regla: string;
  ok: number;
  fail: number;
  pct: number;
}
