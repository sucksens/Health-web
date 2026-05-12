# Testing del Backend

## Stack tecnologico

| Herramienta | Version | Proposito |
|---|---|---|
| pytest | >= 8.0 | Framework de testing |
| httpx | >= 0.28 | Cliente HTTP para TestClient |
| SQLite | - | Base de datos temporal por sesion de test |
| ruff | >= 0.11 | Linter |
| mypy | >= 1.15 | Type checker |

```
backend/
├── pytest.ini                 # Configuracion de pytest
├── requirements-dev.txt        # Dependencias de desarrollo
├── tests/
│   ├── conftest.py             # Fixtures compartidos
│   ├── test_auth.py            # Auth (register, login, me, refresh, logout, change-password)
│   ├── test_body_metrics.py    # Body metrics CRUD
│   ├── test_medical_history.py # Medical history (profile, specialties, doctors, appointments, medications, prescriptions)
│   ├── test_permissions.py     # Permisos (list, filter, create)
│   ├── test_roles.py           # Roles (list, CRUD, assign-permissions)
│   ├── test_users.py           # Usuarios (list, create, get, update, delete, assign-roles)
│   └── test_weight_goals.py    # Weight goals (create, list, active, achieve, abandon, delete)
```

---

## Configuración

### `pytest.ini`

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
python_classes = Test*
pythonpath = .
addopts = -v --tb=short
```

### `requirements-dev.txt`

```
-r requirements.txt
pytest>=8.0
httpx>=0.28
ruff>=0.11
mypy>=1.15
```

### Como ejecutar los tests

```bash
# Todos los tests
pytest

# Tests de un archivo especifico
pytest tests/test_auth.py -v

# Tests que coincidan con un patron
pytest -k "test_register"

# Con cobertura (requiere pytest-cov)
pytest --cov=app tests/
```

---

## Fixtures (`conftest.py`)

### Ciclo de vida de la BD de tests

1. **Session setup** (`engine`): Crea `test_health.db` + todas las tablas ORM
2. **Por cada test** (`db`): Abre conexion + transaccion → ejecuta `seed_db()` → **yield** → rollback
3. **Session teardown** (`engine`): Dropea tablas + elimina `test_health.db`

Esto garantiza:
- Cada test arranca con los mismos datos seedeados
- Ningun test afecta a otro (aislamiento total via rollback)
- No se necesita limpieza manual en cada test

### Fixture `engine` (session scope)

```python
@pytest.fixture(scope="session")
def engine():
    eng = create_engine("sqlite:///./test_health.db", connect_args={"check_same_thread": False})
    import app.models
    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)
    eng.dispose()
    os.remove("test_health.db")
```

### Fixture `db` (function scope)

```python
@pytest.fixture(scope="function")
def db(engine):
    connection = engine.connect()
    transaction = connection.begin()
    TestSession = sessionmaker(bind=connection, expire_on_commit=False)
    session = TestSession()
    seed_db(session)           # Seed: 3 roles, 26 permisos, 1 admin
    yield session
    session.close()
    transaction.rollback()     # Descarta todo lo hecho en el test
    connection.close()
```

### Fixture `client` (function scope)

```python
@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

### Fixtures de autenticacion

```python
@pytest.fixture
def admin_token(client):
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    return r.json()["access_token"]

@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def register_user(client):
    def _register(username="testuser", email="testuser@test.com", password="test123456"):
        return client.post("/api/v1/auth/register", json={"email": email, "username": username, "password": password})
    return _register

@pytest.fixture
def user_client(client, register_user):
    register_user()
    r = client.post("/api/v1/auth/login", json={"username": "testuser", "password": "test123456"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
```

---

## Datos iniciales (seed)

El seed ejecutado por `seed_db()` en cada test inserta:

### Roles

| Nombre | Descripcion |
|---|---|
| `admin` | Todos los permisos (26) |
| `manager` | Permisos de lectura + reports + body_metrics + weight_goals + medical_history |
| `user` | Solo body_metrics + weight_goals + medical_history |

### Usuario admin por defecto

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@health.com`
- **Rol**: `admin`

---

## Patrón de tests

### Organización

Los tests se organizan en **clases** que agrupan operaciones sobre un mismo recurso/accion:

```
class Test<Resource><Action>:
    def test_<scenario>(self, client, <fixtures>):
        # Arrange (opcional: preparar datos via API)
        # Act (llamada HTTP)
        r = client.<method>("<path>", headers=..., json=...)
        # Assert (status + body)
        assert r.status_code == <expected>
        assert <validaciones>
