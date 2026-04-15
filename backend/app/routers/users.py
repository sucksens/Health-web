from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permissions
from app.core.security import hash_password
from app.database.db import get_db
from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.user import User
from app.schemas.user import (
    AssignRoleRequest,
    SessionOut,
    UserAdminCreate,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("users:create"))],
)
def create_user(body: UserAdminCreate, db: Session = Depends(get_db)):
    existing = db.execute(
        select(User).where(
            (User.email == body.email) | (User.username == body.username)
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email o username ya existe",
        )

    roles = []
    if body.role_ids:
        roles = (
            db.execute(select(Role).where(Role.id.in_(body.role_ids))).scalars().all()
        )
        if len(roles) != len(body.role_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Uno o mas roles no existen",
            )

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
        is_active=body.is_active,
        roles=roles,
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    return user


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


@router.get(
    "/{user_id}/sessions",
    response_model=list[SessionOut],
    dependencies=[Depends(require_permissions("users:sessions"))],
)
def list_sessions(user_id: int, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    tokens = (
        db.execute(
            select(RefreshToken)
            .where(RefreshToken.user_id == user_id)
            .order_by(RefreshToken.created_at.desc())
        )
        .scalars()
        .all()
    )

    now = datetime.now(timezone.utc)
    return [
        SessionOut(
            id=t.id,
            token_jti=t.token_jti,
            created_at=t.created_at,
            expires_at=t.expires_at,
            revoked_at=t.revoked_at,
            is_active=t.revoked_at is None
            and t.expires_at.replace(tzinfo=None) >= now.replace(tzinfo=None),
        )
        for t in tokens
    ]


@router.post(
    "/{user_id}/invalidate-sessions",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("users:sessions"))],
)
def invalidate_sessions(user_id: int, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    user.token_version += 1

    db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )
