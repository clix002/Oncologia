/**
 * Embeddings via Ollama (nomic-embed-text — local)
 */

const MODEL = "nomic-embed-text";
const DIMENSIONS = 768;
const HOST = process.env.OLLAMA_HOST || "http://localhost:11435";

export async function embedText(text: string): Promise<Float32Array> {
	const response = await fetch(`${HOST}/api/embed`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model: MODEL, input: text }),
	});

	if (!response.ok) {
		throw new Error(`Ollama embed error ${response.status}: ${await response.text()}`);
	}

	const data = await response.json();
	const values: number[] = data?.embeddings?.[0] ?? [];
	if (!values.length) throw new Error("embedText: empty embedding");
	return new Float32Array(values);
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
	return Promise.all(texts.map(embedText));
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
	let dot = 0, normA = 0, normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { DIMENSIONS };
