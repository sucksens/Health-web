import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser
from app.database.db import get_db
from app.models.body_metric import BodyMetric
from app.models.blood_pressure import BloodPressure
from app.models.medical_history import (
    Appointment,
    Prescription,
    PrescriptionDetail,
    MedicalDocument,
    AdherenceRecord,
)
from app.models.user import User
from app.models.weight_goal import WeightGoal
from app.routers.weight_goals import (
    _get_current_weight,
    _calc_progress,
    _calc_weekly_change,
)
from app.routers.medical_history import _generate_today_records, _enrich_record
from app.schemas.body_metric import BodyMetricOut
from app.schemas.dashboard import (
    DashboardAlert,
    DashboardSummary,
    AdminStats,
)
from app.schemas.weight_goal import WeightGoalWithProgress
from app.config.tz import now_mx

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

logger = logging.getLogger(__name__)


def _has_role(user: User, role_name: str) -> bool:
    return any(r.name == role_name for r in user.roles)


def _build_goal_progress(goal: WeightGoal, db: Session) -> WeightGoalWithProgress:
    current_weight = _get_current_weight(db, goal.user_id)
    today = date.today()
    days_remaining = max(0, (goal.target_date - today).days)

    progress = None
    total_change = None
    avg_weekly = None

    if current_weight:
        progress = _calc_progress(
            goal.start_weight_kg, current_weight, goal.target_weight_kg
        )
        total_change = round(goal.start_weight_kg - current_weight, 2)
        goal_created = goal.created_at
        if goal_created.tzinfo is not None:
            goal_created = goal_created.replace(tzinfo=None)
        avg_weekly = _calc_weekly_change(
            goal.start_weight_kg,
            current_weight,
            goal_created,
            now_mx().replace(tzinfo=None),
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
        days_remaining=days_remaining,
        total_change=total_change,
        avg_weekly_change=avg_weekly,
    )


