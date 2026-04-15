from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.role import RoleOut


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=6, max_length=128)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(default=None, min_length=3, max_length=150)
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    must_change_password: bool | None = None


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    first_name: str | None
    last_name: str | None
    is_active: bool
    must_change_password: bool
    created_at: datetime
    roles: list[RoleOut] = []

    model_config = {"from_attributes": True}


class UserAdminCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=6, max_length=128)
    is_active: bool = True
    role_ids: list[int] = []


class AssignRoleRequest(BaseModel):
    role_ids: list[int] = Field(..., min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class ForceChangePasswordRequest(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)
    confirm_password: str = Field(min_length=6, max_length=128)


class SessionOut(BaseModel):
    id: int
    token_jti: str
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    is_active: bool

    model_config = {"from_attributes": True}
