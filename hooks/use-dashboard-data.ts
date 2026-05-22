"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

	// Ref para evitar que fetches stale sobreescriban el estado
	const nationalFetchId = useRef(0);
	const dataFetchId = useRef(0);

	// Nacional: solo se vuelve a fetchear si cambia `year` — nunca por región
	useEffect(() => {
		const id = ++nationalFetchId.current;
		const params = year ? `?año=${year}` : "";
		fetch(`/api/data${params}`)
			.then((r) => r.ok ? r.json() : null)
			.then((json) => {
				if (json && id === nationalFetchId.current) setNational(json);
			})
			.catch(() => {});
	}, [year]);

	// Departamento: se fetchea cuando cambia región
	const fetchData = useCallback(async () => {
		const id = ++dataFetchId.current;
		setLoading(true);
		setError(null);
		try {
			if (region) {
				const params = new URLSearchParams({ depto: region });
				if (year) params.set("año", String(year));
				const res = await fetch(`/api/data?${params}`);
				if (!res.ok) throw new Error("Error cargando datos");
				const json = await res.json();
				if (id !== dataFetchId.current) return;
				setData({
					departamento: json.departamento,
					por_año: json.por_año || [],
					por_fuente: json.por_fuente || [],
					sexo: json.sexo || [],
					edad: json.edad || [],
					provincias: json.provincias || [],
					mensual: json.mensual || [],
					tasas_mortalidad: json.tasas_mortalidad || [],
					cancer_por_region: json.cancer_por_region || [],
				});
			} else {
				if (id !== dataFetchId.current) return;
				setData(null);
			}
		} catch (e) {
			if (id === dataFetchId.current)
				setError(e instanceof Error ? e.message : "Error desconocido");
		} finally {
			if (id === dataFetchId.current) setLoading(false);
		}
	}, [region, year]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return { data, national, loading, error };
}
