from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permissions
from app.database.db import get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.user import AssignRoleRequest, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "",
    response_model=list[UserOut],
    dependencies=[Depends(require_permissions("users:read"))],
)
def list_users(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    result = db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()


@router.get(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_permissions("users:read"))],
)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    return user


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_permissions("users:update"))],
)
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(user, key, value)

    db.flush()
    db.refresh(user)
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("users:delete"))],
)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    db.delete(user)


@router.post(
    "/{user_id}/roles",
    response_model=UserOut,
    dependencies=[Depends(require_permissions("users:update", "roles:update"))],
)
def assign_roles(user_id: int, body: AssignRoleRequest, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    roles = db.execute(select(Role).where(Role.id.in_(body.role_ids))).scalars().all()

    if len(roles) != len(body.role_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uno o mas roles no existen",
        )

    user.roles = list(roles)
    db.flush()
    db.refresh(user)
    return user
