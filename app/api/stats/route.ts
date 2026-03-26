import { type NextRequest, NextResponse } from "next/server";
import {
	calcularTendencia,
	getRankingDepartamentos,
	getTasaIncidencia,
	resumenDepartamento,
} from "@/lib/stats";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const depto = searchParams.get("depto")?.toUpperCase();
		const metric = searchParams.get("metric");
		const año = searchParams.get("año")
			? parseInt(searchParams.get("año")!, 10)
			: undefined;

		if (!depto && !metric) {
			return NextResponse.json(
				{ error: "Parámetro 'depto' o 'metric' requerido" },
				{ status: 400 },
			);
		}

		if (metric === "ranking") {
			return NextResponse.json(await getRankingDepartamentos(año));
		}

		if (!depto) {
			return NextResponse.json(
				{ error: "Parámetro 'depto' requerido para esta consulta" },
				{ status: 400 },
			);
		}

		if (metric === "tendencia") {
			const tendencia = await calcularTendencia(depto);
			if (!tendencia) {
				return NextResponse.json(
					{ error: `No hay datos suficientes para tendencia de ${depto}` },
					{ status: 404 },
				);
			}
			return NextResponse.json(tendencia);
		}

		if (metric === "tasa") {
			return NextResponse.json(await getTasaIncidencia(depto));
		}

		return NextResponse.json(await resumenDepartamento(depto));
	} catch (error) {
		console.error("Error in /api/stats:", error);
		return NextResponse.json(
			{ error: "Error al calcular estadísticas" },
			{ status: 500 },
		);
	}
}
