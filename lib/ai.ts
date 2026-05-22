interface AIResponse {
  texto: string;
  grafica: object | null;
}

interface HistoryEntry {
  role: string;
  content: string;
}

// ── Ollama (local) ──

async function callOllama(
  systemPrompt: string,
  userMessage: string,
  history: HistoryEntry[],
): Promise<string> {
  const host = process.env.OLLAMA_HOST || "http://localhost:11435";
  const model = process.env.OLLAMA_MODEL || "gemma3:1b";

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((e) => ({
      role: e.role === "assistant" ? "assistant" : "user",
      content: e.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string = data?.message?.content ?? "";
  if (!text) throw new Error("Ollama returned empty response");
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
    const raw = await callOllama(systemPrompt, userMessage, history);
    return parseAIResponse(raw);
  } catch (err) {
    console.warn("Ollama failed:", (err as Error).message);
  }

  return {
    texto:
      "Lo siento, el modelo de IA no está disponible. Iniciá Ollama con: podman start oncologia-ollama",
    grafica: null,
  };
}
