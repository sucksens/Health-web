# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.3] - 2026-05-25

### Fixed

- TypeError en endpoint `/dashboard/summary` al restar datetimes offset-naive y offset-aware en `_calc_weekly_change`
- Signo invertido en cambio de peso de metas: ahora `-X kg` (verde) al bajar y `+X kg` (rojo) al subir

---

## [0.6.1] - 2026-05-21

### Fixed

- `start.sh` usaba credenciales hardcodeadas (`health_pass`) para esperar MySQL, ignorando las variables de entorno del `.env`
- Agregado `DATABASE_URL` requerido en `.env` para que el backend se conecte a MySQL correctamente
- Proteccion contra CRLF en `start.sh` con `sed` en el Dockerfile
- `.gitattributes` fuerza LF en archivos `*.sh` para compatibilidad Windows/Linux

---

## [0.6.0] - 2026-05-20

### Added

- Workflow CI/CD para GitHub Actions con lint, test y publicacion de imagenes Docker a GHCR
- En push/PR a main: ruff check, pytest, eslint, astro check, vitest
- En tag v*.*.*: build y push automatico de imagenes Docker a GHCR
- Cache de dependencias pip y npm en CI para builds mas rapidos
- Imagenes publicadas: `ghcr.io/<owner>/health-backend:<version>` y `ghcr.io/<owner>/health-frontend:<version>`

### Fixed

- Error TypeScript ts(2367) en LoginPage: login() retornaba `Promise<void>` pero el resultado se comparaba con un string
- Error TypeScript ts(2345) en BloodPressurePage: body tipado como `Record<string, any>` en vez de `BloodPressureCreate`
- Advertencias ts(6385) por `FormEvent` deprecado en LoginPage, RegisterPage y ForcePasswordChangePage
- Test LoginPage fallaba al buscar texto "Health" cuando el componente usa `<img alt="Health">`

---

## [0.5.0] - 2026-05-20

### Added

- Vista de Presion Arterial con filtro por rango de fechas (default: mes en curso)
- Endpoint `GET /blood-pressure` con parametros `date_from`/`date_to` y respuesta `{items, total}`
- Endpoint `GET /blood-pressure/stats` con filtros de fecha y agregaciones SQL (sin cargar todos los registros en memoria)
- Boton "Mes actual" para resetear el filtro de fechas en la vista de presion arterial
- Contador de registros en el rango visible en la tabla de historial
- `backend/start.sh` script de inicio que espera MySQL, corre migraciones, ejecuta seed y lanza Uvicorn
- Tabla `seed_version` para rastrear que versiones de seed se han aplicado a la base de datos
- Sistema de migraciones de seed versionadas en `seed.py` con `SEED_MIGRATIONS` dict
- Contraccion automatica de permisos: los roles se sincronizan para remover permisos obsoletos
- Actualizacion automatica de descripciones de permisos existentes durante el seed
- `backend/healthcheck` endpoint para Docker healthcheck
- Healthcheck en el servicio backend de Docker Compose con `start_period: 45s`
- Frontend espera a que el backend este healthy antes de iniciar (`condition: service_healthy`)
- Indice compuesto `(user_id, recorded_at)` en `blood_pressure_readings` para optimizar queries
- Migracion Alembic `0007_add_bp_composite_index`
- Migracion Alembic `0008_add_seed_version_table`
- Dependencia `cryptography>=44.0` en `requirements.txt` para autenticacion MySQL 8.0
- `.env.version` con VERSION para interpolacion en Docker Compose
- `manage.sh` script helper con comandos `build`, `upgrade`, `publish`
- Imagenes Docker se taguean con la version del proyecto (`health-backend:0.5.0`, `health-frontend:0.5.0`)

### Fixed

- CSS global no se cargaba en produccion: reemplazado `<link>` raw por `import "@/styles/global.css"` en layout Astro
- `pymysql` fallaba al conectar MySQL 8.0 por falta de `cryptography` para `caching_sha2_password`
- Seed se ejecutaba en cada inicio sin rastrear que ya se habia aplicado

---

## [0.4.0] - 2026-05-19

### Added

- Dashboard completo con resumen de salud, métricas corporales, metas de peso, citas próximas, adherencia a medicamentos y alertas
- Endpoint `GET /dashboard/summary` con tasas de adherencia (hoy y 7 días), medicamentos activos y dosis pendientes
- Registros manuales de medicamentos sin receta: botón flotante "+" en Tratamiento Activo para agregar tomas fuera de esquemas de receta
- Modelo `AdherenceRecord` soporta registros standalone (`user_id` + `medication_name` directos, sin `prescription_detail_id`)
- Migración `0005_standalone_adherence_records` para columnas `user_id`, `medication_name` y `prescription_detail_id` nullable
- Reporte PDF de adherencia incluye medicamentos sin receta y tabla de detalle de tomas (fecha, hora, medicamento, estado, notas)
- `devToolbar: false` en Astro config para resolver conflicto con `axobject-query` en dev server

### Changed

- `_enrich_record()` resuelve nombre de medicamento desde detail o record standalone
- Queries de adherencia (today, history, dashboard) incluyen registros standalone
- Endpoint `PATCH /adherence/{id}` verifica ownership vía receta o `user_id` directo

---

## [0.3.0] - 2026-05-14

### Added

- Licencia AGPL-3.0
- Docker: `backend/Dockerfile` (python:3.13-slim)
- Docker: `frontend/Dockerfile` multi-stage (node:22-alpine + nginx:alpine)
- Docker: `frontend/nginx.conf` con proxy reverso al backend
- `docker-compose.yml` con backend, frontend y MySQL 8.0
- `backend/.env.docker` con configuracion para Docker
- `.dockerignore` para backend y frontend

---

## [0.2.0] - 2026-05-14

### Added

- Suite de tests para backend con pytest + httpx (cobertura en auth, users, body_metrics, weight_goals, medical_history)
- Suite de tests para frontend con Vitest + Testing Library
- Documentación del esquema de pruebas del backend
- Documentación del sistema de testing del frontend

---

## [0.1.0] - 2026-05-11

### Added

- Sistema de gestión de salud personal con FastAPI + Astro/React
- Autenticación JWT con refresh tokens y rotación
- RBAC con 3 roles: admin, manager, user
- Módulo de métricas corporales (peso, IMC, cintura, pecho, brazo)
- Módulo de metas de peso con seguimiento de progreso
- Historial médico: perfil de salud, doctores, especialidades, citas, recetas, medicamentos, documentos, adherencia
- 6 tipos de reportes PDF con gráficos
- Administración de usuarios, roles y permisos
- Registro de auditoría (activity logs)
- Gráficos de evolución con ECharts
- UI con shadcn/ui + Tailwind CSS 4

### Changed

- Versionado unificado mediante archivo `VERSION` en la raíz del proyecto
- Backend lee su versión dinámicamente desde `VERSION`
