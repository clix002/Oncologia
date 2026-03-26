import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ── DIMENSION TABLES ──

export const dimTiempo = sqliteTable("dim_tiempo", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	año: integer("año").notNull(),
	mes: integer("mes").notNull(),
	trimestre: integer("trimestre"),
	completo: integer("completo", { mode: "boolean" }).notNull(),
});

export const dimGeografia = sqliteTable("dim_geografia", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	departamento: text("departamento").notNull(),
	provincia: text("provincia").notNull(),
	distrito: text("distrito"),
	ubigeo: text("ubigeo"),
});

export const dimPaciente = sqliteTable("dim_paciente", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	sexo: text("sexo").notNull(),
	grupo_etario: text("grupo_etario").notNull(),
});

export const dimFuente = sqliteTable("dim_fuente", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	nombre: text("nombre").notNull(),
	rango_fechas: text("rango_fechas"),
	nota: text("nota"),
});

// ── FACT TABLE ──

export const factOncologia = sqliteTable("fact_oncologia", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	uuid_hash: text("uuid_hash").notNull(),
	tiempo_id: integer("tiempo_id")
		.notNull()
		.references(() => dimTiempo.id),
	geografia_id: integer("geografia_id")
		.notNull()
		.references(() => dimGeografia.id),
	paciente_id: integer("paciente_id")
		.notNull()
		.references(() => dimPaciente.id),
	fuente_id: integer("fuente_id")
		.notNull()
		.references(() => dimFuente.id),
	edad: integer("edad"),
	cant_atenciones_cex: integer("cant_atenciones_cex"),
});

// ── POPULATION TABLE (INEI) ──

export const poblacion = sqliteTable("poblacion", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	departamento: text("departamento").notNull(),
	año: integer("año").notNull(),
	total: integer("total").notNull(),
	hombres: integer("hombres"),
	mujeres: integer("mujeres"),
});

// ── VECTOR EMBEDDINGS TABLE ──

export const embeddings = sqliteTable("embeddings", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	chunk_type: text("chunk_type").notNull(),
	chunk_key: text("chunk_key").notNull(),
	content: text("content").notNull(),
	embedding: blob("embedding"),
	metadata_json: text("metadata_json"),
});
