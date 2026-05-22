interface AIResponse {
  texto: string;
  grafica: object | null;
}

interface HistoryEntry {
  role: string;
  content: string;
}

// ── Gemini ──

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: HistoryEntry[],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const contents = [
    ...history.map((e) => ({
      role: e.role === "assistant" ? "model" : "user",
      parts: [{ text: e.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

// ── Parser ──

function parseAIResponse(raw: string): AIResponse {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/m, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      texto: typeof parsed.texto === "string" ? parsed.texto : raw,
      grafica: parsed.grafica ?? null,
    };
  } catch {
    return { texto: raw, grafica: null };
  }
}

// ── Orquestador ──

export async function callAI(
  systemPrompt: string,
  userMessage: string,
  history: HistoryEntry[],
): Promise<AIResponse> {
  try {
    const raw = await callGemini(systemPrompt, userMessage, history);
    return parseAIResponse(raw);
  } catch (err) {
    console.warn("Gemini failed:", (err as Error).message);
  }

  return {
    texto:
      "Lo siento, el modelo de IA no está disponible. Verificá que GEMINI_API_KEY esté configurada.",
    grafica: null,
  };
}
