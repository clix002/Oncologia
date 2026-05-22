-- =============================================================
-- OLTP: Base Transaccional Oncología (3FN)
-- Simula el sistema hospitalario fuente
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de pacientes (anonimizada)
CREATE TABLE paciente (
    id              SERIAL PRIMARY KEY,
    uuid_hash       TEXT NOT NULL UNIQUE,
    fecha_nacimiento DATE,
    sexo            CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F', 'X')),
    ubigeo          CHAR(6),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Tipos de diagnóstico (CIE-10)
CREATE TABLE tipo_diagnostico (
    cod_cie10   VARCHAR(8) PRIMARY KEY,
    nombre      TEXT NOT NULL,
    grupo       TEXT,
    es_oncologico BOOLEAN DEFAULT TRUE
);

-- Catálogo de establecimientos de salud
CREATE TABLE establecimiento (
    id              SERIAL PRIMARY KEY,
    codigo_renipress VARCHAR(20),
    nombre          TEXT NOT NULL,
    nivel           TEXT CHECK (nivel IN ('I-1','I-2','I-3','I-4','II-1','II-2','III-1','III-2')),
    departamento    TEXT NOT NULL,
    provincia       TEXT NOT NULL,
    distrito        TEXT
);

-- Atenciones médicas
CREATE TABLE atencion (
    id              SERIAL PRIMARY KEY,
    paciente_id     INTEGER NOT NULL REFERENCES paciente(id),
    establecimiento_id INTEGER NOT NULL REFERENCES establecimiento(id),
    fecha_atencion  DATE NOT NULL,
    tipo_atencion   TEXT CHECK (tipo_atencion IN ('CONSULTA_EXTERNA','EMERGENCIA','HOSPITALIZACION','TELEMEDICINA')),
    es_nuevo_caso   BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Diagnósticos por atención
CREATE TABLE diagnostico (
    id              SERIAL PRIMARY KEY,
    atencion_id     INTEGER REFERENCES atencion(id),
    paciente_id     INTEGER NOT NULL REFERENCES paciente(id),
    cod_cie10       VARCHAR(8) NOT NULL REFERENCES tipo_diagnostico(cod_cie10),
    estadio         TEXT CHECK (estadio IN ('I','II','III','IV','NO_APLICA','DESCONOCIDO')),
    fecha_diagnostico DATE NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Fuentes de datos (linaje)
CREATE TABLE fuente_dato (
    id          SERIAL PRIMARY KEY,
    nombre      TEXT NOT NULL,
    archivo_origen TEXT,
    fecha_carga TIMESTAMP DEFAULT NOW(),
    registros   INTEGER,
    nota        TEXT
);

-- Data Quality Log
CREATE TABLE data_quality_log (
    id              SERIAL PRIMARY KEY,
    tabla           TEXT NOT NULL,
    columna         TEXT,
    regla           TEXT NOT NULL,
    registros_ok    INTEGER,
    registros_fail  INTEGER,
    porcentaje_ok   NUMERIC(5,2),
    ejecutado_en    TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_paciente_ubigeo ON paciente(ubigeo);
CREATE INDEX idx_paciente_sexo ON paciente(sexo);
CREATE INDEX idx_atencion_fecha ON atencion(fecha_atencion);
CREATE INDEX idx_atencion_paciente ON atencion(paciente_id);
CREATE INDEX idx_diagnostico_cie10 ON diagnostico(cod_cie10);
CREATE INDEX idx_diagnostico_paciente ON diagnostico(paciente_id);
