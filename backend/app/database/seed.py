from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User

_VERSION_FILE = Path(__file__).resolve().parents[2] / "VERSION"


def _read_version() -> str:
    try:
        return _VERSION_FILE.read_text().strip()
    except FileNotFoundError:
        return "0.0.0"


def _get_applied_versions(db: Session) -> set[str]:
    result = db.execute(text("SELECT version FROM seed_version")).scalars().all()
    return set(result)


def _mark_applied(db: Session, version: str) -> None:
    db.execute(text("INSERT INTO seed_version (version) VALUES (:v)"), {"v": version})
    db.flush()


def _ensure_roles(db: Session, roles: list[dict]) -> dict[str, Role]:
    existing = {r.name: r for r in db.execute(select(Role)).scalars().all()}
    for rd in roles:
        if rd["name"] not in existing:
            role = Role(**rd)
            db.add(role)
            db.flush()
            existing[rd["name"]] = role
    return existing


def _ensure_permissions(db: Session, perms: list[tuple]) -> dict[str, Permission]:
    existing = {p.code: p for p in db.execute(select(Permission)).scalars().all()}
    for code, desc, module in perms:
        if code in existing:
            if existing[code].description != desc or existing[code].module != module:
                existing[code].description = desc
                existing[code].module = module
        else:
            perm = Permission(code=code, description=desc, module=module)
            db.add(perm)
            db.flush()
            existing[code] = perm
    return existing


def _sync_role_permissions(
    db: Session,
    roles: dict[str, Role],
    perms: dict[str, Permission],
    role_permissions: dict[str, set[str]],
) -> None:
    for role_name, perm_codes in role_permissions.items():
        role = roles[role_name]
        current_codes = {p.code for p in role.permissions}

        missing = perm_codes - current_codes
        if missing:
            role.permissions = list(set(role.permissions)) + [perms[c] for c in missing]

        extra = current_codes - perm_codes
        if extra:
            role.permissions = [p for p in role.permissions if p.code not in extra]

    db.flush()


_ROLES_V040 = [
    {"name": "admin", "description": "Administrador total del sistema"},
    {
        "name": "manager",
        "description": "Gestor con permisos de lectura/escritura limitados",
    },
    {"name": "user", "description": "Usuario basico con acceso de solo lectura"},
]

_PERMISSIONS_V040 = [
    ("users:create", "Crear usuarios", "users"),
    ("users:read", "Leer usuarios", "users"),
    ("users:update", "Actualizar usuarios", "users"),
    ("users:delete", "Eliminar usuarios", "users"),
    ("users:sessions", "Gestionar sesiones de usuarios", "users"),
    ("roles:create", "Crear roles", "roles"),
    ("roles:read", "Leer roles", "roles"),
    ("roles:update", "Actualizar roles", "roles"),
    ("roles:delete", "Eliminar roles", "roles"),
    ("permissions:create", "Crear permisos", "permissions"),
    ("permissions:read", "Leer permisos", "permissions"),
    ("reports:read", "Leer reportes", "reports"),
    ("activity:read", "Leer registro de auditoria", "activity"),
    ("body_metrics:create", "Crear mediciones corporales", "body_metrics"),
    ("body_metrics:read", "Leer mediciones corporales", "body_metrics"),
    ("body_metrics:update", "Actualizar mediciones corporales", "body_metrics"),
    ("body_metrics:delete", "Eliminar mediciones corporales", "body_metrics"),
    ("weight_goals:create", "Crear metas de peso", "weight_goals"),
    ("weight_goals:read", "Leer metas de peso", "weight_goals"),
    ("weight_goals:update", "Actualizar metas de peso", "weight_goals"),
    ("weight_goals:delete", "Eliminar metas de peso", "weight_goals"),
    ("medical_history:create", "Crear registros medicos", "medical_history"),
    ("medical_history:read", "Leer registros medicos", "medical_history"),
    ("medical_history:update", "Actualizar registros medicos", "medical_history"),
    ("medical_history:delete", "Eliminar registros medicos", "medical_history"),
    ("blood_pressure:create", "Registrar presion arterial", "blood_pressure"),
    ("blood_pressure:read", "Leer presion arterial", "blood_pressure"),
    ("blood_pressure:update", "Actualizar presion arterial", "blood_pressure"),
    ("blood_pressure:delete", "Eliminar presion arterial", "blood_pressure"),
]

_ADMIN_PERMISSIONS_V040 = {p[0] for p in _PERMISSIONS_V040}
_MANAGER_PERMISSIONS_V040 = {
    "reports:read",
    "users:read",
    "body_metrics:create",
    "body_metrics:read",
    "body_metrics:update",
    "body_metrics:delete",
    "weight_goals:create",
    "weight_goals:read",
    "weight_goals:update",
    "weight_goals:delete",
    "medical_history:create",
    "medical_history:read",
    "medical_history:update",
    "medical_history:delete",
    "blood_pressure:create",
    "blood_pressure:read",
    "blood_pressure:update",
    "blood_pressure:delete",
}
_USER_PERMISSIONS_V040 = {
    "body_metrics:create",
    "body_metrics:read",
    "body_metrics:update",
    "body_metrics:delete",
    "weight_goals:create",
    "weight_goals:read",
    "weight_goals:update",
    "weight_goals:delete",
    "medical_history:create",
    "medical_history:read",
    "medical_history:update",
    "medical_history:delete",
    "blood_pressure:create",
    "blood_pressure:read",
    "blood_pressure:update",
    "blood_pressure:delete",
}

_ROLE_PERMISSIONS_V040 = {
    "admin": _ADMIN_PERMISSIONS_V040,
    "manager": _MANAGER_PERMISSIONS_V040,
    "user": _USER_PERMISSIONS_V040,
}

_ADMIN_USER_V040 = {
    "email": "admin@health.com",
    "username": "admin",
    "password": "admin123",
}


def _seed_v040(db: Session) -> None:
    roles = _ensure_roles(db, _ROLES_V040)
    perms = _ensure_permissions(db, _PERMISSIONS_V040)
    _sync_role_permissions(db, roles, perms, _ROLE_PERMISSIONS_V040)

    admin = db.execute(
        select(User).where(User.username == _ADMIN_USER_V040["username"])
    ).scalar_one_or_none()
    if not admin:
        admin = User(
            email=_ADMIN_USER_V040["email"],
            username=_ADMIN_USER_V040["username"],
            hashed_password=hash_password(_ADMIN_USER_V040["password"]),
            roles=[roles["admin"]],
        )
        db.add(admin)
        db.flush()

    db.commit()


SEED_MIGRATIONS: dict[str, "callable"] = {
    "0.4.0": _seed_v040,
}


def seed_db(db: Session) -> None:
    applied = _get_applied_versions(db)
    app_version = _read_version()

    for version in sorted(SEED_MIGRATIONS, key=lambda v: list(map(int, v.split(".")))):
        if version not in applied:
            print(f"  Aplicando seed v{version}...")
            SEED_MIGRATIONS[version](db)
            _mark_applied(db, version)
            db.commit()
            print(f"  Seed v{version} aplicado")

    if app_version not in applied and app_version not in SEED_MIGRATIONS:
        print(f"  Nota: no hay seed especifico para v{app_version}, omitiendo")