```

### Escenarios estandar por endpoint

| Escenario | Status code | Ejemplo |
|---|---|---|
| **Success (creacion)** | `201` | `test_register_success` |
| **Success (lectura)** | `200` | `test_list_metrics` |
| **Success (sin contenido)** | `204` | `test_delete_user` |
| **Validacion** | `422` | `test_register_short_password` |
| **No autenticado** | `401` | `test_me_unauthenticated` |
| **Sin permisos (RBAC)** | `403` | `test_list_users_as_regular_user_forbidden` |
| **No encontrado** | `404` | `test_get_nonexistent_user` |
| **Conflicto/Duplicado** | `409` | `test_register_duplicate_email` |
| **Bad request** | `400` | `test_change_password_wrong_current` |

---

## Cobertura actual (router ↔ tests)

| Router | Test file | Endpoints cubiertos | Endpoints sin test |
|---|---|---|---|
| `auth.py` | `test_auth.py` | register, login, me, refresh, change-password, logout, logout-all, health | — |
| `users.py` | `test_users.py` | list, create, get, update, delete, assign-roles | — |
| `body_metrics.py` | `test_body_metrics.py` | create, list, latest, update, delete | — |
| `weight_goals.py` | `test_weight_goals.py` | create, list, active, achieve, abandon, delete | `GET /{goal_id}`, `PATCH /{goal_id}`, `GET /{goal_id}/details` |
| `medical_history.py` | `test_medical_history.py` | profile (get/upsert), specialties (CRUD), doctors (CRUD), appointments (CRUD), medications (CRUD), prescriptions (create/list) | `GET /prescriptions/{rx_id}`, `PATCH /prescriptions/{rx_id}`, `DELETE /prescriptions/{rx_id}`, `POST|PATCH|DELETE /prescriptions/{rx_id}/details`, documents (list, upload, get, download, delete), adherence (today, history, create, update) |
| `roles.py` | `test_roles.py` | list, create, get, update, delete, assign-permissions | — |
| `permissions.py` | `test_permissions.py` | list, filter, create | — |
| `activity.py` | **❌ sin tests** | — | `GET /activity` (list con filtros) |
| `reports.py` | **❌ sin tests** | — | 6 endpoints PDF: health-summary, weight-history, prescriptions, appointments, adherence, patient-profile |

---

## Guia: Como crear tests para un nuevo endpoint

### Paso 1: Crear el archivo de test

Crear `backend/tests/test_<resource>.py` siguiendo la convencion de nombres.

### Paso 2: Importar y definir la clase

```python
# tests/test_activity.py
class TestActivityList:
    ...
```

### Paso 3: Elegir el fixture de autenticacion

| Fixture | Cuando usarlo |
|---|---|
| `client` solo | Endpoints publicos (`/health`, register) |
| `client` + `admin_headers` | Endpoints que requieren rol admin |
| `client` + `user_client` | Endpoints accesibles por usuario regular (para probar RBAC o funcionalidad de usuario) |

### Paso 4: Escribir los escenarios

```python
class TestActivityList:
    def test_list_activity_as_admin(self, client, admin_headers):
        r = client.get("/api/v1/activity", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_activity_forbidden_for_user(self, client, user_client):
        r = client.get("/api/v1/activity", headers=user_client)
        assert r.status_code == 403

    def test_list_activity_unauthenticated(self, client):
        r = client.get("/api/v1/activity")
        assert r.status_code == 401
```

### Paso 5: Escenarios recomendados para cada operacion

| Operacion HTTP | Escenarios minimos |
|---|---|
| `GET /resource` | 200 (lista), 403 (sin permiso), 401 (sin auth) |
| `GET /resource/{id}` | 200 (item), 404 (no existe), 401, 403 |
| `POST /resource` | 201 (creado), 422 (datos invalidos), 409 (duplicado), 401, 403 |
| `PATCH /resource/{id}` | 200 (actualizado), 404, 422, 401, 403 |
| `DELETE /resource/{id}` | 204 (eliminado), 404, 401, 403 |
| Accion (`POST /resource/{id}/action`) | 200 (exito), 404, 401, 403 |

### Paso 6: Ejecutar y verificar

```bash
pytest tests/test_activity.py -v
```

---

## Ejemplo completo: test para un endpoint nuevo

Suponiendo que se agrega un endpoint `GET /api/v1/activity`:

```python
# tests/test_activity.py
class TestActivityList:
    def test_list_activity_as_admin(self, client, admin_headers):
        r = client.get("/api/v1/activity", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_activity_filtered_by_module(self, client, admin_headers):
        r = client.get("/api/v1/activity?module=auth", headers=admin_headers)
        assert r.status_code == 200
        for log in r.json():
            assert log["module"] == "auth"

    def test_list_activity_forbidden_for_user(self, client, user_client):
        r = client.get("/api/v1/activity", headers=user_client)
        assert r.status_code == 403

    def test_list_activity_unauthenticated(self, client):
        r = client.get("/api/v1/activity")
        assert r.status_code == 401
```

---

## Notas importantes

- Los tests usan **SQLite en memoria/archivo**, no la BD real. Los cambios nunca persisten.
- Cada test arranca con datos frescos gracias al **rollback de transaccion**.
- No se necesita ni `setUp`/`tearDown` ni `@classmethod`: las fixtures de pytest lo manejan.
- El usuario `user_client` se registra con credenciales fijas: `testuser`/`test123456`.
- Para probar permisos especificos, se usa `admin_headers` (tiene todos los permisos) o `user_client` (solo los del rol `user`).
- Los nombres de los tests deben ser descriptivos: `test_<accion>_<escenario>`.
