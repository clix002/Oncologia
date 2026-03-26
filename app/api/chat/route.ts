import { type NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { detectFilters, retrieveContext } from "@/lib/retrieval";
import { getRankingDepartamentos, resumenDepartamento } from "@/lib/stats";

const SYSTEM_PROMPT_TEMPLATE = `Eres un analista de inteligencia de negocios especializado en salud pública en Perú.
Analizas datos de casos oncológicos nuevos registrados en el INEN para todos los departamentos del Perú (2022-2025).

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
6. Responde SIEMPRE en este formato JSON exacto:

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
}

export async function POST(request: NextRequest) {
	try {
		const body: ChatRequestBody = await request.json();
		const { message, history = [] } = body;

		if (!message || typeof message !== "string" || message.trim() === "") {
			return NextResponse.json(
				{ error: "El campo 'message' es requerido" },
				{ status: 400 },
			);
		}

		const query = message.trim();

		// 1. Detectar filtros en la pregunta
		const filters = detectFilters(query);

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
		const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
			"[CONTEXTO_RAG]",
			ragContext || "No se encontró contexto relevante.",
		).replace("[DATOS_SQL]", sqlData || "No disponible.");

		// 5. Llamar LLM
		const result = await callAI(systemPrompt, query, history);

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
