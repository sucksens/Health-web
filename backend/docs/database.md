# Configuracion de Base de Datos

El sistema soporta **MySQL** y **SQLite** como motores de base de datos. El switch entre ambos se realiza unicamente cambiando la variable `DATABASE_URL` en el archivo `.env` y reiniciando la aplicacion.

---

## Estructura

```
backend/
  app/
    config/settings.py        # Lee DATABASE_URL del .env, detecta el motor
    database/
      db.py                   # Crea el engine segun el motor detectado
      seed.py                 # Poblado inicial de datos (roles, permisos, admin)
  alembic/
    env.py                    # Configuracion de Alembic (usa settings.py)
    versions/                 # Migraciones compatibles con ambos motores
  alembic.ini                 # Config de Alembic (URL se inyecta desde env.py)
  .env                        # Aqui se define DATABASE_URL
```

## Como funciona

### 1. Deteccion automatica del motor

`app/config/settings.py` expone la propiedad `db_engine` que detecta el motor a partir del prefijo de `DATABASE_URL`:

- Si empieza con `sqlite` -> motor `sqlite`
- Cualquier otro caso -> motor `mysql`

### 2. Creacion del engine

`app/database/db.py` construye el engine de SQLAlchemy segun el motor detectado:

| Parametro | MySQL | SQLite |
|---|---|---|
| `pool_pre_ping` | `True` | No aplica |
| `pool_recycle` | `3600` | No aplica |
| `pool_size` | `5` | No aplica |
| `max_overflow` | `10` | No aplica |
| `connect_args` | No aplica | `{"check_same_thread": False}` |

### 3. Migraciones (Alembic)

Las migraciones se gestionan con **Alembic**. El archivo `alembic/env.py` importa los modelos y la configuracion desde la app, por lo que funciona con cualquier motor sin cambios adicionales.

Las migraciones usan tipos genericos de SQLAlchemy (`Integer`, `String`, `DateTime`, etc.) que se traducen al tipo correcto segun el motor.

---

## Guia rapida

### Usar SQLite (desarrollo local)

1. Configurar `.env`:

```env
DATABASE_URL=sqlite:///./health.db
```

2. Crear las tablas y poblar datos:

```bash
# Opcion A: Alembic (recomendado)
alembic upgrade head
python -c "from app.database.db import SessionLocal; from app.database.seed import seed_db; db=SessionLocal(); seed_db(db)"

# Opcion B: init_db() directo (crea tablas desde los modelos ORM)
python -c "from app.database.db import init_db, SessionLocal; init_db(); from app.database.seed import seed_db; db=SessionLocal(); seed_db(db)"
```

3. Iniciar el servidor:

```bash
uvicorn app.main:app --reload
```

El archivo `health.db` se crea en la raiz de `backend/`.

### Usar MySQL (produccion)

1. Configurar `.env`:

```env
DATABASE_URL=mysql+pymysql://usuario:password@host:3306/health_db
```

2. Asegurar que la base de datos exista en MySQL:

```sql
CREATE DATABASE IF NOT EXISTS health_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Aplicar migraciones y poblar:

```bash
alembic upgrade head
python -c "from app.database.db import SessionLocal; from app.database.seed import seed_db; db=SessionLocal(); seed_db(db)"
```

4. Iniciar el servidor:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Cambiar de un motor a otro

### De SQLite a MySQL

1. Editar `.env` y cambiar `DATABASE_URL` al formato MySQL.
2. Crear la base de datos en MySQL si no existe.
3. Ejecutar `alembic upgrade head` para crear las tablas.
4. Ejecutar el seed para poblar los datos iniciales.
5. Reiniciar la aplicacion.

### De MySQL a SQLite

1. Editar `.env` y cambiar `DATABASE_URL` a `sqlite:///./gastos.db`.
2. Eliminar el archivo `.db` anterior si existe (para empezar limpio).
3. Ejecutar `alembic upgrade head`.
4. Ejecutar el seed.
5. Reiniciar la aplicacion.

> **Nota**: No existe migracion automatica de datos entre motores. El cambio implica recrear las tablas y repoblar los datos iniciales.

---

## Datos iniciales (seed)

El script `app/database/seed.py` inserta de forma idempotente:

- **3 roles**: `admin`, `manager`, `user`
- **Permisos** organizados por modulo (`users`, `roles`, `permissions`, `reports`, `activity`, `body_metrics`, `weight_goals`, `medical_history`)
- **Asignaciones rol-permiso**: admin tiene todos, manager tiene reportes + lectura de usuarios, user tiene lectura y creacion
- **1 usuario admin**: `admin@health.com` / `admin123` con rol admin

El seed es seguro para ejecutarse multiples veces (verifica existencia antes de insertar).

---

## Comandos de referencia

| Comando | Descripcion |
|---|---|
| `alembic upgrade head` | Aplica todas las migraciones pendientes |
| `alembic downgrade -1` | Revierte la ultima migracion |
| `alembic revision --autogenerate -m "desc"` | Genera una nueva migracion desde los modelos |
| `alembic current` | Muestra la migracion actual |
| `alembic history` | Lista todas las migraciones |

---

## Modelos y compatibilidad

Los modelos ORM usan tipos genericos de SQLAlchemy que funcionan en ambos motores:

| Tipo SQLAlchemy | MySQL | SQLite |
|---|---|---|
| `Integer` | `INT` | `INTEGER` |
| `String(N)` | `VARCHAR(N)` | `VARCHAR(N)` |
| `DateTime` | `DATETIME` | `DATETIME` |
| `Boolean` | `TINYINT(1)` | `INTEGER` (0/1) |
| `Text` | `TEXT` | `TEXT` |

No se usa raw SQL en el codigo de la aplicacion. Todas las queries pasan por el ORM de SQLAlchemy, lo que garantiza compatibilidad con ambos motores sin cambios en la logica de negocio.
