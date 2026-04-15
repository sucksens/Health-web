from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser
from app.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.core.security import hash_password, verify_password
from app.database.db import get_db
from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenData, TokenResponse
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])


def _build_tokens(user: User, db: Session) -> TokenResponse:
    roles = [r.name for r in user.roles]
    permissions: list[str] = []
    for role in user.roles:
        permissions.extend(p.code for p in role.permissions)

    token_data = TokenData(
        user_id=user.id,
        username=user.username,
        roles=roles,
        permissions=list(set(permissions)),
    )
    access_token = create_access_token(token_data, token_version=user.token_version)
    refresh_token_str, jti, expires_at = create_refresh_token(user.id)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_jti=jti,
            expires_at=expires_at,
        )
    )
    db.flush()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    body: UserCreate,
    db: Session = Depends(get_db),
):
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

    default_role = db.execute(
        select(Role).where(Role.name == "user")
    ).scalar_one_or_none()

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
        roles=[default_role] if default_role else [],
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.execute(
        select(User).where(User.username == body.username)
    ).scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )

    return _build_tokens(user, db)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    body: RefreshRequest,
    db: Session = Depends(get_db),
):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido",
            )
        user_id = int(payload["sub"])
        jti = payload["jti"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
        )

    stored_token = db.execute(
        select(RefreshToken).where(
            RefreshToken.token_jti == jti,
            RefreshToken.revoked_at.is_(None),
        )
    ).scalar_one_or_none()

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesion no encontrada o ya fue revocada",
        )

    if stored_token.expires_at.replace(tzinfo=None) < datetime.now(
        timezone.utc
    ).replace(tzinfo=None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expirado",
        )

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no valido",
        )

    stored_token.revoked_at = datetime.now(timezone.utc)

    return _build_tokens(user, db)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    body: RefreshRequest,
    db: Session = Depends(get_db),
):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            return
        jti = payload.get("jti")
    except Exception:
        return

    stored_token = db.execute(
        select(RefreshToken).where(RefreshToken.token_jti == jti)
    ).scalar_one_or_none()

    if stored_token and stored_token.revoked_at is None:
        stored_token.revoked_at = datetime.now(timezone.utc)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(current_user: CurrentUser, db: Session = Depends(get_db)):
    current_user.token_version += 1

    db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: CurrentUser):
    return current_user
