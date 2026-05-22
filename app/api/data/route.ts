import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
	getCancerPorRegion,
	getCasosPorDeptoAnio,
	getCasosPorDeptoAnioFuente,
	getDistribucionEdad,
	getDistribucionSexo,
	getDpcanPorRegion,
	getProvincias,
	getRankingDepartamentos,
	getTasasMortalidad,
	getTendenciaMensual,
} from "@/lib/stats";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const depto = searchParams.get("depto")?.toUpperCase();
		const año = searchParams.get("año")
			? parseInt(searchParams.get("año")!, 10)
			: undefined;

		if (depto && depto !== "ALL") {
			const [porAño, porFuente, sexo, edad, provincias, mensual, tasasMortalidad, cancerPorRegion, dpcan] = await Promise.all([
				getCasosPorDeptoAnio(depto),
				getCasosPorDeptoAnioFuente(depto),
				getDistribucionSexo(depto, año),
				getDistribucionEdad(depto, año),
				getProvincias(depto, año),
				getTendenciaMensual(depto, año || 2024),
				getTasasMortalidad(depto),
				getCancerPorRegion(depto),
				getDpcanPorRegion(depto),
			]);

			return NextResponse.json({
				departamento: depto,
				por_año: porAño,
				por_fuente: porFuente,
				sexo,
				edad,
				provincias,
				mensual,
				tasas_mortalidad: tasasMortalidad,
				cancer_por_region: cancerPorRegion,
				dpcan,
			});
		}

		const ranking = await getRankingDepartamentos(año);
		const totalCasos = ranking.reduce((s, r) => s + r.casos, 0);

		return NextResponse.json({
			departamento: "PERU",
			total_casos: totalCasos,
			ranking,
			año: año || "todos",
		});
	} catch (error) {
		console.error("Error in /api/data:", error);
		return NextResponse.json(
			{ error: "No se pudieron cargar los datos" },
			{ status: 500 },
		);
	}
}
