// =============================================================
// MongoDB: Inicialización de colecciones y validación
// =============================================================

const db = connect("mongodb://localhost:27017/oncologia_docs");

// ── Colección: Informes clínicos (NoSQL documental) ──
db.createCollection("informes_clinicos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["paciente_id_hash", "fecha", "tipo_informe", "contenido"],
      properties: {
        paciente_id_hash: { bsonType: "string" },
        fecha: { bsonType: "date" },
        tipo_informe: {
          enum: ["RADIOLOGIA", "PATOLOGIA", "LABORATORIO", "INTERCONSULTA", "EVOLUCION"]
        },
        contenido: { bsonType: "string" },
        medico: { bsonType: "string" },
        departamento: { bsonType: "string" },
        palabras_clave: {
          bsonType: "array",
          items: { bsonType: "string" }
        }
      }
    }
  }
});

// ── Colección: Notas de evolución ──
db.createCollection("notas_evolucion", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["paciente_id_hash", "fecha", "nota"],
      properties: {
        paciente_id_hash: { bsonType: "string" },
        fecha: { bsonType: "date" },
        nota: { bsonType: "string" },
        medico: { bsonType: "string" },
        diagnostico_cie10: { bsonType: "string" },
        sentimiento: {
          enum: ["POSITIVO", "NEUTRAL", "NEGATIVO", null]
        }
      }
    }
  }
});

// ── Colección: Catálogo de metadatos ──
db.createCollection("metadata_catalogos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre", "fuente", "campos"],
      properties: {
        nombre: { bsonType: "string" },
        fuente: { bsonType: "string" },
        descripcion: { bsonType: "string" },
        frecuencia_actualizacion: { bsonType: "string" },
        responsable: { bsonType: "string" },
        campos: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["nombre", "tipo"],
            properties: {
              nombre: { bsonType: "string" },
              tipo: { bsonType: "string" },
              descripcion: { bsonType: "string" }
            }
          }
        }
      }
    }
  }
});

// ── Colección: Resultados de minería ──
db.createCollection("mining_results", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tipo", "algoritmo", "fecha_ejecucion", "resultado"],
      properties: {
        tipo: { bsonType: "string" },
        algoritmo: { bsonType: "string" },
        parametros: { bsonType: "object" },
        fecha_ejecucion: { bsonType: "date" },
        resultado: { bsonType: "object" },
        metricas: { bsonType: "object" },
        dataset_size: { bsonType: "int" }
      }
    }
  }
});

// Índices
db.informes_clinicos.createIndex({ paciente_id_hash: 1, fecha: -1 });
db.informes_clinicos.createIndex({ palabras_clave: 1 });
db.informes_clinicos.createIndex({ contenido: "text" });
db.notas_evolucion.createIndex({ paciente_id_hash: 1, fecha: -1 });
db.notas_evolucion.createIndex({ sentimiento: 1 });
db.mining_results.createIndex({ tipo: 1, fecha_ejecucion: -1 });

print("MongoDB collections created successfully");
