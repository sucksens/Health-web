import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.role import RoleOut


class ActivityLogOut(BaseModel):
    id: int
    user_id: int | None
    username: str | None
    action: str
    module: str
    type: str
    details: dict[str, Any] | str | None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
