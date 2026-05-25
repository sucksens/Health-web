from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, require_permissions
from app.database.db import get_db
from app.models.body_metric import BodyMetric
from app.models.weight_goal import WeightGoal
from app.schemas.body_metric import BodyMetricOut
from app.schemas.weight_goal import (
    WeightGoalCreate,
    WeightGoalOut,
    WeightGoalUpdate,
    WeightGoalWithProgress,
)
from app.services import log_activity
from app.config.tz import now_mx

router = APIRouter(prefix="/weight-goals", tags=["Weight Goals"])


def _get_current_weight(db: Session, user_id: int) -> float | None:
    metric = db.execute(
        select(BodyMetric)
        .where(BodyMetric.user_id == user_id)
        .order_by(BodyMetric.recorded_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    return metric.weight_kg if metric else None


def _calc_progress(start: float, current: float, target: float) -> float:
    total = start - target
    if total == 0:
        return 0.0
    done = start - current
    progress = (done / total) * 100
    return max(0.0, min(100.0, round(progress, 1)))


def _calc_weekly_change(
    start: float, current: float, start_date: datetime, end_date: datetime
) -> float:
    days = (end_date.replace(tzinfo=None) - start_date.replace(tzinfo=None)).days
    if days <= 0:
        return 0.0
    weeks = days / 7
    if weeks == 0:
        return 0.0
    return round((start - current) / weeks, 2)


@router.get(
    "/active",
    response_model=WeightGoalWithProgress | None,
    dependencies=[Depends(require_permissions("weight_goals:read"))],
)
def get_active_goal(current_user: CurrentUser, db: Session = Depends(get_db)):
    goal = db.execute(
        select(WeightGoal)
        .where(WeightGoal.user_id == current_user.id, WeightGoal.status == "active")
        .order_by(WeightGoal.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if not goal:
        return None

    current_weight = _get_current_weight(db, current_user.id)

    today = date.today()
    days_remaining = (goal.target_date - today).days

    progress = None
    total_change = None
    avg_weekly = None

    if current_weight:
        progress = _calc_progress(
            goal.start_weight_kg, current_weight, goal.target_weight_kg
        )
        total_change = round(goal.start_weight_kg - current_weight, 2)
        avg_weekly = _calc_weekly_change(
            goal.start_weight_kg,
            current_weight,
            goal.created_at,
            now_mx(),
        )

    return WeightGoalWithProgress(
        id=goal.id,
        user_id=goal.user_id,
        target_weight_kg=goal.target_weight_kg,
        start_weight_kg=goal.start_weight_kg,
        target_date=goal.target_date,
        status=goal.status,
        notes=goal.notes,
        achieved_at=goal.achieved_at,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        current_weight=current_weight,
        progress=progress,
        days_remaining=max(0, days_remaining),
        total_change=total_change,
        avg_weekly_change=avg_weekly,
    )


@router.get(
    "",
    response_model=list[WeightGoalOut],
    dependencies=[Depends(require_permissions("weight_goals:read"))],
)
def list_goals(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(WeightGoal)
        .where(WeightGoal.user_id == current_user.id)
        .order_by(WeightGoal.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post(
    "",
    response_model=WeightGoalOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("weight_goals:create"))],
)
def create_goal(
    body: WeightGoalCreate,
    current_user: CurrentUser,
    request: Request,
    db: Session = Depends(get_db),
):
    active_goal = db.execute(
        select(WeightGoal).where(
            WeightGoal.user_id == current_user.id, WeightGoal.status == "active"
        )
    ).scalar_one_or_none()

    if active_goal:
        active_goal.status = "abandoned"
        db.flush()

    goal = WeightGoal(
        user_id=current_user.id,
        target_weight_kg=body.target_weight_kg,
        start_weight_kg=body.start_weight_kg,
        target_date=body.target_date,
        notes=body.notes,
    )
    db.add(goal)
    db.flush()
    db.refresh(goal)

    log_activity(
        db,
        action="create_weight_goal",
        module="weight_goals",
        type="action",
        user_id=current_user.id,
        details={
            "goal_id": goal.id,
            "target_weight": goal.target_weight_kg,
            "start_weight": goal.start_weight_kg,
            "target_date": str(goal.target_date),
        },
        request=request,
    )

    return goal


@router.get(
    "/{goal_id}",
    response_model=WeightGoalOut,
    dependencies=[Depends(require_permissions("weight_goals:read"))],
)
def get_goal(
    goal_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    goal = db.execute(
        select(WeightGoal).where(
            WeightGoal.id == goal_id, WeightGoal.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meta no encontrada"
        )
    return goal


@router.get(
    "/{goal_id}/details",
    dependencies=[Depends(require_permissions("weight_goals:read"))],
)
def get_goal_details(
    goal_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    goal = db.execute(
        select(WeightGoal).where(
            WeightGoal.id == goal_id, WeightGoal.user_id == current_user.id
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meta no encontrada"
        )

    start_date = goal.created_at.replace(tzinfo=timezone.utc)
    if goal.status == "achieved" and goal.achieved_at:
        end_date = goal.achieved_at.replace(tzinfo=timezone.utc)
    elif goal.status == "abandoned":
        end_date = goal.updated_at.replace(tzinfo=timezone.utc)
    else:
        end_date = now_mx()

    metrics = (
        db.execute(
            select(BodyMetric)
            .where(
                BodyMetric.user_id == current_user.id,
                BodyMetric.recorded_at >= start_date,
                BodyMetric.recorded_at <= end_date,
            )
            .order_by(BodyMetric.recorded_at.asc())
        )
        .scalars()
        .all()
    )

    metrics_out = [
        BodyMetricOut(
            id=m.id,
            user_id=m.user_id,
            weight_kg=m.weight_kg,
            bmi=m.bmi,
            waist_cm=m.waist_cm,
            chest_cm=m.chest_cm,
            arm_cm=m.arm_cm,
            recorded_at=m.recorded_at.isoformat(),
            created_at=m.created_at.isoformat(),
        )
        for m in metrics
    ]

    current_weight = _get_current_weight(db, current_user.id)
    today = now_mx().date()
    days_remaining = max(0, (goal.target_date - today).days)

    progress = None
    total_change = None
    avg_weekly = None

    if current_weight:
        progress = _calc_progress(
            goal.start_weight_kg, current_weight, goal.target_weight_kg
        )
        total_change = round(goal.start_weight_kg - current_weight, 2)
        avg_weekly = _calc_weekly_change(
            goal.start_weight_kg,
            current_weight,
            goal.created_at,
            now_mx(),
        )

    return {
        "goal": WeightGoalWithProgress(
            id=goal.id,
            user_id=goal.user_id,
            target_weight_kg=goal.target_weight_kg,
            start_weight_kg=goal.start_weight_kg,
            target_date=goal.target_date,
            status=goal.status,
            notes=goal.notes,
            achieved_at=goal.achieved_at,
            created_at=goal.created_at,
            updated_at=goal.updated_at,
            current_weight=current_weight,
            progress=progress,
            days_remaining=days_remaining,
            total_change=total_change,
            avg_weekly_change=avg_weekly,
        ),
        "metrics": metrics_out,
    }


@router.patch(
    "/{goal_id}",
    response_model=WeightGoalOut,
    dependencies=[Depends(require_permissions("weight_goals:update"))],
)
def update_goal(
    goal_id: int,
    body: WeightGoalUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    goal = db.execute(
        select(WeightGoal).where(
            WeightGoal.id == goal_id, WeightGoal.user_id == current_user.id
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meta no encontrada"
        )

    changes = body.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(goal, key, value)

    db.flush()
    db.refresh(goal)
    return goal


@router.post(
    "/{goal_id}/achieve",
    response_model=WeightGoalOut,
    dependencies=[Depends(require_permissions("weight_goals:update"))],
)
def achieve_goal(
    goal_id: int,
    request: Request,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    goal = db.execute(
        select(WeightGoal).where(
            WeightGoal.id == goal_id, WeightGoal.user_id == current_user.id
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meta no encontrada"
        )

    goal.status = "achieved"
    goal.achieved_at = now_mx()
    db.flush()
    db.refresh(goal)

    log_activity(
        db,
        action="achieve_weight_goal",
        module="weight_goals",
        type="action",
        user_id=current_user.id,
        details={"goal_id": goal.id, "target_weight": goal.target_weight_kg},
        request=request,
    )

    return goal


@router.post(
    "/{goal_id}/abandon",
    response_model=WeightGoalOut,
    dependencies=[Depends(require_permissions("weight_goals:update"))],
)
def abandon_goal(
    goal_id: int,
    request: Request,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    goal = db.execute(
        select(WeightGoal).where(
            WeightGoal.id == goal_id, WeightGoal.user_id == current_user.id
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meta no encontrada"
        )

    goal.status = "abandoned"
    db.flush()
    db.refresh(goal)

    log_activity(
        db,
        action="abandon_weight_goal",
        module="weight_goals",
        type="action",
        user_id=current_user.id,
        details={"goal_id": goal.id, "target_weight": goal.target_weight_kg},
        request=request,
    )

    return goal


@router.delete(
    "/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("weight_goals:delete"))],
)
def delete_goal(
    goal_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    goal = db.execute(
        select(WeightGoal).where(
            WeightGoal.id == goal_id, WeightGoal.user_id == current_user.id
        )
    ).scalar_one_or_none()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meta no encontrada"
        )

    db.delete(goal)
