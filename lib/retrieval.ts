/**
 * RAG Retrieval: búsqueda vectorial por cosine similarity
 */

import path from "node:path";
import { createClient } from "@libsql/client";
import { cosineSimilarity, embedText } from "./embeddings";

interface StoredChunk {
	id: number;
	chunk_type: string;
	chunk_key: string;
	content: string;
	embedding: Float32Array;
	metadata: Record<string, unknown>;
}

let cachedChunks: StoredChunk[] | null = null;

function getDbUrl(): string {
	if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
	const dbPath = path.resolve(
		process.cwd(),
		process.env.DB_PATH || "data/oncologia.db",
	);
	return `file:${dbPath}`;
}

/**
 * Carga todos los embeddings de la DB en memoria
 */
async function loadChunks(): Promise<StoredChunk[]> {
	if (cachedChunks) return cachedChunks;

	const db = createClient({
		url: getDbUrl(),
		authToken: process.env.TURSO_AUTH_TOKEN,
	});

	const result = await db.execute(
		"SELECT id, chunk_type, chunk_key, content, embedding, metadata_json FROM embeddings WHERE embedding IS NOT NULL",
	);

	cachedChunks = result.rows.map((row) => {
		const embBuffer = row.embedding as ArrayBuffer;
		return {
			id: Number(row.id),
			chunk_type: String(row.chunk_type),
			chunk_key: String(row.chunk_key),
			content: String(row.content),
			embedding: new Float32Array(embBuffer),
			metadata: row.metadata_json ? JSON.parse(String(row.metadata_json)) : {},
		};
	});

	console.log(`[RAG] ${cachedChunks.length} chunks cargados en memoria`);
	return cachedChunks;
}

interface RetrievalOptions {
	topK?: number;
	departamento?: string;
	año?: number;
	chunkTypes?: string[];
}

/**
 * Busca los chunks más relevantes para una pregunta
 */
export async function retrieveContext(
	query: string,
	options: RetrievalOptions = {},
): Promise<{ content: string; score: number; type: string; key: string }[]> {
	const { topK = 8, departamento, año, chunkTypes } = options;

	const chunks = await loadChunks();
	if (chunks.length === 0) return [];

	const queryEmbedding = await embedText(query);

	let scored = chunks.map((chunk) => ({
		content: chunk.content,
		score: cosineSimilarity(queryEmbedding, chunk.embedding),
		type: chunk.chunk_type,
		key: chunk.chunk_key,
		metadata: chunk.metadata,
	}));

	// Boost si coincide el departamento o año
	if (departamento) {
		scored = scored.map((s) => ({
			...s,
			score:
				(s.metadata as any).departamento === departamento
					? s.score * 1.3
					: s.score,
		}));
	}

	if (año) {
		scored = scored.map((s) => ({
			...s,
			score: (s.metadata as any).año === año ? s.score * 1.2 : s.score,
		}));
	}

	if (chunkTypes && chunkTypes.length > 0) {
		scored = scored.filter((s) => chunkTypes.includes(s.type));
	}

	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, topK);
}

/**
 * Detectar departamento y año mencionados en la pregunta
 */
export function detectFilters(query: string): {
	departamento?: string;
	año?: number;
} {
	const filters: { departamento?: string; año?: number } = {};

	const yearMatch = query.match(/\b(2022|2023|2024|2025)\b/);
	if (yearMatch) filters.año = parseInt(yearMatch[1], 10);

	const deptos = [
		"AMAZONAS",
		"ANCASH",
		"APURIMAC",
		"AREQUIPA",
		"AYACUCHO",
		"CAJAMARCA",
		"CALLAO",
		"CUSCO",
		"HUANCAVELICA",
		"HUANUCO",
		"ICA",
		"JUNIN",
		"LA LIBERTAD",
		"LAMBAYEQUE",
		"LIMA",
		"LORETO",
		"MADRE DE DIOS",
		"MOQUEGUA",
		"PASCO",
		"PIURA",
		"PUNO",
		"SAN MARTIN",
		"TACNA",
		"TUMBES",
		"UCAYALI",
	];

	const upper = query.toUpperCase();
	for (const d of deptos) {
		if (upper.includes(d)) {
			filters.departamento = d;
			break;
		}
	}

	return filters;
}

export function clearCache() {
	cachedChunks = null;
}