def _metric_out(m: BodyMetric) -> BodyMetricOut:
    return BodyMetricOut(
        id=m.id,
        user_id=m.user_id,
        weight_kg=m.weight_kg,
        bmi=m.bmi,
        waist_cm=m.waist_cm,
        chest_cm=m.chest_cm,
        arm_cm=m.arm_cm,
        recorded_at=m.recorded_at,
        created_at=m.created_at,
    )


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(current_user: CurrentUser, db: Session = Depends(get_db)):
    try:
        uid = current_user.id

        latest_metric_orm = db.execute(
            select(BodyMetric)
            .where(BodyMetric.user_id == uid)
            .order_by(BodyMetric.recorded_at.desc())
            .limit(1)
        ).scalar_one_or_none()

        latest_metric = _metric_out(latest_metric_orm) if latest_metric_orm else None

        active_goal_orm = db.execute(
            select(WeightGoal)
            .where(WeightGoal.user_id == uid, WeightGoal.status == "active")
            .order_by(WeightGoal.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()

        goal_out = (
            _build_goal_progress(active_goal_orm, db) if active_goal_orm else None
        )

        now_aware = now_mx()
        now_naive = now_aware.replace(tzinfo=None)

        upcoming_orms = (
            db.execute(
                select(Appointment)
                .where(
                    Appointment.user_id == uid,
                    Appointment.date_time >= now_naive,
                    Appointment.status == "pending",
                )
                .order_by(Appointment.date_time.asc())
                .limit(5)
            )
            .scalars()
            .all()
        )

        _generate_today_records(uid, db)
        today_start = now_naive.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start.replace(hour=23, minute=59, second=59)

        today_rx_records = (
            db.execute(
                select(AdherenceRecord)
                .join(PrescriptionDetail)
                .join(Prescription)
                .where(
                    Prescription.user_id == uid,
                    PrescriptionDetail.status == "active",
                    AdherenceRecord.scheduled_time >= today_start,
                    AdherenceRecord.scheduled_time <= today_end,
                )
            )
            .scalars()
            .all()
        )

        today_standalone_records = (
            db.execute(
                select(AdherenceRecord).where(
                    AdherenceRecord.user_id == uid,
                    AdherenceRecord.prescription_detail_id.is_(None),
                    AdherenceRecord.scheduled_time >= today_start,
                    AdherenceRecord.scheduled_time <= today_end,
                )
            )
            .scalars()
            .all()
        )

        today_records = sorted(
            list(today_rx_records) + list(today_standalone_records),
            key=lambda r: r.scheduled_time,
        )

        today_total = len(today_records)
        today_taken = sum(1 for r in today_records if r.status in ("taken", "late"))
        today_pending = sum(1 for r in today_records if r.status == "pending")
        today_rate = (
            round((today_taken / today_total) * 100, 1) if today_total else None
        )

        seven_days_ago = now_naive - timedelta(days=7)
        week_rx_records = (
            db.execute(
                select(AdherenceRecord)
                .join(PrescriptionDetail)
                .join(Prescription)
                .where(
                    Prescription.user_id == uid,
                    AdherenceRecord.scheduled_time >= seven_days_ago,
                )
            )
            .scalars()
            .all()
        )
        week_standalone_records = (
            db.execute(
                select(AdherenceRecord).where(
                    AdherenceRecord.user_id == uid,
                    AdherenceRecord.prescription_detail_id.is_(None),
                    AdherenceRecord.scheduled_time >= seven_days_ago,
                )
            )
            .scalars()
            .all()
        )
        week_records = list(week_rx_records) + list(week_standalone_records)
        week_total = len(week_records)
        week_taken = sum(1 for r in week_records if r.status in ("taken", "late"))
        week_rate = round((week_taken / week_total) * 100, 1) if week_total else None

        active_meds_count = (
            db.execute(
                select(func.count())
                .select_from(PrescriptionDetail)
                .join(Prescription)
                .where(
                    Prescription.user_id == uid,
                    PrescriptionDetail.status == "active",
                )
            ).scalar()
            or 0
        )

        recent_orms = (
            db.execute(
                select(BodyMetric)
                .where(BodyMetric.user_id == uid)
                .order_by(BodyMetric.recorded_at.desc())
                .limit(30)
            )
            .scalars()
            .all()
        )

        alerts: list[DashboardAlert] = []

        if active_goal_orm:
            if active_goal_orm.target_date < date.today():
                alerts.append(
                    DashboardAlert(
                        type="warning",
                        title="Meta vencida",
                        message=(
                            f"Tu meta de peso "
                            f"({active_goal_orm.target_weight_kg:.1f} kg) "
                            f"vencio el "
                            f"{active_goal_orm.target_date.strftime('%d/%m/%Y')}."
                        ),
                    )
                )
            elif active_goal_orm.target_date <= date.today() + timedelta(days=7):
                alerts.append(
                    DashboardAlert(
                        type="info",
                        title="Meta proxima a vencer",
                        message=(
                            f"Tu meta de peso vence en "
                            f"{goal_out.days_remaining if goal_out else 0} dias."
                        ),
                    )
                )

        if upcoming_orms:
            next_appt = upcoming_orms[0]
            appt_dt = next_appt.date_time
            if appt_dt.tzinfo is not None:
                appt_dt = appt_dt.replace(tzinfo=None)
            hours_until = (appt_dt - now_naive).total_seconds() / 3600
            if hours_until < 24:
                alerts.append(
                    DashboardAlert(
                        type="info",
                        title="Cita proxima",
                        message=(
                            f"Tienes una cita el "
                            f"{appt_dt.strftime('%d/%m')} a las "
                            f"{appt_dt.strftime('%H:%M')}."
                        ),
                    )
                )

        if week_rate is not None and week_rate < 80 and week_total >= 3:
            alerts.append(
                DashboardAlert(
                    type="warning",
                    title="Adherencia baja",
                    message=(
                        f"Tu adherencia en los ultimos 7 dias es del "
                        f"{week_rate:.0f}%. Intenta mejorar."
                    ),
                )
            )

        latest_bp = db.execute(
            select(BloodPressure)
            .where(BloodPressure.user_id == uid)
            .order_by(BloodPressure.recorded_at.desc())
            .limit(1)
        ).scalar_one_or_none()

        if latest_bp:
            from app.schemas.blood_pressure import classify_bp

            bp_class = classify_bp(latest_bp.systolic, latest_bp.diastolic)
            if bp_class == "Crisis":
                alerts.append(
                    DashboardAlert(
                        type="error",
                        title="Lectura critica de presion arterial",
                        message=(
                            f"Tu ultima lectura ({latest_bp.systolic:.0f}/"
                            f"{latest_bp.diastolic:.0f}) esta en rango CRISIS. "
                            f"Busca atencion medica inmediata."
                        ),
                    )
                )
            elif bp_class == "Stage 2":
                alerts.append(
                    DashboardAlert(
                        type="warning",
                        title="Presion arterial elevada",
                        message=(
                            f"Tu ultima lectura ({latest_bp.systolic:.0f}/"
                            f"{latest_bp.diastolic:.0f}) indica hipertension "
                            f"Stage 2. Consulta a tu medico."
                        ),
                    )
                )
            elif bp_class in ("Stage 1", "Elevated"):
                recent_3 = (
                    db.execute(
                        select(BloodPressure)
                        .where(BloodPressure.user_id == uid)
                        .order_by(BloodPressure.recorded_at.desc())
                        .limit(3)
                    )
                    .scalars()
                    .all()
                )
                if len(recent_3) >= 3 and all(
                    classify_bp(r.systolic, r.diastolic)
                    in ("Stage 1", "Elevated", "Stage 2")
                    for r in recent_3
                ):
                    alerts.append(
                        DashboardAlert(
                            type="info",
                            title="Tendencia de presion arterial",
                            message=(
                                f"Tus ultimas {len(recent_3)} lecturas muestran "
                                f"presion elevada. Considera consultar a tu medico."
                            ),
                        )
                    )

        admin_stats = None
        if _has_role(current_user, "admin") or _has_role(current_user, "manager"):
            total_users = (
                db.execute(select(func.count()).select_from(User)).scalar() or 0
            )
            active_users = (
                db.execute(
                    select(func.count()).select_from(User).where(User.is_active == True)
                ).scalar()
                or 0
            )
            total_appts = (
                db.execute(
                    select(func.count())
                    .select_from(Appointment)
                    .where(Appointment.user_id == uid)
                ).scalar()
                or 0
            )
            total_rx = (
                db.execute(
                    select(func.count())
                    .select_from(Prescription)
                    .where(Prescription.user_id == uid)
                ).scalar()
                or 0
            )
            total_metrics = (
                db.execute(
                    select(func.count())
                    .select_from(BodyMetric)
                    .where(BodyMetric.user_id == uid)
                ).scalar()
                or 0
            )
            total_docs = (
                db.execute(
                    select(func.count())
                    .select_from(MedicalDocument)
                    .where(MedicalDocument.user_id == uid)
                ).scalar()
                or 0
            )
            admin_stats = AdminStats(
                total_users=total_users,
                active_users=active_users,
                total_appointments=total_appts,
                total_prescriptions=total_rx,
                total_body_metrics=total_metrics,
                total_documents=total_docs,
            )

        recent_metrics_out = [_metric_out(m) for m in reversed(recent_orms)]

        return DashboardSummary(
            latest_metric=latest_metric,
            active_goal=goal_out,
            upcoming_appointments=upcoming_orms,
            today_adherence=[_enrich_record(r) for r in today_records],
            today_adherence_rate=today_rate,
            adherence_rate_7d=week_rate,
            active_medications_count=active_meds_count,
            pending_doses_today=today_pending,
            recent_metrics=recent_metrics_out,
            alerts=alerts,
            admin_stats=admin_stats,
        )
    except Exception:
        logger.exception("Error in dashboard summary")
        raise
