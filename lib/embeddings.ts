/**
 * Wrapper para Google Embedding API (gemini-embedding-001)
 * Usa la misma SDK @google/generative-ai que ya tenemos
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-embedding-001";
const DIMENSIONS = 768;

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
	if (!client) {
		const key = process.env.GEMINI_API_KEY;
		if (!key) throw new Error("GEMINI_API_KEY no configurada");
		client = new GoogleGenerativeAI(key);
	}
	return client;
}

/**
 * Genera embedding para un texto con retry
 */
export async function embedText(text: string): Promise<Float32Array> {
	const model = getClient().getGenerativeModel({ model: MODEL });
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const result = await model.embedContent(text);
			return new Float32Array(result.embedding.values);
		} catch (err: any) {
			if (err?.status === 429 && attempt < 2) {
				const wait = (attempt + 1) * 30_000;
				console.log(`  Rate limit, esperando ${wait / 1000}s...`);
				await new Promise((r) => setTimeout(r, wait));
				continue;
			}
			throw err;
		}
	}
	throw new Error("embedText: max retries");
}

/**
 * Genera embeddings para múltiples textos (secuencial, respeta 100 RPM)
 */
export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
	const model = getClient().getGenerativeModel({ model: MODEL });
	const results: Float32Array[] = [];

	// Procesar de a 20 para no pasar 100 RPM
	const BATCH_SIZE = 20;
	for (let i = 0; i < texts.length; i += BATCH_SIZE) {
		const batch = texts.slice(i, i + BATCH_SIZE);
		const batchNum = Math.floor(i / BATCH_SIZE) + 1;
		const totalBatches = Math.ceil(texts.length / BATCH_SIZE);

		console.log(
			`  Batch ${batchNum}/${totalBatches} (${batch.length} textos)...`,
		);

		for (const text of batch) {
			for (let attempt = 0; attempt < 3; attempt++) {
				try {
					const result = await model.embedContent(text);
					results.push(new Float32Array(result.embedding.values));
					break;
				} catch (err: any) {
					if (err?.status === 429 && attempt < 2) {
						const wait = (attempt + 1) * 30_000;
						console.log(`    Rate limit, esperando ${wait / 1000}s...`);
						await new Promise((r) => setTimeout(r, wait));
						continue;
					}
					throw err;
				}
			}
		}

		// Pausa entre batches para respetar RPM
		if (i + BATCH_SIZE < texts.length) {
			await new Promise((r) => setTimeout(r, 15_000));
		}
	}

	return results;
}

/**
 * Cosine similarity entre dos vectores
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { DIMENSIONS };
