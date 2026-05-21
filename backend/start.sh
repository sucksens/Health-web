#!/bin/bash
set -e

echo "=== Health App Startup ===" >&2
echo "Esperando a MySQL..." >&2
python -u -c "
import pymysql, time, os

for i in range(30):
    try:
        conn = pymysql.connect(
            host='mysql',
            user=os.environ.get('MYSQL_USER', 'health_user'),
            password=os.environ.get('MYSQL_PASSWORD', 'health_pass'),
            database=os.environ.get('MYSQL_DATABASE', 'health_db'),
            connect_timeout=5,
        )
        conn.close()
        print('MySQL listo')
        break
    except Exception as e:
        print(f'Esperando MySQL... ({i+1}/30): {e}')
        time.sleep(2)
else:
    print('ERROR: No se pudo conectar a MySQL')
    exit(1)
"

echo "Corriendo migraciones..." >&2
alembic upgrade head

echo "Sembrando datos iniciales..." >&2
python -u -c "
from app.database.db import SessionLocal
from app.database.seed import seed_db

db = SessionLocal()
try:
    seed_db(db)
    print('Seed completado')
finally:
    db.close()
"

echo "Iniciando Uvicorn..." >&2
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
