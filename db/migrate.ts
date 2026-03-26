import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DB_PATH || "data/oncologia.db";

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");

console.log("Creando tablas en", DB_PATH, "...\n");

db.exec(`
  CREATE TABLE IF NOT EXISTS dim_tiempo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    año INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    trimestre INTEGER,
    completo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS dim_geografia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    departamento TEXT NOT NULL,
    provincia TEXT NOT NULL,
    distrito TEXT,
    ubigeo TEXT
  );

  CREATE TABLE IF NOT EXISTS dim_paciente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sexo TEXT NOT NULL,
    grupo_etario TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dim_fuente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rango_fechas TEXT,
    nota TEXT
  );

  CREATE TABLE IF NOT EXISTS fact_oncologia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid_hash TEXT NOT NULL,
    tiempo_id INTEGER NOT NULL REFERENCES dim_tiempo(id),
    geografia_id INTEGER NOT NULL REFERENCES dim_geografia(id),
    paciente_id INTEGER NOT NULL REFERENCES dim_paciente(id),
    fuente_id INTEGER NOT NULL REFERENCES dim_fuente(id),
    edad INTEGER,
    cant_atenciones_cex INTEGER
  );

  CREATE TABLE IF NOT EXISTS poblacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    departamento TEXT NOT NULL,
    año INTEGER NOT NULL,
    total INTEGER NOT NULL,
    hombres INTEGER,
    mujeres INTEGER
  );

  CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk_type TEXT NOT NULL,
    chunk_key TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding BLOB,
    metadata_json TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_fact_tiempo ON fact_oncologia(tiempo_id);
  CREATE INDEX IF NOT EXISTS idx_fact_geografia ON fact_oncologia(geografia_id);
  CREATE INDEX IF NOT EXISTS idx_fact_paciente ON fact_oncologia(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_geo_depto ON dim_geografia(departamento);
  CREATE INDEX IF NOT EXISTS idx_tiempo_año ON dim_tiempo(año);
  CREATE INDEX IF NOT EXISTS idx_poblacion_depto_año ON poblacion(departamento, año);
  CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(chunk_type);
`);

const tables = db
	.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
	.all() as { name: string }[];

console.log("Tablas creadas:");
for (const t of tables) {
	const row = db.query(`SELECT COUNT(*) as c FROM ${t.name}`).get() as {
		c: number;
	};
	console.log(`  ${t.name}: ${row.c} filas`);
}

db.close();
console.log("\nMigración completada.");
