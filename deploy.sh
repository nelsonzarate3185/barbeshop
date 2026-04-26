#!/bin/sh
# Script de deploy completo
# Uso: ./deploy.sh

set -e

echo "=== Build y deploy Barbería ==="

# Verificar que existe el .env.prod
if [ ! -f ".env.prod" ]; then
  echo "ERROR: Falta el archivo .env.prod"
  echo "Copiá .env.prod.example y completá los valores"
  exit 1
fi

# Build de imágenes
echo "[1/4] Construyendo imágenes Docker..."
docker compose build --no-cache

# Levantar infraestructura primero
echo "[2/4] Levantando base de datos y Redis..."
docker compose up -d db redis
sleep 5

# Levantar backend (hace migrate + collectstatic automáticamente via entrypoint.sh)
echo "[3/4] Levantando backend..."
docker compose up -d web celery celery-beat

# Levantar frontend
echo "[4/4] Levantando frontend..."
docker compose up -d frontend

echo ""
echo "=== Deploy completado ==="
echo "Frontend: http://localhost"
echo "Admin:    http://localhost/admin/"
echo ""
echo "Logs: docker compose logs -f"
