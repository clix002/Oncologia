#!/bin/bash
# =============================================================
# bootstrap.sh — Inicialización completa del entorno
# =============================================================
set -e

cd "$(dirname "$0")"

echo "🔄 Creando .env desde .env.example si no existe..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "   ✅ .env creado (edítalo con tus API keys si es necesario)"
else
  echo "   ⏭️  .env ya existe"
fi

echo ""
echo "📦 Iniciando todos los servicios con Podman Compose..."
podman compose up -d

echo ""
echo "⏳ Esperando que los servicios estén healthy..."
echo "   (esto puede tomar 30-60s la primera vez)"

# Esperar servicios críticos
wait_for_service() {
  local name=$1
  local max_attempts=${2:-30}
  local attempt=1
  while [ $attempt -le $max_attempts ]; do
    if podman inspect "$name" --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
      echo "   ✅ $name: healthy"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  echo "   ⚠️  $name: timeout (puede estar aún iniciando)"
}

wait_for_service oncologia-oltp 20
wait_for_service oncologia-olap 20
wait_for_service oncologia-mongo 15
wait_for_service oncologia-redis 10
wait_for_service oncologia-minio 15

echo ""
echo "📥 Descargando modelos Ollama..."
echo "   (solo si Ollama está corriendo, puede tardar varios minutos)"
podman exec oncologia-ollama ollama pull nomic-embed-text:latest 2>/dev/null || echo "   ⚠️  Ollama no disponible aún, descarga manual después con: podman exec oncologia-ollama ollama pull nomic-embed-text:latest"
podman exec oncologia-ollama ollama pull gemma3:1b 2>/dev/null || true

echo ""
echo "============================================"
echo "✅ INFRAESTRUCTURA LEVANTADA"
echo "============================================"
echo ""
echo "🧩 Servicios disponibles:"
echo "   Frontend:     http://localhost:3000"
echo "   MinIO API:    http://localhost:9001"
echo "   MinIO Console: http://localhost:9002"
echo "   Spark Master: http://localhost:8081"
echo "   Ollama API:   http://localhost:11435"
echo "   Analytics API: http://localhost:8001"
echo ""
echo "🗄️  Bases de datos:"
echo "   PostgreSQL OLTP: localhost:5433 (oncologia_oltp)"
echo "   PostgreSQL OLAP: localhost:5434 (oncologia_olap)"
echo "   MongoDB:         localhost:27018 (oncologia_docs)"
echo "   Redis:           localhost:6380"
echo "   Neo4j:           http://localhost:7475 | bolt://localhost:7688"
echo ""
echo "🛠️  Comandos útiles:"
echo "   podman compose logs -f [servicio]"
echo "   podman compose down            # Detener todo"
echo "   podman compose down -v         # Detener + borrar volúmenes"
echo ""
