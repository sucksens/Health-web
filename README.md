<div align="center">
  <img src="logo.svg" alt="Health Web" width="280" />
</div>

# Health Web

Sistema web personal de gestion de salud construido con **FastAPI** (backend) y **Astro + React** (frontend). Permite gestionar metricas corporales, metas de peso, historial medico, citas, recetas, medicamentos, documentos y adherencia a tratamientos, con generacion de reportes en PDF.

## Tabla de Contenidos

- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalacion](#instalacion)
- [Ejecucion](#ejecucion)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Modulos Funcionales](#modulos-funcionales)
- [API Endpoints](#api-endpoints)
- [Autenticacion y Permisos](#autenticacion-y-permisos)
- [Base de Datos](#base-de-datos)
- [Reportes PDF](#reportes-pdf)
- [Licencia](#licencia)

## Tecnologias

### Backend

| Tecnologia | Version | Uso |
|---|---|---|
| Python | 3.13+ | Lenguaje |
| FastAPI | 0.115.12 | Framework web |
| SQLAlchemy | 2.0.41 | ORM |
| Alembic | 1.15.2 | Migraciones |
| PyJWT | 2.12.1 | Autenticacion JWT |
| bcrypt | 4.3.0 | Hash de contrasenas |
| fpdf2 | 2.8.7 | Generacion de PDF |
| matplotlib | 3.10+ | Graficos en reportes |
| PyMySQL | 1.1.1 | Conector MySQL |
| pydantic | 2.13.1 | Validacion de datos |

### Frontend

| Tecnologia | Version | Uso |
|---|---|---|
| Astro | 5.18+ | Framework SSG |
| React | 19.2+ | UI interactiva |
| TypeScript | 5.9+ | Tipado estatico |
| Tailwind CSS | 4.2+ | Estilos |
| shadcn/ui | 4.2+ | Componentes UI |
| Radix UI | 1.4+ | Primitivas accesibles |
| ECharts | 6.0+ | Graficos y visualizaciones |
| Remix Icon | 4.9+ | Iconografia |

## Requisitos

- Python 3.13 o superior
- Node.js 18+ y npm
- (Opcional) MySQL 8+ para produccion

## Instalacion

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Health-web
```

### 2. Configurar backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar (Windows)
venv\Scripts\activate

# Activar (Linux/Mac)
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores deseados:

```ini
# Base de datos (SQLite para desarrollo)
DATABASE_URL=sqlite:///./health.db

# JWT
JWT_SECRET_KEY=<genera con: python -c "import secrets; print(secrets.token_urlsafe(64))">
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=["http://localhost:4321"]
```

### 4. Inicializar base de datos

```bash
# Aplicar migraciones
alembic upgrade head

# Poblar datos iniciales (roles, permisos, usuario admin)
python -c "from app.database.db import SessionLocal; from app.database.seed import seed_db; db=SessionLocal(); seed_db(db)"
```

### 5. Configurar frontend

```bash
cd ../frontend

# Instalar dependencias
npm install
```

## Ejecucion

### Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

La API estara disponible en `http://localhost:8000` y la documentacion interactiva en `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm run dev
```

La aplicacion estara disponible en `http://localhost:4321`.

### Credenciales por defecto

| Campo | Valor |
|---|---|
| Email | `admin@health.com` |
| Contrasena | `admin123` |

> Se solicita cambio de contrasena en el primer inicio de sesion.

## Estructura del Proyecto

```
Health-web/
  backend/
    app/
      main.py                    # Punto de entrada FastAPI
      storage.py                 # Subida/manejo de archivos
      auth/                      # Autenticacion JWT y dependencias
      config/                    # Configuracion, timezone, adherencia
      core/                      # Seguridad (bcrypt)
      database/                  # Engine, sesiones, seed
      models/                    # Modelos SQLAlchemy (17 modelos)
      routers/                   # Endpoints organizados por dominio
      schemas/                   # Schemas Pydantic (request/response)
      services/                  # Logica compartida (audit logging)
    alembic/                     # Migraciones de base de datos
    sql/                         # Schema SQL historico
    docs/                        # Documentacion
    uploads/                     # Archivos subidos (gitignored)
    requirements.txt
    .env.example
  frontend/
    src/
      components/                # Componentes React
        ui/                      # Componentes shadcn/ui base
        auth/                    # Login, registro, cambio de contrasena
        dashboard/               # Panel principal
        body-metrics/            # Metricas corporales y metas de peso
        medical-history/         # Historial medico completo
        users/                   # Administracion de usuarios
        roles/                   # Administracion de roles
        permissions/             # Administracion de permisos
        activity/                # Registro de auditoria
        profile/                 # Perfil de usuario
      lib/                       # API client, tipos, router, auth
      hooks/                     # Custom hooks
      layouts/                   # Layout HTML base
      pages/                     # Entry point Astro
      styles/                    # CSS global
    package.json
    astro.config.mjs
```

## Modulos Funcionales

### Panel Principal
- Resumen de roles, permisos y modulos del usuario autenticado

### Metricas Corporales
- Registro de peso, IMC, cintura, pecho y brazo
- Graficos de evolucion con ECharts
- Historial cronologico con edicion y eliminacion

### Metas de Peso
- Creacion de metas con peso inicial, peso objetivo y fecha limite
- Seguimiento de progreso con porcentaje calculado
- Historial de metas (activas, logradas, abandonadas)

### Historial Medico

| Submodulo | Funcionalidad |
|---|---|
| **Perfil de Salud** | Datos medicos personales (alergias, condiciones cronicas, tipo de sangre, contacto de emergencia) |
| **Doctores** | Catalogo de medicos con especialidad, licencia y contacto |
| **Especialidades** | Gestion de especialidades medicas |
| **Citas** | Agenda con vista de calendario, estados (pendiente/completada/cancelada), seguimientos |
| **Recetas** | Recetas medicas con medicamentos, dosis, frecuencia y duracion. Adjunto opcional de escaneo/foto |
| **Medicamentos** | Catalogo de medicamentos con nombre generico, marca y presentacion |
| **Documentos** | Subida, descarga, busqueda y filtrado de archivos medicos (PDF, imagenes, Word) |
| **Tratamiento Activo** | Registro diario de adherencia a medicamentos con estados (tomada/saltada/tarde/pendiente) |
| **Reportes** | Generacion de 6 tipos de reportes PDF con graficos |

### Administracion (solo admin/manager)
- Gestion de usuarios con asignacion de roles
- Gestion de roles con asignacion de permisos
- Gestion de permisos por modulo
- Registro de auditoria con filtros

## API Endpoints

Todos los endpoints estan bajo el prefijo `/api/v1`.

| Modulo | Prefijo | Endpoints principales |
|---|---|---|
| Auth | `/auth` | Login, register, logout, refresh, me, change-password |
| Users | `/users` | CRUD, assign roles, manage sessions |
| Roles | `/roles` | CRUD, assign permissions |
| Permissions | `/permissions` | List, create, filter by module |
| Activity | `/activity` | Audit logs with filters |
| Body Metrics | `/body-metrics` | CRUD, get latest |
| Weight Goals | `/weight-goals` | CRUD, achieve/abandon, progress |
| Medical History | `/medical-history` | Profile, doctors, appointments, prescriptions, medications, documents, adherence |
| Reports | `/reports` | 6 PDF report endpoints |

## Autenticacion y Permisos

### RBAC (Role-Based Access Control)

El sistema implementa control de acceso basado en roles con tres niveles:

| Rol | Descripcion | Acceso |
|---|---|---|
| **admin** | Administrador total | Todos los permisos |
| **manager** | Gestor | Reportes, usuarios (lectura), metricas, metas, historial medico |
| **user** | Usuario basico | Metricas, metas, historial medico (lectura y escritura) |

### Modulos de permisos

| Modulo | Permisos |
|---|---|
| `users` | create, read, update, delete, sessions |
| `roles` | create, read, update, delete |
| `permissions` | create, read |
| `body_metrics` | create, read, update, delete |
| `weight_goals` | create, read, update, delete |
| `medical_history` | create, read, update, delete |
| `reports` | read |
| `activity` | read |

### JWT

- Access tokens con expiracion configurable (default: 15 minutos)
- Refresh tokens con rotacion (default: 7 dias)
- Invalidacion de sesiones por `token_version`
- Cambio forzado de contrasena en primer inicio de sesion

## Base de Datos

Soporta dos motores intercambiables cambiando unica la variable `DATABASE_URL`:

| Motor | URL | Uso |
|---|---|---|
| **SQLite** | `sqlite:///./health.db` | Desarrollo local |
| **MySQL** | `mysql+pymysql://user:pass@host:3306/health_db` | Produccion |

Las migraciones se gestionan con Alembic y son compatibles con ambos motores.

### Modelos principales (17 tablas)

`users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `refresh_tokens`, `activity_logs`, `body_metrics`, `weight_goals`, `patient_profiles`, `specialties`, `doctors`, `appointments`, `prescriptions`, `medications`, `prescription_details`, `medical_documents`, `adherence_records`

## Reportes PDF

Seis tipos de reportes generados desde el backend con fpdf2 y graficos con matplotlib:

| Reporte | Endpoint | Filtro de fechas | Graficos |
|---|---|---|---|
| Resumen de Salud | `/reports/health-summary` | No | Pie de adherencia |
| Historial de Peso | `/reports/weight-history` | Si | Linea de peso, area IMC |
| Historial de Recetas | `/reports/prescriptions` | Si | Pie de estado de medicamentos |
| Historial de Citas | `/reports/appointments` | Si | Pie por estado, barras por doctor |
| Adherencia a Medicamentos | `/reports/adherence` | Si (default 30 dias) | Pie general, barras comparativas |
| Ficha del Paciente | `/reports/patient-profile` | No | Sin graficos |

Los reportes se descargan como archivos PDF con encabezado, pie de pagina, tablas y graficos integrados.

## Licencia

AGPL3 
