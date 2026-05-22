# Oncología Perú — BI Dashboard

Sistema de Business Intelligence para el análisis de datos oncológicos en el Perú, construido sobre fuentes oficiales del INEN, SINADEF, INEI y DPCAN.

---

## Contexto

El cáncer es la segunda causa de muerte en el Perú. Los datos existen — distribuidos en registros hospitalarios, sistemas de defunción y encuestas nacionales — pero sin integración ni herramienta de análisis accesible para quienes toman decisiones.

Este sistema unifica esas fuentes en un pipeline reproducible que termina en un dashboard interactivo con análisis de tendencias, predicciones y cobertura de tamizaje por región.

---

## Arquitectura general

```mermaid
flowchart TD
    subgraph SRC["Fuentes brutas  /data"]
        A1["INEN CSV\n66k atenciones 2022–2025"]
        A2["SINADEF CSV\n1.1M defunciones → 140k oncológicas"]
        A3["INEI XLSX\nProyecciones poblacionales 2000–2026"]
        A4["DPCAN XLSX\nMama · Cérvix · Colon · Próstata"]
    end

    subgraph INIT["bun run init"]
        direction TB
        B["load-ci10\nCatálogo CIE-10 oncológico"]
        C["load-oltp\nETL INEN → PostgreSQL OLTP"]
        D["load-sinadef\nETL SINADEF → PostgreSQL OLTP"]
        E["load-olap\nOLTP → Star Schema OLAP"]
        F["load-tasas\nTasas mortalidad → OLAP"]
        G["load-dpcan\nDPCAN → OLAP"]
        H["load-mongo\nDocumentos clínicos → MongoDB"]
        I["load-neo4j\nGrafo de conocimiento → Neo4j"]
        J["quality-check\n12 checks · 100%"]
        B --> C --> D --> E --> F --> G --> H --> I --> J
    end

    subgraph DBS["Bases de datos"]
        OLTP[("PostgreSQL OLTP\npuerto 5433")]
        OLAP[("PostgreSQL OLAP\npuerto 5434")]
        MONGO[("MongoDB\npuerto 27018")]
        NEO[("Neo4j\npuerto 7688")]
    end

    subgraph DEV["bun run dev"]
        OLLAMA["Ollama\ngmma3:1b · nomic-embed-text\npuerto 11435"]
        NEXT["Next.js\nlocalhost:3000"]
    end

    SRC --> INIT
    C --> OLTP
    D --> OLTP
    OLTP --> E --> OLAP
    F --> OLAP
    G --> OLAP
    H --> MONGO
    I --> NEO

    OLAP -->|"queries analíticas"| NEXT
    NEO -->|"contexto grafo"| NEXT
    OLLAMA -->|"chat IA"| NEXT
```

---

## Fuentes de datos

| Fuente | Registros | Período | Formato | Uso |
|--------|-----------|---------|---------|-----|
| INEN | 66,145 atenciones | 2022–2025 | CSV latin-1 | Pacientes oncológicos nuevos |
| SINADEF | 1,134,173 defunciones → 140,513 oncológicas | 2017–2024 | CSV pipe-delimited | Mortalidad por CIE-10 C00–C97 |
| INEI | 300 registros | 2000–2026 | XLSX | Proyecciones poblacionales por departamento |
| DPCAN | 1,365,650 filas | 2022–2025 | XLSX (4 archivos) | Tamizaje: Mama, Cérvix, Colon, Próstata |

---

## Pipeline ETL — `bun run init`

El comando levanta todos los contenedores, ejecuta el pipeline completo y los apaga al terminar. Si cualquier paso falla, los contenedores se apagan y el proceso sale con código 1.

### Secuencia de carga

```mermaid
sequenceDiagram
    participant CLI as bun run init
    participant POD as Podman
    participant ETL as apps/etl
    participant OLTP as PostgreSQL OLTP
    participant OLAP as PostgreSQL OLAP
    participant MONGO as MongoDB
    participant NEO as Neo4j

    CLI->>POD: compose up -d
    POD-->>CLI: containers healthy
    CLI->>ETL: load-ci10
    ETL->>OLTP: INSERT tipo_diagnostico (564 CIE-10)
    CLI->>ETL: load-oltp
    ETL->>OLTP: UPSERT paciente + atencion (INEN CSV)
    CLI->>ETL: load-sinadef
    ETL->>OLTP: TRUNCATE + INSERT defunciones oncológicas
    CLI->>ETL: load-olap
    OLTP-->>ETL: SELECT agregados
    ETL->>OLAP: TRUNCATE + INSERT star schema
    CLI->>ETL: load-tasas
    ETL->>OLAP: INSERT fact_tasas_mortalidad
    CLI->>ETL: load-dpcan
    ETL->>OLAP: TRUNCATE + INSERT fact_dpcan
    CLI->>ETL: load-mongo
    ETL->>MONGO: drop + insertMany documentos clínicos
    CLI->>ETL: load-neo4j
    ETL->>NEO: DELETE en batches + CREATE nodos y relaciones
    CLI->>ETL: quality-check
    ETL-->>CLI: 12/12 checks 100%
    CLI->>POD: compose down
```

### Modelo OLTP — 3FN

