-- =============================================================
-- OLAP: Data Warehouse Star Schema
-- =============================================================

-- ── DIMENSION TABLES ──

CREATE TABLE dim_tiempo (
    id          SERIAL PRIMARY KEY,
    año         INTEGER NOT NULL,
    mes         INTEGER NOT NULL,
    trimestre   INTEGER,
    semestre    INTEGER,
    completo    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE dim_geografia (
    id              SERIAL PRIMARY KEY,
    departamento    TEXT NOT NULL,
    provincia       TEXT NOT NULL,
    distrito        TEXT,
    ubigeo          TEXT,
    zona            TEXT CHECK (zona IN ('COSTA','SIERRA','SELVA'))
);

CREATE TABLE dim_paciente (
    id              SERIAL PRIMARY KEY,
    sexo            TEXT NOT NULL,
    grupo_etario_10 TEXT NOT NULL,
    grupo_etario_20 TEXT
);

CREATE TABLE dim_diagnostico (
    id          SERIAL PRIMARY KEY,
    cod_cie10   VARCHAR(8) NOT NULL UNIQUE,
    nombre      TEXT,
    grupo       TEXT
);

CREATE TABLE dim_establecimiento (
    id              SERIAL PRIMARY KEY,
    codigo_renipress VARCHAR(20),
    nombre          TEXT NOT NULL,
    nivel           TEXT,
    tipo            TEXT
);

CREATE TABLE dim_fuente (
    id              SERIAL PRIMARY KEY,
    nombre          TEXT NOT NULL,
    rango_fechas    TEXT,
    nota            TEXT
);

-- ── FACT TABLE ──

CREATE TABLE fact_oncologia (
    id                  SERIAL PRIMARY KEY,
    uuid_hash           TEXT NOT NULL,
    tiempo_id           INTEGER NOT NULL REFERENCES dim_tiempo(id),
    geografia_id        INTEGER NOT NULL REFERENCES dim_geografia(id),
    paciente_id         INTEGER NOT NULL REFERENCES dim_paciente(id),
    diagnostico_id      INTEGER REFERENCES dim_diagnostico(id),
    establecimiento_id  INTEGER REFERENCES dim_establecimiento(id),
    fuente_id           INTEGER NOT NULL REFERENCES dim_fuente(id),
    edad                INTEGER,
    cant_atenciones_cex INTEGER,
    es_nuevo_caso       BOOLEAN DEFAULT FALSE
);

-- ── POBLACION (INEI) ──

CREATE TABLE poblacion (
    id              SERIAL PRIMARY KEY,
    departamento    TEXT NOT NULL,
    año             INTEGER NOT NULL,
    total           INTEGER NOT NULL,
    hombres         INTEGER,
    mujeres         INTEGER
);

-- ── DATA MARTS (Vistas materializadas) ──

CREATE MATERIALIZED VIEW dm_geografia AS
SELECT
    g.departamento,
    g.provincia,
    g.zona,
    t.año,
    t.mes,
    df.nombre AS fuente,
    COUNT(f.id) AS casos,
    p.total AS poblacion,
    ROUND((COUNT(f.id)::NUMERIC / NULLIF(p.total, 0)) * 100000, 2) AS tasa_por_100k
FROM fact_oncologia f
JOIN dim_geografia g ON f.geografia_id = g.id
JOIN dim_tiempo t ON f.tiempo_id = t.id
JOIN dim_fuente df ON f.fuente_id = df.id
LEFT JOIN poblacion p ON p.departamento = g.departamento AND p.año = t.año
GROUP BY g.departamento, g.provincia, g.zona, t.año, t.mes, df.nombre, p.total;

CREATE MATERIALIZED VIEW dm_demografia AS
SELECT
    dp.sexo,
    dp.grupo_etario_10,
    dp.grupo_etario_20,
    g.departamento,
    t.año,
    COUNT(f.id) AS casos
FROM fact_oncologia f
JOIN dim_paciente dp ON f.paciente_id = dp.id
JOIN dim_geografia g ON f.geografia_id = g.id
JOIN dim_tiempo t ON f.tiempo_id = t.id
GROUP BY dp.sexo, dp.grupo_etario_10, dp.grupo_etario_20, g.departamento, t.año;

CREATE MATERIALIZED VIEW dm_temporal AS
SELECT
    t.año,
    t.mes,
    t.trimestre,
    t.semestre,
    g.departamento,
    g.zona,
    COUNT(f.id) AS casos,
    SUM(f.cant_atenciones_cex) AS total_cex,
    ROUND(AVG(f.cant_atenciones_cex), 2) AS promedio_cex
FROM fact_oncologia f
JOIN dim_tiempo t ON f.tiempo_id = t.id
JOIN dim_geografia g ON f.geografia_id = g.id
GROUP BY t.año, t.mes, t.trimestre, t.semestre, g.departamento, g.zona;

CREATE MATERIALIZED VIEW dm_diagnostico AS
SELECT
    dd.cod_cie10,
    dd.grupo,
    g.departamento,
    t.año,
    COUNT(f.id) AS casos
FROM fact_oncologia f
JOIN dim_diagnostico dd ON f.diagnostico_id = dd.id
JOIN dim_geografia g ON f.geografia_id = g.id
JOIN dim_tiempo t ON f.tiempo_id = t.id
GROUP BY dd.cod_cie10, dd.grupo, g.departamento, t.año;

-- ── METADATA ──

CREATE TABLE catalog_metadata (
    id              SERIAL PRIMARY KEY,
    tabla           TEXT NOT NULL,
    campo           TEXT NOT NULL,
    tipo_dato       TEXT,
    descripcion     TEXT,
    origen          TEXT,
    transformacion  TEXT,
    calidad_score   NUMERIC(3,2) DEFAULT 1.0
);

-- ── Indexes ──
CREATE INDEX idx_fact_tiempo ON fact_oncologia(tiempo_id);
CREATE INDEX idx_fact_geografia ON fact_oncologia(geografia_id);
CREATE INDEX idx_fact_paciente ON fact_oncologia(paciente_id);
CREATE INDEX idx_fact_diagnostico ON fact_oncologia(diagnostico_id);
CREATE INDEX idx_geo_depto ON dim_geografia(departamento);
CREATE INDEX idx_geo_zona ON dim_geografia(zona);
CREATE INDEX idx_tiempo_año ON dim_tiempo(año);
CREATE INDEX idx_poblacion_depto_año ON poblacion(departamento, año);
