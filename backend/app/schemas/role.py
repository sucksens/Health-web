from pydantic import BaseModel, Field

from app.schemas.permission import PermissionOut


class RoleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = None


class RoleOut(BaseModel):
    id: int
    name: str
    description: str | None
    permissions: list[PermissionOut] = []

    model_config = {"from_attributes": True}


class AssignPermissionsRequest(BaseModel):
    permission_ids: list[int] = Field(..., min_length=1)
