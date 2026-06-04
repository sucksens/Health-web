from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, require_permissions
from app.database.db import get_db
from app.models.blood_pressure import BloodPressure
from app.schemas.blood_pressure import (
    BloodPressureCreate,
    BloodPressureOut,
    BloodPressureListResponse,
    BloodPressureUpdate,
)
from app.config.tz import now_mx
from datetime import datetime, timedelta
from calendar import monthrange

router = APIRouter(prefix="/blood-pressure", tags=["Blood Pressure"])


def _to_out(bp: BloodPressure) -> BloodPressureOut:
    return BloodPressureOut.from_orm(bp)


def _default_date_range():
    now = now_mx().replace(tzinfo=None)
    date_from = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_day = monthrange(now.year, now.month)[1]
    date_to = now.replace(
        day=last_day, hour=23, minute=59, second=59, microsecond=999999
    )
    return date_from, date_to


@router.get(
    "/stats",
    dependencies=[Depends(require_permissions("blood_pressure:read"))],
)
def get_stats(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
):
    uid = current_user.id
    now_naive = now_mx().replace(tzinfo=None)

    if date_from is None or date_to is None:
        date_from, date_to = _default_date_range()

    base_q = select(BloodPressure).where(
        BloodPressure.user_id == uid,
        BloodPressure.recorded_at >= date_from,
        BloodPressure.recorded_at <= date_to,
    )

    total = db.execute(select(func.count()).select_from(base_q.subquery())).scalar_one()

    if total == 0:
        return {"total": 0, "avg_7d": None, "avg_30d": None, "distribution": {}}

    agg = db.execute(
        select(
            func.avg(BloodPressure.systolic),
            func.avg(BloodPressure.diastolic),
            func.avg(BloodPressure.heart_rate),
            func.count(),
        ).where(
            BloodPressure.user_id == uid,
            BloodPressure.recorded_at >= date_from,
            BloodPressure.recorded_at <= date_to,
        )
    ).one()
    avg_s, avg_d, avg_hr, _ = agg

    seven_days_ago = now_naive - timedelta(days=7)
    thirty_days_ago = now_naive - timedelta(days=30)

    def _avg_in_range(start):
        row = db.execute(
            select(
                func.avg(BloodPressure.systolic),
                func.avg(BloodPressure.diastolic),
                func.avg(BloodPressure.heart_rate),
            ).where(
                BloodPressure.user_id == uid,
                BloodPressure.recorded_at >= start,
                BloodPressure.recorded_at <= date_to,
            )
        ).one()
        s, d, h = row
        if s is None:
            return None
        return {
            "systolic": round(s, 1),
            "diastolic": round(d, 1),
            "heart_rate": round(h, 1) if h else None,
        }

    avg_7d = _avg_in_range(seven_days_ago)
    avg_30d = _avg_in_range(thirty_days_ago)

    dist_rows = db.execute(
        select(
            func.count(),
            case(
                (BloodPressure.systolic > 180, "Crisis"),
                (BloodPressure.diastolic > 120, "Crisis"),
                (BloodPressure.systolic >= 140, "Stage 2"),
                (BloodPressure.diastolic >= 90, "Stage 2"),
                (BloodPressure.systolic >= 130, "Stage 1"),
                (BloodPressure.diastolic >= 80, "Stage 1"),
                (BloodPressure.systolic >= 120, "Elevated"),
                (BloodPressure.systolic < 90, "Low"),
                (BloodPressure.diastolic < 60, "Low"),
                else_="Normal",
            ).label("cls"),
        )
        .where(
            BloodPressure.user_id == uid,
            BloodPressure.recorded_at >= date_from,
            BloodPressure.recorded_at <= date_to,
        )
        .group_by("cls")
    ).all()

    distribution = {cls: cnt for cnt, cls in dist_rows}

    return {
        "total": total,
        "avg_7d": avg_7d,
        "avg_30d": avg_30d,
        "distribution": distribution,
    }


@router.get(
    "/latest",
    response_model=BloodPressureOut | None,
    dependencies=[Depends(require_permissions("blood_pressure:read"))],
)
def get_latest(current_user: CurrentUser, db: Session = Depends(get_db)):
    bp = db.execute(
        select(BloodPressure)
        .where(BloodPressure.user_id == current_user.id)
        .order_by(BloodPressure.recorded_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    return _to_out(bp) if bp else None


@router.get(
    "",
    response_model=BloodPressureListResponse,
    dependencies=[Depends(require_permissions("blood_pressure:read"))],
)
def list_readings(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: Session = Depends(get_db),
):
    if date_from is None or date_to is None:
        date_from, date_to = _default_date_range()

    base_q = select(BloodPressure).where(
        BloodPressure.user_id == current_user.id,
        BloodPressure.recorded_at >= date_from,
        BloodPressure.recorded_at <= date_to,
    )

    total = db.execute(select(func.count()).select_from(base_q.subquery())).scalar_one()

    result = db.execute(
        base_q.order_by(BloodPressure.recorded_at.desc()).offset(skip).limit(limit)
    )
    items = [_to_out(bp) for bp in result.scalars().all()]
    return BloodPressureListResponse(items=items, total=total)


@router.post(
    "",
    response_model=BloodPressureOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("blood_pressure:create"))],
)
def create_reading(
    body: BloodPressureCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    bp = BloodPressure(
        user_id=current_user.id,
        systolic=body.systolic,
        diastolic=body.diastolic,
        heart_rate=body.heart_rate,
        notes=body.notes,
        recorded_at=body.recorded_at,
    )
    db.add(bp)
    db.flush()
    db.refresh(bp)
    return _to_out(bp)


@router.get(
    "/{reading_id}",
    response_model=BloodPressureOut,
    dependencies=[Depends(require_permissions("blood_pressure:read"))],
)
def get_reading(
    reading_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    bp = db.execute(
        select(BloodPressure).where(
            BloodPressure.id == reading_id,
            BloodPressure.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not bp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lectura no encontrada",
        )
    return _to_out(bp)


@router.patch(
    "/{reading_id}",
    response_model=BloodPressureOut,
    dependencies=[Depends(require_permissions("blood_pressure:update"))],
)
def update_reading(
    reading_id: int,
    body: BloodPressureUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    bp = db.execute(
        select(BloodPressure).where(
            BloodPressure.id == reading_id,
            BloodPressure.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not bp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lectura no encontrada",
        )

    changes = body.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(bp, key, value)

    db.flush()
    db.refresh(bp)
    return _to_out(bp)


@router.delete(
    "/{reading_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("blood_pressure:delete"))],
)
def delete_reading(
    reading_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    bp = db.execute(
        select(BloodPressure).where(
            BloodPressure.id == reading_id,
            BloodPressure.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not bp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lectura no encontrada",
        )
    db.delete(bp)
