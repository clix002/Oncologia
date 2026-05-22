import { type NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { detectFilters, retrieveContext } from "@/lib/retrieval";
import {
  getRankingDepartamentos,
  resumenDepartamento,
  getDistribucionSexo,
  getCasosPorDeptoAnio,
  getProvincias,
  getTendenciaMensual,
} from "@/lib/stats";

const SYSTEM_PROMPT_TEMPLATE = `Eres un analista de inteligencia de negocios especializado en salud pública en Perú.
Analizas datos de casos oncológicos nuevos registrados en el INEN para [SCOPE_DESC] (2022-2025).

CONTEXTO RELEVANTE (recuperado por similitud semántica):
[CONTEXTO_RAG]

DATOS PRECISOS (consulta SQL):
[DATOS_SQL]

REGLAS:
1. Solo respondes sobre los datos disponibles. No inventes cifras.
2. Si el usuario pregunta por 2025, aclara que son datos parciales (hasta noviembre).
3. Siempre responde en español.
4. Si la pregunta puede visualizarse con una gráfica, inclúyela.
5. Los datos son de pacientes que llegaron al INEN (Lima), no todos los casos de cada departamento.
6. IMPORTANTE: Si hay un departamento de contexto ([SCOPE_DESC]), SOLO analiza datos de ese departamento. No menciones otros departamentos a menos que el usuario lo pida explícitamente.
7. Responde SIEMPRE en este formato JSON exacto:

{
  "texto": "Tu análisis aquí en 2-4 oraciones",
  "grafica": {
    "tipo": "bar" | "line" | "pie" | "area" | null,
    "titulo": "Título de la gráfica",
    "datos": [{ "nombre": "...", "valor": 0 }],
    "ejeX": "nombre del eje X",
    "ejeY": "nombre del eje Y"
  }
}

Si la pregunta no necesita gráfica, pon "grafica": null.`;

interface HistoryEntry {
	role: string;
	content: string;
}

interface ChatRequestBody {
	message: string;
	history?: HistoryEntry[];
	region?: string;
}

/** Detect intent from question text */
function detectIntent(q: string) {
	const lower = q.toLowerCase();
	const isSexo = /sexo|hombres?|mujeres?|masculin|femenin|género|genero|compara/.test(lower);
	const isTendencia = /tendencia|mensual|mes|evolución|evolucion|tiempo/.test(lower);
	const isProvincias = /provincia|distrito|ciudad|zona/.test(lower);
	const isRanking = /ranking|más casos|mayor|top|peor|mejor|departamento/.test(lower);
	const isAnio = /\b(202[0-9]|año|anual|por año)\b/.test(lower);
	return { isSexo, isTendencia, isProvincias, isRanking, isAnio };
}

/** Build chart data directly from SQL — reliable, no LLM needed */
async function buildChartFromSQL(
	intent: ReturnType<typeof detectIntent>,
	filters: { departamento?: string; año?: number },
): Promise<object | null> {
	try {
		if (intent.isSexo) {
			const rows = await getDistribucionSexo(filters.departamento, filters.año);
			if (rows.length === 0) return null;
			return {
				tipo: "pie",
				titulo: `Distribución por sexo${filters.departamento ? ` — ${filters.departamento}` : ""}`,
				datos: rows.map((r) => ({ nombre: r.sexo === "F" ? "Mujer" : r.sexo === "M" ? "Hombre" : r.sexo, valor: r.casos })),
				ejeX: "Sexo",
				ejeY: "Casos",
			};
		}

		if (intent.isTendencia && filters.departamento) {
			const año = filters.año ?? new Date().getFullYear() - 1;
			const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
			// Try monthly first; fall back to annual if insufficient data
			const monthly = await getTendenciaMensual(filters.departamento, año);
			if (monthly.length >= 3) {
				return {
					tipo: "line",
					titulo: `Tendencia mensual ${año} — ${filters.departamento}`,
					datos: monthly.map((r) => ({ nombre: meses[r.mes - 1] ?? String(r.mes), valor: r.casos })),
					ejeX: "Mes",
					ejeY: "Casos",
				};
			}
			// Fallback: annual trend
			const annual = await getCasosPorDeptoAnio(filters.departamento);
			if (annual.length === 0) return null;
			return {
				tipo: "area",
				titulo: `Tendencia anual — ${filters.departamento}`,
				datos: annual.map((r) => ({ nombre: String(r.año), valor: r.casos })),
				ejeX: "Año",
				ejeY: "Casos",
			};
		}

		if (intent.isProvincias && filters.departamento) {
			const rows = await getProvincias(filters.departamento, filters.año);
			if (rows.length === 0) return null;
			return {
				tipo: "bar",
				titulo: `Casos por provincia — ${filters.departamento}`,
				datos: rows.slice(0, 10).map((r) => ({ nombre: r.provincia, valor: r.casos })),
				ejeX: "Provincia",
				ejeY: "Casos",
			};
		}

		if (filters.departamento) {
			// Default for a region: cases by year
			const rows = await getCasosPorDeptoAnio(filters.departamento, filters.año);
			if (rows.length === 0) return null;
			return {
				tipo: "area",
				titulo: `Casos por año — ${filters.departamento}`,
				datos: rows.map((r) => ({ nombre: String(r.año), valor: r.casos })),
				ejeX: "Año",
				ejeY: "Casos",
			};
		}

		// National ranking
		const rows = await getRankingDepartamentos(filters.año);
		if (rows.length === 0) return null;
		return {
			tipo: "bar",
			titulo: `Top departamentos${filters.año ? ` (${filters.año})` : ""}`,
			datos: rows.slice(0, 10).map((r) => ({ nombre: r.departamento, valor: r.casos })),
			ejeX: "Departamento",
			ejeY: "Casos",
		};
	} catch {
		return null;
	}
}

export async function POST(request: NextRequest) {
	try {
		const body: ChatRequestBody = await request.json();
		const { message, history = [], region } = body;

		if (!message || typeof message !== "string" || message.trim() === "") {
			return NextResponse.json(
				{ error: "El campo 'message' es requerido" },
				{ status: 400 },
			);
		}

		// Bloquear intentos de enviar imágenes (gemma3:1b no es multimodal)
		if (message.includes("image.png") || message.includes("data:image") || message.includes("<image")) {
			return NextResponse.json({
				texto: "El modelo local (gemma3:1b) solo acepta texto, no imágenes. Escribí tu consulta en formato de texto.",
				grafica: null,
			});
		}

		const query = message.trim();

		// 1. Detectar filtros en la pregunta; region del mapa tiene prioridad
		const filters = detectFilters(query);
		if (region) {
			filters.departamento = region.toUpperCase();
		}
		const scopeDesc = filters.departamento
			? `el departamento de ${filters.departamento}`
			: "todos los departamentos del Perú";

		// 2. Recuperar contexto RAG
		let ragContext = "";
		try {
			const chunks = await retrieveContext(query, {
				topK: 8,
				departamento: filters.departamento,
				año: filters.año,
			});
			ragContext = chunks.map((c) => c.content).join("\n\n");
		} catch (ragErr) {
			console.warn("RAG retrieval failed, using fallback:", ragErr);
		}

		// 3. Obtener datos SQL precisos
		let sqlData = "";
		try {
			if (filters.departamento) {
				const resumen = await resumenDepartamento(filters.departamento);
				sqlData = JSON.stringify(resumen, null, 2);
			} else {
				const ranking = await getRankingDepartamentos(filters.año);
				sqlData = JSON.stringify({ ranking: ranking.slice(0, 10) }, null, 2);
			}
		} catch (sqlErr) {
			console.warn("SQL query failed:", sqlErr);
		}

		// 4. Construir prompt
		const systemPrompt = SYSTEM_PROMPT_TEMPLATE
			.replace(/\[SCOPE_DESC\]/g, scopeDesc)
			.replace("[CONTEXTO_RAG]", ragContext || "No se encontró contexto relevante.")
			.replace("[DATOS_SQL]", sqlData || "No disponible.");

		// 5. Llamar LLM
		const result = await callAI(systemPrompt, query, history);

		// 6. Build chart from SQL — always do it for chart-triggering intents;
		//    use LLM chart only if it has actual data points.
		const intent = detectIntent(query);
		const wantsChart = intent.isSexo || intent.isTendencia || intent.isProvincias || intent.isRanking || intent.isAnio
			|| /gr[áa]fica|gr[áa]fico|gr[áa]fic|chart|visual|mostr|dibuj/.test(query.toLowerCase());

		const llmGrafica = result.grafica as any;
		const llmHasData = Array.isArray(llmGrafica?.datos) && llmGrafica.datos.length > 0;

		if (!llmHasData && wantsChart) {
			const sqlChart = await buildChartFromSQL(intent, filters);
			if (sqlChart) result.grafica = sqlChart;
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error in /api/chat:", error);
		return NextResponse.json(
			{
				texto:
					"Ocurrió un error interno al procesar tu mensaje. Por favor intenta nuevamente.",
				grafica: null,
			},
			{ status: 500 },
		);
	}
}
