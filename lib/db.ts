/**
 * Conexión centralizada a PostgreSQL.
 * - Producción (Vercel/Neon): usa POSTGRES_URL
 * - Local (Docker): usa variables POSTGRES_OLAP_*
 */
import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

export function getDb(): ReturnType<typeof postgres> {
  if (_sql) return _sql;

  if (process.env.POSTGRES_URL) {
    _sql = postgres(process.env.POSTGRES_URL, {
      ssl: "require",
      max: 10,
    });
  } else {
    _sql = postgres({
      host: process.env.POSTGRES_OLAP_HOST || "localhost",
      port: Number(process.env.POSTGRES_OLAP_PORT) || 5434,
      database: process.env.POSTGRES_OLAP_DB || "oncologia_olap",
      username: process.env.POSTGRES_OLAP_USER || "oncologia",
      password: process.env.POSTGRES_OLAP_PASSWORD || "oncologia_dev_2026",
      max: 10,
    });
  }

  return _sql;
}
