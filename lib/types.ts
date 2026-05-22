export interface CasosPorAnio {
	año: number;
	casos: number;
}

export interface CasosPorAnioFuente {
	año: number;
	fuente: string;
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

export interface TasaMortalidad {
	año: number;
	sexo: "Hombre" | "Mujer" | "Total";
	ndefun: number;
	tasa_bruta: number | null;
	tasa_ajust: number | null;
}

export interface CancerPorRegion {
	cod_cie10: string;
	tipo: string;
	casos: number;
}

export interface DpcanPorRegion {
	tipo_cancer: string;
	año: number;
	num: number;
	den: number;
	cobertura_pct: number;
}

export interface DashboardData {
	departamento: string;
	por_año: CasosPorAnio[];
	por_fuente: CasosPorAnioFuente[];
	sexo: DistribucionSexo[];
	edad: DistribucionEdad[];
	provincias: Provincia[];
	mensual: TendenciaMensual[];
	tasas_mortalidad?: TasaMortalidad[];
	cancer_por_region?: CancerPorRegion[];
	dpcan?: DpcanPorRegion[];
}

export interface NationalData {
	departamento: "PERU";
	total_casos: number;
	ranking: RankingDepto[];
	año: number | "todos";
}


