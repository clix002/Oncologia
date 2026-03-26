import path from "node:path";
import { type Client, createClient } from "@libsql/client";

let dbInstance: Client | null = null;

export function getDb(): Client {
	if (dbInstance) return dbInstance;

	const url =
		process.env.TURSO_DATABASE_URL ||
		`file:${path.resolve(process.cwd(), process.env.DB_PATH || "data/oncologia.db")}`;

	dbInstance = createClient({
		url,
		authToken: process.env.TURSO_AUTH_TOKEN,
	});

	return dbInstance;
}
