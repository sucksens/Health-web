from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User

_ROLES = [
    {"name": "admin", "description": "Administrador total del sistema"},
    {
        "name": "manager",
        "description": "Gestor con permisos de lectura/escritura limitados",
    },
    {"name": "user", "description": "Usuario basico con acceso de solo lectura"},
]

_PERMISSIONS = [
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
    ("expenses:create", "Crear gastos", "expenses"),
    ("expenses:read", "Leer gastos", "expenses"),
    ("expenses:update", "Actualizar gastos", "expenses"),
    ("expenses:delete", "Eliminar gastos", "expenses"),
    ("reports:read", "Leer reportes", "reports"),
    ("activity:read", "Leer registro de auditoria", "activity"),
    ("body_metrics:create", "Crear mediciones corporales", "body_metrics"),
    ("body_metrics:read", "Leer mediciones corporales", "body_metrics"),
    ("body_metrics:update", "Actualizar mediciones corporales", "body_metrics"),
    ("body_metrics:delete", "Eliminar mediciones corporales", "body_metrics"),
]

_ADMIN_PERMISSIONS = {p[0] for p in _PERMISSIONS}
_MANAGER_PERMISSIONS = {
    "expenses:create",
    "expenses:read",
    "expenses:update",
    "expenses:delete",
    "reports:read",
    "users:read",
    "body_metrics:create",
    "body_metrics:read",
    "body_metrics:update",
    "body_metrics:delete",
}
_USER_PERMISSIONS = {
    "expenses:read",
    "expenses:create",
    "body_metrics:create",
    "body_metrics:read",
    "body_metrics:update",
    "body_metrics:delete",
}

_ROLE_PERMISSIONS = {
    "admin": _ADMIN_PERMISSIONS,
    "manager": _MANAGER_PERMISSIONS,
    "user": _USER_PERMISSIONS,
}

_ADMIN_USER = {
    "email": "admin@gastos.com",
    "username": "admin",
    "password": "admin123",
}


def seed_db(db: Session) -> None:
    existing_roles = {r.name: r for r in db.execute(select(Role)).scalars().all()}
    for role_data in _ROLES:
        if role_data["name"] not in existing_roles:
            role = Role(**role_data)
            db.add(role)
            db.flush()
            existing_roles[role_data["name"]] = role

    existing_perms = {p.code: p for p in db.execute(select(Permission)).scalars().all()}
    for code, desc, module in _PERMISSIONS:
        if code not in existing_perms:
            perm = Permission(code=code, description=desc, module=module)
            db.add(perm)
            db.flush()
            existing_perms[code] = perm

    for role_name, perm_codes in _ROLE_PERMISSIONS.items():
        role = existing_roles[role_name]
        current_codes = {p.code for p in role.permissions}
        missing = perm_codes - current_codes
        if missing:
            role.permissions = list(set(role.permissions)) + [
                existing_perms[c] for c in missing
            ]
    db.flush()

    admin = db.execute(
        select(User).where(User.username == _ADMIN_USER["username"])
    ).scalar_one_or_none()
    if not admin:
        admin_role = existing_roles["admin"]
        admin = User(
            email=_ADMIN_USER["email"],
            username=_ADMIN_USER["username"],
            hashed_password=hash_password(_ADMIN_USER["password"]),
            roles=[admin_role],
        )
        db.add(admin)
        db.flush()

    db.commit()
