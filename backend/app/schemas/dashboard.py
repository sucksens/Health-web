from typing import Optional

from pydantic import BaseModel

from app.schemas.body_metric import BodyMetricOut
from app.schemas.blood_pressure import BloodPressureOut
from app.schemas.weight_goal import WeightGoalWithProgress
from app.schemas.medical_history import AppointmentOut, AdherenceRecordOut


class DashboardAlert(BaseModel):
    type: str
    title: str
    message: str


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_appointments: int
    total_prescriptions: int
    total_body_metrics: int
    total_documents: int


class DashboardSummary(BaseModel):
    latest_metric: Optional[BodyMetricOut] = None
    active_goal: Optional[WeightGoalWithProgress] = None
    upcoming_appointments: list[AppointmentOut] = []
    today_adherence: list[AdherenceRecordOut] = []
    today_adherence_rate: Optional[float] = None
    adherence_rate_7d: Optional[float] = None
    active_medications_count: int = 0
    pending_doses_today: int = 0
    recent_metrics: list[BodyMetricOut] = []
    alerts: list[DashboardAlert] = []
    admin_stats: Optional[AdminStats] = None
    latest_bp: Optional[BloodPressureOut] = None
