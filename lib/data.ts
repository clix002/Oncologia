import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRankingDepartamentos, resumenDepartamento } from "./stats";

let cachedData: object | null = null;

/**
 * Datos de Ayacucho desde JSON (fallback/legacy)
 */
export async function getAyacuchoData(): Promise<object> {
	if (cachedData) return cachedData;

	const filePath = path.join(process.cwd(), "app/data/processed/ayacucho.json");

	const raw = await readFile(filePath, "utf-8");
	cachedData = JSON.parse(raw) as object;
	return cachedData;
}

/**
 * Datos de cualquier departamento desde DB
 */
export async function getDepartamentoData(departamento: string) {
	return resumenDepartamento(departamento);
}

/**
 * Ranking nacional desde DB
 */
export async function getNacionalData(año?: number) {
	return getRankingDepartamentos(año);
}
