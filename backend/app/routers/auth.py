from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
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
from app.schemas.user import (
    UserCreate,
    UserOut,
    ChangePasswordRequest,
    ForceChangePasswordRequest,
)
from app.services import log_activity

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
    request: Request,
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

    log_activity(
        db,
        action="register",
        module="auth",
        type="auth",
        user_id=user.id,
        details={"username": user.username, "email": user.email},
        request=request,
    )

    return user


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = db.execute(
        select(User).where(User.username == body.username)
    ).scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        log_activity(
            db,
            action="login_failed",
            module="auth",
            type="error",
            details={"username": body.username, "reason": "credenciales_incorrectas"},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not user.is_active:
        log_activity(
            db,
            action="login_failed",
            module="auth",
            type="error",
            user_id=user.id,
            details={"username": body.username, "reason": "cuenta_desactivada"},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )

    if user.must_change_password:
        log_activity(
            db,
            action="login_must_change_password",
            module="auth",
            type="auth",
            user_id=user.id,
            details={"username": user.username},
            request=request,
        )
        response = _build_tokens(user, db)
        return response

    log_activity(
        db,
        action="login",
        module="auth",
        type="auth",
        user_id=user.id,
        details={"username": user.username},
        request=request,
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
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            return
        jti = payload.get("jti")
        user_id = int(payload.get("sub", 0))
    except Exception:
        return

    stored_token = db.execute(
        select(RefreshToken).where(RefreshToken.token_jti == jti)
    ).scalar_one_or_none()

    if stored_token and stored_token.revoked_at is None:
        stored_token.revoked_at = datetime.now(timezone.utc)

    if user_id:
        log_activity(
            db,
            action="logout",
            module="auth",
            type="auth",
            user_id=user_id,
            request=request,
        )


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(
    current_user: CurrentUser, request: Request, db: Session = Depends(get_db)
):
    current_user.token_version += 1

    db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )

    log_activity(
        db,
        action="logout_all",
        module="auth",
        type="auth",
        user_id=current_user.id,
        details={"username": current_user.username},
        request=request,
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: CurrentUser):
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        log_activity(
            db,
            action="change_password_failed",
            module="auth",
            type="error",
            user_id=current_user.id,
            details={"reason": "contrasena_actual_incorrecta"},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contrasena actual es incorrecta",
        )

    current_user.hashed_password = hash_password(body.new_password)
    current_user.must_change_password = False
    current_user.token_version += 1

    db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )

    log_activity(
        db,
        action="change_password",
        module="auth",
        type="auth",
        user_id=current_user.id,
        details={"username": current_user.username},
        request=request,
    )


@router.post("/force-change-password", response_model=TokenResponse)
def force_change_password(
    body: ForceChangePasswordRequest,
    request: Request,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    if not current_user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se requiere cambio de contrasena",
        )

    if body.new_password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las contrasenas no coinciden",
        )

    current_user.hashed_password = hash_password(body.new_password)
    current_user.must_change_password = False
    current_user.token_version += 1

    db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )

    log_activity(
        db,
        action="force_change_password",
        module="auth",
        type="auth",
        user_id=current_user.id,
        details={"username": current_user.username},
        request=request,
    )

    return _build_tokens(current_user, db)
