"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardData, NationalData } from "@/lib/types";

interface UseDashboardResult {
	data: DashboardData | null;
	national: NationalData | null;
	loading: boolean;
	error: string | null;
}

export function useDashboardData(
	region: string | null,
	year?: number,
): UseDashboardResult {
	const [data, setData] = useState<DashboardData | null>(null);
	const [national, setNational] = useState<NationalData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			if (region) {
				const params = new URLSearchParams({ depto: region });
				if (year) params.set("año", String(year));
				const res = await fetch(`/api/data?${params}`);
				if (!res.ok) throw new Error("Error cargando datos");
				const json = await res.json();
				setData({
					departamento: json.departamento,
					por_año: json.por_año || [],
					sexo: json.sexo || [],
					edad: json.edad || [],
					provincias: json.provincias || [],
					mensual: json.mensual || [],
				});
			} else {
				const params = year ? `?año=${year}` : "";
				const res = await fetch(`/api/data${params}`);
				if (!res.ok) throw new Error("Error cargando datos");
				const json = await res.json();
				setNational(json);
				setData(null);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Error desconocido");
		} finally {
			setLoading(false);
		}
	}, [region, year]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return { data, national, loading, error };
}
