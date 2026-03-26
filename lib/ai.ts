import { GoogleGenerativeAI } from "@google/generative-ai";

interface AIResponse {
	texto: string;
	grafica: object | null;
}

interface HistoryEntry {
	role: string;
	content: string;
}

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
		generationConfig: {
			temperature: 0.4,
			maxOutputTokens: 2048,
		},
	});

	const result = await chat.sendMessage(userMessage);
	const text = result.response.text();
	if (!text) throw new Error("Gemini returned empty response");
	return text;
}

async function callClaude(
	systemPrompt: string,
	userMessage: string,
	history: HistoryEntry[],
): Promise<string> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

	const messages = [
		...history.map((e) => ({ role: e.role, content: e.content })),
		{ role: "user", content: userMessage },
	];

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
			messages,
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

export async function callAI(
	systemPrompt: string,
	userMessage: string,
	history: HistoryEntry[],
): Promise<AIResponse> {
	try {
		const raw = await callGemini(systemPrompt, userMessage, history);
		return parseAIResponse(raw);
	} catch (geminiError) {
		console.warn("Gemini failed, falling back to Claude:", geminiError);
	}

	try {
		const raw = await callClaude(systemPrompt, userMessage, history);
		return parseAIResponse(raw);
	} catch (claudeError) {
		console.error("Claude also failed:", claudeError);
	}

	return {
		texto:
			"Lo siento, hubo un error al procesar tu consulta. Por favor intenta nuevamente.",
		grafica: null,
	};
}
