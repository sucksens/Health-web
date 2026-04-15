from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permissions
from app.database.db import get_db
from app.models.permission import Permission
from app.models.role import Role
from app.schemas.role import AssignPermissionsRequest, RoleCreate, RoleOut, RoleUpdate
from app.services import log_activity

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get(
    "",
    response_model=list[RoleOut],
    dependencies=[Depends(require_permissions("roles:read"))],
)
def list_roles(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    result = db.execute(select(Role).offset(skip).limit(limit))
    return result.scalars().all()


@router.get(
    "/{role_id}",
    response_model=RoleOut,
    dependencies=[Depends(require_permissions("roles:read"))],
)
def get_role(role_id: int, db: Session = Depends(get_db)):
    role = db.execute(select(Role).where(Role.id == role_id)).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado"
        )
    return role


@router.post(
    "",
    response_model=RoleOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("roles:create"))],
)
def create_role(body: RoleCreate, request: Request, db: Session = Depends(get_db)):
    existing = db.execute(
        select(Role).where(Role.name == body.name)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un rol con ese nombre",
        )

    role = Role(name=body.name, description=body.description)
    db.add(role)
    db.flush()
    db.refresh(role)

    log_activity(
        db,
        action="create_role",
        module="roles",
        type="action",
        details={"role_id": role.id, "name": role.name},
        request=request,
    )

    return role


@router.patch(
    "/{role_id}",
    response_model=RoleOut,
    dependencies=[Depends(require_permissions("roles:update"))],
)
def update_role(
    role_id: int, body: RoleUpdate, request: Request, db: Session = Depends(get_db)
):
    role = db.execute(select(Role).where(Role.id == role_id)).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado"
        )

    changes = body.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(role, key, value)

    db.flush()
    db.refresh(role)

    log_activity(
        db,
        action="update_role",
        module="roles",
        type="action",
        details={"role_id": role_id, "changes": changes},
        request=request,
    )

    return role


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("roles:delete"))],
)
def delete_role(role_id: int, request: Request, db: Session = Depends(get_db)):
    role = db.execute(select(Role).where(Role.id == role_id)).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado"
        )

    log_activity(
        db,
        action="delete_role",
        module="roles",
        type="action",
        details={"role_id": role_id, "name": role.name},
        request=request,
    )

    db.delete(role)


@router.post(
    "/{role_id}/permissions",
    response_model=RoleOut,
    dependencies=[Depends(require_permissions("roles:update", "permissions:read"))],
)
def assign_permissions(
    role_id: int,
    body: AssignPermissionsRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    role = db.execute(select(Role).where(Role.id == role_id)).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado"
        )

    perms = (
        db.execute(select(Permission).where(Permission.id.in_(body.permission_ids)))
        .scalars()
        .all()
    )

    if len(perms) != len(body.permission_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uno o mas permisos no existen",
        )

    role.permissions = list(perms)
    db.flush()
    db.refresh(role)

    log_activity(
        db,
        action="assign_permissions",
        module="roles",
        type="action",
        details={
            "role_id": role_id,
            "role_name": role.name,
            "permission_ids": body.permission_ids,
        },
        request=request,
    )

    return role
