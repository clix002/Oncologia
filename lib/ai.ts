import { GoogleGenerativeAI } from "@google/generative-ai";

interface AIResponse {
  texto: string;
  grafica: object | null;
}

interface HistoryEntry {
  role: string;
  content: string;
}

// ── Ollama (local, siempre disponible) ──

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

// ── Gemini (cloud, si hay API key) ──

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: HistoryEntry[],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    systemInstruction: systemPrompt,
  });

  const chatHistory = history.map((entry) => ({
    role: entry.role === "assistant" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));

  const chat = model.startChat({
    history: chatHistory,
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  });

  const result = await chat.sendMessage(userMessage);
  const text = result.response.text();
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

// ── Claude (cloud, si hay API key) ──

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  history: HistoryEntry[],
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...history.map((e) => ({ role: e.role, content: e.content })),
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string = data?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Claude returned empty response");
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

// ── Orquestador: Ollama local → Gemini → Claude ──

export async function callAI(
  systemPrompt: string,
  userMessage: string,
  history: HistoryEntry[],
): Promise<AIResponse> {
  // 1. Intentar Ollama local (si el servicio está corriendo)
  try {
    const raw = await callOllama(systemPrompt, userMessage, history);
    return parseAIResponse(raw);
  } catch (ollamaError) {
    console.warn("Ollama failed:", (ollamaError as Error).message);
  }

  // 2. Intentar Gemini cloud (si hay API key)
  try {
    const raw = await callGemini(systemPrompt, userMessage, history);
    return parseAIResponse(raw);
  } catch (geminiError) {
    console.warn("Gemini failed:", (geminiError as Error).message);
  }

  // 3. Intentar Claude cloud (si hay API key)
  try {
    const raw = await callClaude(systemPrompt, userMessage, history);
    return parseAIResponse(raw);
  } catch (claudeError) {
    console.warn("Claude failed:", (claudeError as Error).message);
  }

  return {
    texto:
      "Lo siento, ningún modelo de IA está disponible. Inicia Ollama con: podman start oncologia-ollama",
    grafica: null,
  };
}
