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
	departamento: "PERU";
	total_casos: number;
	ranking: RankingDepto[];
	año: number | "todos";
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
