#!/bin/sh
set -e

echo "Esperando base de datos..."
until python -c "
import os, django
django.setup()
from django.db import connection
connection.ensure_connection()
" 2>/dev/null; do
  sleep 2
done

echo "Aplicando migraciones..."
python manage.py migrate --noinput

echo "Recolectando archivos estaticos..."
python manage.py collectstatic --noinput --clear

echo "Iniciando servidor..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