```mermaid
erDiagram
    paciente {
        int id PK
        varchar uuid_hash
        char sexo
        int edad
        varchar departamento
        varchar provincia
    }
    atencion {
        int id PK
        int paciente_id FK
        int establecimiento_id FK
        int fuente_id FK
        date fecha_atencion
        varchar tipo_atencion
    }
    diagnostico {
        int id PK
        int paciente_id FK
        varchar cod_cie10 FK
        date fecha_diagnostico
    }
    tipo_diagnostico {
        varchar cod_cie10 PK
        varchar descripcion
        varchar grupo
    }
    establecimiento {
        int id PK
        varchar nombre
        varchar departamento
        varchar provincia
    }
    fuente_dato {
        int id PK
        varchar nombre
    }

    paciente ||--o{ atencion : "tiene"
    paciente ||--o{ diagnostico : "tiene"
    diagnostico }o--|| tipo_diagnostico : "referencia"
    atencion }o--|| establecimiento : "en"
    atencion }o--|| fuente_dato : "desde"
```

### Modelo OLAP — Star Schema

```mermaid
erDiagram
    fact_oncologia {
        int id PK
        int dim_tiempo_id FK
        int dim_geografia_id FK
        int dim_paciente_id FK
        int dim_diagnostico_id FK
        int dim_establecimiento_id FK
        int dim_fuente_id FK
        int casos
    }
    dim_tiempo {
        int id
        int anio
        int mes
    }
    dim_geografia {
        int id
        varchar departamento
        varchar provincia
    }
    dim_paciente {
        int id
        char sexo
        varchar grupo_edad
    }
    dim_diagnostico {
        int id
        varchar cod_cie10
        varchar descripcion
        varchar grupo
    }
    dim_establecimiento {
        int id
        varchar nombre
    }
    dim_fuente {
        int id
        varchar nombre
    }

    fact_oncologia }o--|| dim_tiempo : ""
    fact_oncologia }o--|| dim_geografia : ""
    fact_oncologia }o--|| dim_paciente : ""
    fact_oncologia }o--|| dim_diagnostico : ""
    fact_oncologia }o--|| dim_establecimiento : ""
    fact_oncologia }o--|| dim_fuente : ""
```

### Tablas de hechos adicionales

| Tabla | Filas | Descripción |
|-------|-------|-------------|
| `fact_oncologia` | 338,948 | Hechos centrales INEN + SINADEF |
| `fact_dpcan` | 1,365,650 | Tamizaje por tipo, región, año y sexo |
| `fact_tasas_mortalidad` | 2,100 | Tasas por 100k hab. 2000–2024 |

### Data marts (vistas materializadas)

| Vista | Descripción |
|-------|-------------|
| `dm_geografia` | Casos agregados por departamento y año |
| `dm_demografia` | Distribución por sexo y grupo de edad |
| `dm_temporal` | Tendencia mensual y anual |
| `dm_diagnostico` | Top diagnósticos por región |

---

## Grafo de conocimiento — Neo4j

### Nodos

| Label | Cantidad | Propiedades clave |
|-------|----------|-------------------|
| `Paciente` | 206,656 | `hash`, `sexo`, `departamento` |
| `TipoCancer` | 564 | `cod_cie10`, `descripcion` |
| `Departamento` | 25 | `nombre`, `zona` |
| `Provincia` | 217 | `nombre` |
| `FactorRiesgo` | 9 | `nombre` |

### Relaciones

| Relación | Cantidad | Descripción |
|----------|----------|-------------|
| `DIAGNOSTICADO_CON` | 140,513 | Paciente → TipoCancer |
| `RESIDE_EN` | 139,389 | Paciente → Departamento |
| `PERTENECE_A` | 197 | Provincia → Departamento |
| `TIENE_INCIDENCIA` | 500 | Departamento → TipoCancer |
| `PRESENTA_FACTOR` | 100 | Departamento → FactorRiesgo |

---

## Dashboard — `bun run dev`

Levanta solo `postgres_olap` + `ollama`. Al presionar Ctrl+C ambos contenedores se apagan automáticamente.

### Flujo de una request

```mermaid
sequenceDiagram
    participant Browser
    participant Next as Next.js API Route
    participant OLAP as PostgreSQL OLAP
    participant OLLAMA as Ollama

    Browser->>Next: GET /api/data?departamento=LIMA
    Next->>OLAP: SELECT fact_oncologia, dm_*, fact_dpcan, fact_tasas
    OLAP-->>Next: JSON agregado
    Next-->>Browser: DashboardData JSON

    Browser->>Next: POST /api/chat { mensaje, historia }
    Next->>OLAP: SELECT contexto clínico
    Next->>OLLAMA: POST /api/chat { system, messages }
    OLLAMA-->>Next: texto respuesta
    Next-->>Browser: { texto, grafica }
```

### Pestañas del dashboard

| Pestaña | Fuente OLAP | Qué muestra |
|---------|-------------|-------------|
| Tendencia | `dm_temporal` | Atenciones por año con subtítulo explicativo |
| Demografía | `dm_demografia` | Distribución por sexo y grupo de edad |
| Provincias | `dm_geografia` | Casos por provincia del departamento seleccionado |
| Predicciones | `fact_tasas_mortalidad` | Proyecciones 2025–2027 con regresión lineal |
| Tipos | `dm_diagnostico` | Top 15 diagnósticos oncológicos por región |
| Tamizaje | `fact_dpcan` | Cobertura de detección temprana por tipo de cáncer |

---

## Inicio rápido

**Primera vez — poblar las bases de datos:**

```bash
bun run init
```

**Desarrollo diario:**

```bash
bun run dev
```

---

## Requisitos

- [Bun](https://bun.sh) ≥ 1.3
- [Podman](https://podman.io) + podman-compose
- Archivos de datos en `data/` (no incluidos en el repositorio)

---

## Tecnologías

- Next.js · React · TypeScript · Tailwind CSS · shadcn/ui · Recharts
- PostgreSQL (OLTP + OLAP) · MongoDB · Neo4j
- Ollama (gemma3:1b · nomic-embed-text)
- Bun · Podman

---

*by clix*
