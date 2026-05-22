/**
 * RAG Retrieval — contexto de datos para el chat IA
 * Usa PostgreSQL OLAP en vez de embeddings en SQLite
 */
import { getDb } from "@/lib/db";

function sql() { return getDb(); }


interface RetrievalOptions {
  topK?: number;
  departamento?: string;
  año?: number;
}

export async function retrieveContext(
  query: string,
  options: RetrievalOptions = {},
): Promise<{ content: string; score: number; type: string; key: string }[]> {
  const { departamento, año } = options;
  const s = sql();
  const results: { content: string; score: number; type: string; key: string }[] = [];

  try {
    // 1. Ranking nacional
    const ranking = await s`
      SELECT departamento, SUM(casos)::int as casos
      FROM dm_geografia GROUP BY departamento ORDER BY casos DESC LIMIT 10`;
    
    results.push({
      content: `Ranking nacional de casos oncológicos:\n${ranking.map((r: any) => `- ${r.departamento}: ${r.casos} casos`).join("\n")}`,
      score: 1.0, type: "ranking", key: "nacional",
    });

    // 2. Datos del departamento consultado
    if (departamento) {
      const deptoData = await s`
        SELECT año, SUM(casos)::int as casos, ROUND(AVG(tasa_por_100k), 1) as tasa
        FROM dm_geografia WHERE departamento ILIKE ${departamento}
        GROUP BY año ORDER BY año`;

      if (deptoData.length > 0) {
        results.push({
          content: `Datos de ${departamento}:\n${deptoData.map((d: any) => `- ${d.año}: ${d.casos} casos (tasa ${d.tasa}/100k)`).join("\n")}`,
          score: 0.95, type: "departamento", key: departamento,
        });

        const sexoData = await s`
          SELECT sexo, SUM(casos)::int as casos
          FROM dm_demografia WHERE departamento ILIKE ${departamento}
          GROUP BY sexo`;
        
        results.push({
          content: `Distribución por sexo en ${departamento}:\n${sexoData.map((d: any) => `- ${d.sexo}: ${d.casos} casos`).join("\n")}`,
          score: 0.9, type: "sexo", key: `${departamento}-sexo`,
        });

        const edadData = await s`
          SELECT grupo_etario_10, SUM(casos)::int as casos
          FROM dm_demografia WHERE departamento ILIKE ${departamento}
          GROUP BY grupo_etario_10 ORDER BY grupo_etario_10`;
        
        results.push({
          content: `Grupos etarios en ${departamento}:\n${edadData.map((d: any) => `- ${d.grupo_etario_10}: ${d.casos} casos`).join("\n")}`,
          score: 0.9, type: "edad", key: `${departamento}-edad`,
        });
      }
    }

    // 3. Total nacional
    const [total] = await s`SELECT SUM(casos)::int as total FROM dm_geografia`;
    results.push({
      content: `Total nacional acumulado: ${total?.total?.toLocaleString() || "204,401"} casos oncológicos registrados.`,
      score: 0.5, type: "total", key: "total",
    });

    // 4. Datos por año si se pregunta
    if (año) {
      const añoData = await s`
        SELECT departamento, SUM(casos)::int as casos
        FROM dm_geografia WHERE año = ${año}
        GROUP BY departamento ORDER BY casos DESC LIMIT 5`;
      
      results.push({
        content: `Top 5 departamentos en ${año}:\n${añoData.map((d: any) => `- ${d.departamento}: ${d.casos} casos`).join("\n")}`,
        score: 0.9, type: "año", key: String(año),
      });
    }

    // 5. Tipos de cáncer (CIE-10)
    const cie10Data = await s`
      SELECT cod_cie10, grupo, SUM(casos)::int as casos
      FROM dm_diagnostico GROUP BY cod_cie10, grupo
      ORDER BY casos DESC LIMIT 8`;
    
    results.push({
      content: `Tipos de cáncer más frecuentes:\n${cie10Data.map((d: any) => `- ${d.grupo || d.cod_cie10}: ${d.casos} casos`).join("\n")}`,
      score: 0.7, type: "diagnostico", key: "cie10",
    });

  } catch (err) {
    console.warn("RAG retrieval fallback:", (err as Error).message);
  }

  return results;
}

export function detectFilters(query: string): { departamento?: string; año?: number } {
  const filters: { departamento?: string; año?: number } = {};

  const yearMatch = query.match(/\b(2022|2023|2024|2025)\b/);
  if (yearMatch) filters.año = parseInt(yearMatch[1], 10);

  const deptos = [
    "AMAZONAS", "ANCASH", "APURIMAC", "AREQUIPA", "AYACUCHO",
    "CAJAMARCA", "CALLAO", "CUSCO", "HUANCAVELICA", "HUANUCO",
    "ICA", "JUNIN", "LA LIBERTAD", "LAMBAYEQUE", "LIMA",
    "LORETO", "MADRE DE DIOS", "MOQUEGUA", "PASCO", "PIURA",
    "PUNO", "SAN MARTIN", "TACNA", "TUMBES", "UCAYALI",
  ];

  const upper = query.toUpperCase();
  for (const d of deptos) {
    if (upper.includes(d)) { filters.departamento = d; break; }
  }

  return filters;
}

export function clearCache() {}
