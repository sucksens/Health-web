import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permissions
from app.database.db import get_db
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.activity_log import ActivityLogOut

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get(
    "",
    response_model=list[ActivityLogOut],
    dependencies=[Depends(require_permissions("activity:read"))],
)
def list_activity(
    skip: int = 0,
    limit: int = 100,
    module: str | None = Query(default=None),
    type: str | None = Query(default=None),
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    q = select(ActivityLog).order_by(ActivityLog.created_at.desc())

    if module:
        q = q.where(ActivityLog.module == module)
    if type:
        q = q.where(ActivityLog.type == type)
    if user_id is not None:
        q = q.where(ActivityLog.user_id == user_id)

    q = q.offset(skip).limit(limit)
    logs = db.execute(q).scalars().all()

    user_ids = {l.user_id for l in logs if l.user_id is not None}
    users_map: dict[int, str] = {}
    if user_ids:
        users = db.execute(select(User).where(User.id.in_(user_ids))).scalars().all()
        users_map = {u.id: u.username for u in users}

    result = []
    for log in logs:
        details = log.details
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except Exception:
                pass

        result.append(
            ActivityLogOut(
                id=log.id,
                user_id=log.user_id,
                username=users_map.get(log.user_id) if log.user_id else None,
                action=log.action,
                module=log.module,
                type=log.type,
                details=details,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                created_at=log.created_at,
            )
        )

    return result
