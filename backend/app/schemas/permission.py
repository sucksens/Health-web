from pydantic import BaseModel, Field


class PermissionCreate(BaseModel):
    code: str = Field(min_length=2, max_length=150, pattern=r"^[a-z_]+:[a-z_]+$")
    description: str | None = None
    module: str | None = None


class PermissionOut(BaseModel):
    id: int
    code: str
    description: str | None
    module: str | None

    model_config = {"from_attributes": True}
