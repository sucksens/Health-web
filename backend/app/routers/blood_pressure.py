from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, require_permissions
from app.database.db import get_db
from app.models.blood_pressure import BloodPressure
from app.schemas.blood_pressure import (
    BloodPressureCreate,
    BloodPressureOut,
    BloodPressureUpdate,
    classify_bp,
)
from app.config.tz import now_mx
from datetime import timedelta

router = APIRouter(prefix="/blood-pressure", tags=["Blood Pressure"])


def _to_out(bp: BloodPressure) -> BloodPressureOut:
    return BloodPressureOut.from_orm(bp)


@router.get(
    "/stats",
    dependencies=[Depends(require_permissions("blood_pressure:read"))],
)
def get_stats(current_user: CurrentUser, db: Session = Depends(get_db)):
    uid = current_user.id
    now_naive = now_mx().replace(tzinfo=None)

    all_readings = (
        db.execute(
            select(BloodPressure)
            .where(BloodPressure.user_id == uid)
            .order_by(BloodPressure.recorded_at.desc())
        )
        .scalars()
        .all()
    )

    total = len(all_readings)
    if total == 0:
        return {"total": 0, "avg_7d": None, "avg_30d": None, "distribution": {}}

    seven_days_ago = now_naive - timedelta(days=7)
    thirty_days_ago = now_naive - timedelta(days=30)

    r7 = [r for r in all_readings if r.recorded_at and r.recorded_at >= seven_days_ago]
    r30 = [
        r for r in all_readings if r.recorded_at and r.recorded_at >= thirty_days_ago
    ]

    def avg_fields(readings):
        if not readings:
            return None
        n = len(readings)
        return {
            "systolic": round(sum(r.systolic for r in readings) / n, 1),
            "diastolic": round(sum(r.diastolic for r in readings) / n, 1),
            "heart_rate": round(
                sum(r.heart_rate for r in readings if r.heart_rate)
                / max(1, sum(1 for r in readings if r.heart_rate)),
                1,
            )
            if any(r.heart_rate for r in readings)
            else None,
        }

    distribution: dict[str, int] = {}
    for r in all_readings:
        c = classify_bp(r.systolic, r.diastolic)
        distribution[c] = distribution.get(c, 0) + 1

    return {
        "total": total,
        "avg_7d": avg_fields(r7),
        "avg_30d": avg_fields(r30),
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
    response_model=list[BloodPressureOut],
    dependencies=[Depends(require_permissions("blood_pressure:read"))],
)
def list_readings(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(BloodPressure)
        .where(BloodPressure.user_id == current_user.id)
        .order_by(BloodPressure.recorded_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return [_to_out(bp) for bp in result.scalars().all()]


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
