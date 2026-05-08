from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, require_permissions
from app.database.db import get_db
from app.models.body_metric import BodyMetric
from app.models.user import User
from app.schemas.body_metric import BodyMetricCreate, BodyMetricOut, BodyMetricUpdate

router = APIRouter(prefix="/body-metrics", tags=["Body Metrics"])


def _calc_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round(weight_kg / (height_m * height_m), 2)


@router.get(
    "/latest",
    response_model=BodyMetricOut | None,
    dependencies=[Depends(require_permissions("body_metrics:read"))],
)
def get_latest(current_user: CurrentUser, db: Session = Depends(get_db)):
    metric = db.execute(
        select(BodyMetric)
        .where(BodyMetric.user_id == current_user.id)
        .order_by(BodyMetric.recorded_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    return metric


@router.get(
    "",
    response_model=list[BodyMetricOut],
    dependencies=[Depends(require_permissions("body_metrics:read"))],
)
def list_metrics(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(BodyMetric)
        .where(BodyMetric.user_id == current_user.id)
        .order_by(BodyMetric.recorded_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post(
    "",
    response_model=BodyMetricOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("body_metrics:create"))],
)
def create_metric(
    body: BodyMetricCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    user = db.execute(
        select(User).where(User.id == current_user.id)
    ).scalar_one_or_none()

    if not user or not user.height_cm:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Debes registrar tu estatura en tu perfil antes de agregar mediciones",
        )

    bmi = _calc_bmi(body.weight_kg, user.height_cm)

    metric = BodyMetric(
        user_id=current_user.id,
        weight_kg=body.weight_kg,
        bmi=bmi,
        waist_cm=body.waist_cm,
        chest_cm=body.chest_cm,
        arm_cm=body.arm_cm,
        recorded_at=body.recorded_at,
    )
    db.add(metric)
    db.flush()
    db.refresh(metric)
    return metric


@router.get(
    "/{metric_id}",
    response_model=BodyMetricOut,
    dependencies=[Depends(require_permissions("body_metrics:read"))],
)
def get_metric(
    metric_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    metric = db.execute(
        select(BodyMetric).where(
            BodyMetric.id == metric_id, BodyMetric.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Medicion no encontrada"
        )
    return metric


@router.patch(
    "/{metric_id}",
    response_model=BodyMetricOut,
    dependencies=[Depends(require_permissions("body_metrics:update"))],
)
def update_metric(
    metric_id: int,
    body: BodyMetricUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    metric = db.execute(
        select(BodyMetric).where(
            BodyMetric.id == metric_id, BodyMetric.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Medicion no encontrada"
        )

    changes = body.model_dump(exclude_unset=True)

    if "weight_kg" in changes:
        metric.weight_kg = changes.pop("weight_kg")
        user = db.execute(
            select(User).where(User.id == current_user.id)
        ).scalar_one_or_none()
        if user and user.height_cm:
            metric.bmi = _calc_bmi(metric.weight_kg, user.height_cm)

    for key, value in changes.items():
        setattr(metric, key, value)

    db.flush()
    db.refresh(metric)
    return metric


@router.delete(
    "/{metric_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("body_metrics:delete"))],
)
def delete_metric(
    metric_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    metric = db.execute(
        select(BodyMetric).where(
            BodyMetric.id == metric_id, BodyMetric.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Medicion no encontrada"
        )
    db.delete(metric)
