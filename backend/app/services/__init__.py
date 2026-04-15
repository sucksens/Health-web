import json
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog


def log_activity(
    db: Session,
    *,
    action: str,
    module: str,
    type: str,
    user_id: int | None = None,
    details: dict[str, Any] | str | None = None,
    request: Request | None = None,
) -> None:
    ip_address = None
    user_agent = None

    if request:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()
        else:
            ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    details_str = None
    if details is not None:
        details_str = (
            json.dumps(details, ensure_ascii=False)
            if isinstance(details, dict)
            else details
        )

    entry = ActivityLog(
        user_id=user_id,
        action=action,
        module=module,
        type=type,
        details=details_str,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    db.flush()
