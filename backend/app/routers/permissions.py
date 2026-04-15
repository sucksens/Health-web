from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permissions
from app.database.db import get_db
from app.models.permission import Permission
from app.schemas.permission import PermissionCreate, PermissionOut

router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.get(
    "",
    response_model=list[PermissionOut],
    dependencies=[Depends(require_permissions("permissions:read"))],
)
def list_permissions(
    module: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = select(Permission).offset(skip).limit(limit)
    if module:
        query = query.where(Permission.module == module)
    result = db.execute(query)
    return result.scalars().all()


@router.post(
    "",
    response_model=PermissionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("permissions:create"))],
)
def create_permission(body: PermissionCreate, db: Session = Depends(get_db)):
    existing = db.execute(
        select(Permission).where(Permission.code == body.code)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un permiso con ese codigo",
        )

    permission = Permission(
        code=body.code,
        description=body.description,
        module=body.module,
    )
    db.add(permission)
    db.flush()
    db.refresh(permission)
    return permission
