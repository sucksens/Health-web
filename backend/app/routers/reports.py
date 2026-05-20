import io
import matplotlib
from pathlib import Path

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from datetime import datetime, date, timedelta
from fpdf import FPDF
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.auth.dependencies import CurrentUser, require_permissions
from app.database.db import get_db
from app.models.user import User
from app.models.body_metric import BodyMetric
from app.models.weight_goal import WeightGoal
from app.models.blood_pressure import BloodPressure
from app.models.medical_history import (
    PatientProfile,
    Doctor,
    Appointment,
    Prescription,
    PrescriptionDetail,
    Medication,
    MedicalDocument,
    AdherenceRecord,
)
from app.config.tz import now_mx

_LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "logo.png"

router = APIRouter(prefix="/reports", tags=["Reports"])

plt.rcParams["font.size"] = 9


class ReportPDF(FPDF):
    def __init__(self, title: str, user_name: str):
        super().__init__()
        self.doc_title = title
        self.user_name = user_name
        self.set_auto_page_break(auto=True, margin=25)

    def header(self):
        if _LOGO_PATH.exists():
            self.image(str(_LOGO_PATH), x=10, y=5, w=22)
            self.set_xy(35, 8)
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(80, 80, 80)
            self.cell(0, 6, "Health Web", align="L")
            self.cell(0, 6, self.doc_title, align="R", new_x="LMARGIN", new_y="NEXT")
        else:
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(80, 80, 80)
            self.cell(0, 6, "Health Web", align="L")
            self.cell(0, 6, self.doc_title, align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-20)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_font("Helvetica", "", 8)
        self.set_text_color(130, 130, 130)
        self.cell(0, 8, f"Generado: {now_mx().strftime('%d/%m/%Y %H:%M')}", align="L")
        self.cell(0, 8, f"{self.page_no()}/{{nb}}", align="R")

    def section_title(self, title: str):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(30, 30, 30)
        self.ln(4)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(60, 120, 200)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 80, self.get_y())
        self.set_line_width(0.2)
        self.ln(3)

    def label_value(self, label: str, value: str):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(80, 80, 80)
        self.cell(50, 6, label, new_x="RIGHT")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(30, 30, 30)
        self.cell(0, 6, str(value), new_x="LMARGIN", new_y="NEXT")

    def add_table(
        self,
        headers: list[str],
        rows: list[list[str]],
        col_widths: list[float] | None = None,
    ):
        if not rows:
            self.set_font("Helvetica", "I", 9)
            self.set_text_color(130, 130, 130)
            self.cell(
                0,
                8,
                "Sin datos en el periodo seleccionado",
                new_x="LMARGIN",
                new_y="NEXT",
            )
            return
        if col_widths is None:
            w = 190 / len(headers)
            col_widths = [w] * len(headers)
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(60, 120, 200)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, h, border=1, fill=True, align="C")
        self.ln()
        self.set_font("Helvetica", "", 8)
        self.set_text_color(30, 30, 30)
        fill = False
        for row in rows:
            if self.get_y() > 260:
                self.add_page()
                self.set_font("Helvetica", "B", 8)
                self.set_fill_color(60, 120, 200)
                self.set_text_color(255, 255, 255)
                for i, h in enumerate(headers):
                    self.cell(col_widths[i], 7, h, border=1, fill=True, align="C")
                self.ln()
                self.set_font("Helvetica", "", 8)
                self.set_text_color(30, 30, 30)
                fill = False
            if fill:
                self.set_fill_color(240, 245, 255)
            else:
                self.set_fill_color(255, 255, 255)
            for i, val in enumerate(row):
                self.cell(col_widths[i], 6, str(val)[:60], border=1, fill=True)
            self.ln()
            fill = not fill

    def add_chart(self, fig, w: float = 170):
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=130, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        buf.seek(0)
        x = (210 - w) / 2
        self.image(buf, x=x, w=w)
        self.ln(4)


def _fmt_date(d) -> str:
    if d is None:
        return "-"
    if isinstance(d, datetime):
        return d.strftime("%d/%m/%Y")
    if isinstance(d, date):
        return d.strftime("%d/%m/%Y")
    return str(d)[:10]


def _fmt_dt(d) -> str:
    if d is None:
        return "-"
    if isinstance(d, datetime):
        return d.strftime("%d/%m/%Y %H:%M")
    return str(d)


def _parse_dates(date_from: str | None, date_to: str | None):
    df = None
    dt = None
    if date_from:
        try:
            df = datetime.strptime(date_from, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(400, "date_from invalida, usar YYYY-MM-DD")
    if date_to:
        try:
            dt = datetime.strptime(date_to, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59
            )
        except ValueError:
            raise HTTPException(400, "date_to invalida, usar YYYY-MM-DD")
    return df, dt


def _user_name(user: User) -> str:
    parts = [user.first_name, user.last_name]
    name = " ".join(p for p in parts if p)
    return name or user.username


def _build_response(pdf: ReportPDF, filename: str):
    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── 1. Health Summary ──────────────────────────────────────────────────────


@router.get(
    "/health-summary",
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def report_health_summary(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    user = current_user
    name = _user_name(user)

    profile = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    ).scalar_one_or_none()

    latest_metric = db.execute(
        select(BodyMetric)
        .where(BodyMetric.user_id == user.id)
        .order_by(BodyMetric.recorded_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    active_goal_q = db.execute(
        select(WeightGoal)
        .where(WeightGoal.user_id == user.id, WeightGoal.status == "active")
        .order_by(WeightGoal.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    upcoming = (
        db.execute(
            select(Appointment)
            .where(
                Appointment.user_id == user.id,
                Appointment.date_time >= now_mx(),
                Appointment.status == "pending",
            )
            .order_by(Appointment.date_time)
            .limit(5)
        )
        .scalars()
        .all()
    )

    active_meds = (
        db.execute(
            select(PrescriptionDetail)
            .join(Prescription)
            .where(
                Prescription.user_id == user.id,
                PrescriptionDetail.status == "active",
            )
        )
        .scalars()
        .all()
    )

    seven_days_ago = now_mx() - timedelta(days=7)
    adherence_records = (
        db.execute(
            select(AdherenceRecord)
            .join(PrescriptionDetail)
            .join(Prescription)
            .where(
                Prescription.user_id == user.id,
                AdherenceRecord.scheduled_time >= seven_days_ago,
            )
        )
        .scalars()
        .all()
    )

    pdf = ReportPDF("Resumen de Salud", name)
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.section_title("Datos del Paciente")
    pdf.label_value("Nombre:", name)
    if profile:
        pdf.label_value("Fecha de nacimiento:", _fmt_date(profile.date_of_birth))
        pdf.label_value("Tipo de sangre:", profile.blood_type or "-")
        pdf.label_value("Alergias:", profile.allergies or "Ninguna registrada")
        pdf.label_value(
            "Condiciones cronicas:", profile.chronic_conditions or "Ninguna registrada"
        )
        if profile.emergency_contact_name:
            pdf.label_value(
                "Contacto emergencia:",
                f"{profile.emergency_contact_name} ({profile.emergency_contact_phone or '-'})",
            )

    if latest_metric:
        pdf.section_title("Ultimas Metricas")
        pdf.label_value("Fecha:", _fmt_date(latest_metric.recorded_at))
        pdf.label_value("Peso:", f"{latest_metric.weight_kg:.1f} kg")
        pdf.label_value("IMC:", f"{latest_metric.bmi:.1f}")
        if latest_metric.waist_cm:
            pdf.label_value("Cintura:", f"{latest_metric.waist_cm:.1f} cm")

    if active_goal_q:
        pdf.section_title("Meta de Peso Activa")
        current_w = (
            latest_metric.weight_kg if latest_metric else active_goal_q.start_weight_kg
        )
        progress = 0
        if active_goal_q.start_weight_kg != active_goal_q.target_weight_kg:
            progress = (
                abs(current_w - active_goal_q.start_weight_kg)
                / abs(active_goal_q.target_weight_kg - active_goal_q.start_weight_kg)
                * 100
            )
            progress = min(progress, 100)
        pdf.label_value("Peso inicial:", f"{active_goal_q.start_weight_kg:.1f} kg")
        pdf.label_value("Peso actual:", f"{current_w:.1f} kg")
        pdf.label_value("Peso meta:", f"{active_goal_q.target_weight_kg:.1f} kg")
        pdf.label_value("Progreso:", f"{progress:.0f}%")
        pdf.label_value("Fecha meta:", _fmt_date(active_goal_q.target_date))

    if upcoming:
        pdf.section_title("Proximas Citas")
        pdf.add_table(
            ["Fecha", "Motivo", "Estado"],
            [[_fmt_dt(a.date_time), a.reason or "-", a.status] for a in upcoming],
            [60, 90, 40],
        )

    if active_meds:
        pdf.section_title("Medicamentos Activos")
        pdf.add_table(
            ["Medicamento", "Dosis", "Frecuencia", "Duracion"],
            [
                [
                    m.medication_name,
                    m.dosage or "-",
                    m.frequency or "-",
                    f"{m.duration_days} dias" if m.duration_days else "-",
                ]
                for m in active_meds
            ],
            [55, 40, 50, 45],
        )

    if adherence_records:
        pdf.section_title("Adherencia (ultimos 7 dias)")
        total = len(adherence_records)
        taken = sum(1 for r in adherence_records if r.status in ("taken", "late"))
        rate = (taken / total * 100) if total else 0
        pdf.label_value("Dosis programadas:", str(total))
        pdf.label_value("Dosis tomadas:", str(taken))
        pdf.label_value("Tasa de adherencia:", f"{rate:.0f}%")

        statuses = {}
        for r in adherence_records:
            statuses[r.status] = statuses.get(r.status, 0) + 1
        if statuses:
            labels_map = {
                "taken": "Tomada",
                "skipped": "Saltada",
                "late": "Tarde",
                "pending": "Pendiente",
            }
            fig, ax = plt.subplots(figsize=(4, 2.5))
            labels = [labels_map.get(s, s) for s in statuses.keys()]
            colors = {
                "taken": "#4CAF50",
                "skipped": "#F44336",
                "late": "#FF9800",
                "pending": "#9E9E9E",
            }
            ax.pie(
                statuses.values(),
                labels=labels,
                colors=[colors.get(s, "#ccc") for s in statuses.keys()],
                autopct="%1.0f%%",
                textprops={"fontsize": 8},
            )
            ax.set_title("Adherencia - Ultimos 7 dias", fontsize=10)
            pdf.add_chart(fig, w=90)

    return _build_response(pdf, f"resumen_salud_{now_mx().strftime('%Y%m%d')}.pdf")


# ── 2. Weight History ──────────────────────────────────────────────────────


@router.get(
    "/weight-history",
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def report_weight_history(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    df, dt = _parse_dates(date_from, date_to)
    name = _user_name(current_user)

    q = select(BodyMetric).where(BodyMetric.user_id == current_user.id)
    if df:
        q = q.where(BodyMetric.recorded_at >= df)
    if dt:
        q = q.where(BodyMetric.recorded_at <= dt)
    q = q.order_by(BodyMetric.recorded_at)
    metrics = db.execute(q).scalars().all()

    goals = (
        db.execute(select(WeightGoal).where(WeightGoal.user_id == current_user.id))
        .scalars()
        .all()
    )

    pdf = ReportPDF("Historial de Peso", name)
    pdf.alias_nb_pages()
    pdf.add_page()

    period = f"{_fmt_date(df) if df else 'Inicio'} - {_fmt_date(dt) if dt else 'Hoy'}"
    pdf.label_value("Periodo:", period)
    pdf.label_value("Registros:", str(len(metrics)))

    if metrics:
        pdf.section_title("Estadisticas")
        weights = [m.weight_kg for m in metrics]
        bmis = [m.bmi for m in metrics]
        pdf.label_value("Peso inicial:", f"{weights[0]:.1f} kg")
        pdf.label_value("Peso final:", f"{weights[-1]:.1f} kg")
        pdf.label_value("Minimo:", f"{min(weights):.1f} kg")
        pdf.label_value("Maximo:", f"{max(weights):.1f} kg")
        pdf.label_value("Cambio:", f"{weights[-1] - weights[0]:+.1f} kg")
        pdf.label_value("IMC inicial:", f"{bmis[0]:.1f}")
        pdf.label_value("IMC final:", f"{bmis[-1]:.1f}")

        pdf.section_title("Tabla de Metricas")
        pdf.add_table(
            ["Fecha", "Peso (kg)", "IMC", "Cintura", "Pecho", "Brazo"],
            [
                [
                    _fmt_date(m.recorded_at),
                    f"{m.weight_kg:.1f}",
                    f"{m.bmi:.1f}",
                    f"{m.waist_cm:.1f}" if m.waist_cm else "-",
                    f"{m.chest_cm:.1f}" if m.chest_cm else "-",
                    f"{m.arm_cm:.1f}" if m.arm_cm else "-",
                ]
                for m in metrics
            ],
            [35, 28, 22, 35, 35, 35],
        )

        if len(metrics) >= 2:
            pdf.add_page()
            pdf.section_title("Grafico de Peso")
            dates = [m.recorded_at for m in metrics]
            fig, ax1 = plt.subplots(figsize=(7, 3.2))
            ax1.plot(dates, weights, "b-o", markersize=3, label="Peso (kg)")
            if goals:
                for g in goals:
                    if g.status in ("active", "achieved"):
                        ax1.axhline(
                            y=g.target_weight_kg,
                            color="green",
                            linestyle="--",
                            linewidth=1,
                            label=f"Meta: {g.target_weight_kg:.1f} kg",
                        )
            ax1.set_ylabel("Peso (kg)", fontsize=9)
            ax1.set_xlabel("Fecha", fontsize=9)
            ax1.tick_params(axis="x", rotation=30, labelsize=7)
            ax1.legend(fontsize=8)
            ax1.set_title("Evolucion de Peso", fontsize=10)
            ax1.grid(True, alpha=0.3)
            fig.tight_layout()
            pdf.add_chart(fig)

            pdf.section_title("Grafico de IMC")
            fig2, ax2 = plt.subplots(figsize=(7, 2.8))
            ax2.fill_between(dates, bmis, alpha=0.3, color="orange")
            ax2.plot(dates, bmis, "o-", color="orange", markersize=3, label="IMC")
            ax2.axhline(
                y=25, color="red", linestyle=":", linewidth=0.8, label="Sobrepeso (25)"
            )
            ax2.axhline(
                y=30,
                color="darkred",
                linestyle=":",
                linewidth=0.8,
                label="Obesidad (30)",
            )
            ax2.set_ylabel("IMC", fontsize=9)
            ax2.tick_params(axis="x", rotation=30, labelsize=7)
            ax2.legend(fontsize=7)
            ax2.set_title("Evolucion de IMC", fontsize=10)
            ax2.grid(True, alpha=0.3)
            fig2.tight_layout()
            pdf.add_chart(fig2)

    if goals:
        pdf.add_page()
        pdf.section_title("Metas de Peso")
        pdf.add_table(
            ["Inicio", "Peso Inicial", "Meta", "Fecha Meta", "Estado"],
            [
                [
                    _fmt_date(g.created_at),
                    f"{g.start_weight_kg:.1f} kg",
                    f"{g.target_weight_kg:.1f} kg",
                    _fmt_date(g.target_date),
                    g.status,
                ]
                for g in goals
            ],
            [35, 35, 35, 40, 45],
        )

    return _build_response(pdf, f"historial_peso_{now_mx().strftime('%Y%m%d')}.pdf")


# ── 3. Prescriptions Report ────────────────────────────────────────────────


@router.get(
    "/prescriptions",
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def report_prescriptions(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    df, dt = _parse_dates(date_from, date_to)
    name = _user_name(current_user)

    q = (
        select(Prescription)
        .where(Prescription.user_id == current_user.id)
        .options(
            selectinload(Prescription.details), selectinload(Prescription.documents)
        )
    )
    if df:
        q = q.where(Prescription.issue_date >= df)
    if dt:
        q = q.where(Prescription.issue_date <= dt)
    q = q.order_by(Prescription.issue_date.desc())
    prescriptions = db.execute(q).scalars().all()

    doctors = (
        db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
        .scalars()
        .all()
    )
    doc_map = {d.id: d.name for d in doctors}

    pdf = ReportPDF("Historial de Recetas", name)
    pdf.alias_nb_pages()
    pdf.add_page()

    period = f"{_fmt_date(df) if df else 'Inicio'} - {_fmt_date(dt) if dt else 'Hoy'}"
    pdf.label_value("Periodo:", period)
    pdf.label_value("Total recetas:", str(len(prescriptions)))

    all_meds: list[PrescriptionDetail] = []
    for rx in prescriptions:
        all_meds.extend(rx.details)

    if prescriptions:
        pdf.section_title("Resumen")
        active_count = sum(1 for d in all_meds if d.status == "active")
        completed_count = sum(1 for d in all_meds if d.status == "completed")
        suspended_count = sum(1 for d in all_meds if d.status == "suspended")
        pdf.label_value("Medicamentos activos:", str(active_count))
        pdf.label_value("Medicamentos completados:", str(completed_count))
        pdf.label_value("Medicamentos suspendidos:", str(suspended_count))

        if all_meds:
            fig, ax = plt.subplots(figsize=(4, 2.5))
            status_data = {}
            for d in all_meds:
                status_data[d.status] = status_data.get(d.status, 0) + 1
            labels_map = {
                "active": "Activo",
                "completed": "Completado",
                "suspended": "Suspendido",
            }
            colors_map = {
                "active": "#4CAF50",
                "completed": "#2196F3",
                "suspended": "#F44336",
            }
            ax.pie(
                status_data.values(),
                labels=[labels_map.get(s, s) for s in status_data.keys()],
                colors=[colors_map.get(s, "#ccc") for s in status_data.keys()],
                autopct="%1.0f%%",
                textprops={"fontsize": 8},
            )
            ax.set_title("Estado de Medicamentos", fontsize=10)
            pdf.add_chart(fig, w=90)

        for rx in prescriptions:
            pdf.add_page()
            pdf.section_title(f"Receta #{rx.id}")
            pdf.label_value("Fecha:", _fmt_date(rx.issue_date))
            pdf.label_value("Doctor:", doc_map.get(rx.doctor_id, "-"))
            pdf.label_value("Diagnostico:", rx.diagnosis or "-")
            pdf.label_value("Vigencia:", rx.valid_until or "-")
            if rx.notes:
                pdf.label_value("Notas:", rx.notes)

            if rx.documents:
                pdf.ln(2)
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(0, 6, "Documento adjunto:", new_x="LMARGIN", new_y="NEXT")
                for doc in rx.documents:
                    pdf.set_font("Helvetica", "", 9)
                    pdf.cell(5)
                    pdf.cell(0, 6, f"- {doc.filename}", new_x="LMARGIN", new_y="NEXT")

            if rx.details:
                pdf.ln(2)
                pdf.add_table(
                    ["Medicamento", "Dosis", "Frecuencia", "Duracion", "Estado"],
                    [
                        [
                            d.medication_name,
                            d.dosage or "-",
                            d.frequency or "-",
                            f"{d.duration_days}d" if d.duration_days else "-",
                            d.status,
                        ]
                        for d in rx.details
                    ],
                    [50, 30, 40, 30, 40],
                )

    return _build_response(pdf, f"recetas_{now_mx().strftime('%Y%m%d')}.pdf")


# ── 4. Appointments Report ─────────────────────────────────────────────────


@router.get(
    "/appointments",
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def report_appointments(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    df, dt = _parse_dates(date_from, date_to)
    name = _user_name(current_user)

    q = select(Appointment).where(Appointment.user_id == current_user.id)
    if df:
        q = q.where(Appointment.date_time >= df)
    if dt:
        q = q.where(Appointment.date_time <= dt)
    q = q.order_by(Appointment.date_time.desc())
    appointments = db.execute(q).scalars().all()

    doctors = (
        db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
        .scalars()
        .all()
    )
    doc_map = {d.id: d.name for d in doctors}

    specialties = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    ).scalar_one_or_none()

    pdf = ReportPDF("Historial de Citas", name)
    pdf.alias_nb_pages()
    pdf.add_page()

    period = f"{_fmt_date(df) if df else 'Inicio'} - {_fmt_date(dt) if dt else 'Hoy'}"
    pdf.label_value("Periodo:", period)
    pdf.label_value("Total citas:", str(len(appointments)))

    if appointments:
        by_status: dict[str, int] = {}
        by_doctor: dict[str, int] = {}
        for a in appointments:
            by_status[a.status] = by_status.get(a.status, 0) + 1
            dname = doc_map.get(a.doctor_id, "Desconocido")
            by_doctor[dname] = by_doctor.get(dname, 0) + 1

        pdf.section_title("Resumen")
        labels_map = {
            "pending": "Pendiente",
            "completed": "Completada",
            "cancelled": "Cancelada",
        }
        for s, c in by_status.items():
            pdf.label_value(f"{labels_map.get(s, s)}:", str(c))

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7, 3))
        colors_map = {
            "pending": "#FF9800",
            "completed": "#4CAF50",
            "cancelled": "#F44336",
        }
        ax1.pie(
            by_status.values(),
            labels=[labels_map.get(s, s) for s in by_status.keys()],
            colors=[colors_map.get(s, "#ccc") for s in by_status.keys()],
            autopct="%1.0f%%",
            textprops={"fontsize": 8},
        )
        ax1.set_title("Por Estado", fontsize=10)

        ax2.barh(list(by_doctor.keys()), list(by_doctor.values()), color="#2196F3")
        ax2.set_xlabel("Citas", fontsize=9)
        ax2.set_title("Por Doctor", fontsize=10)
        ax2.tick_params(labelsize=8)
        fig.tight_layout()
        pdf.add_chart(fig)

        pdf.section_title("Detalle de Citas")
        pdf.add_table(
            ["Fecha", "Doctor", "Motivo", "Ubicacion", "Estado"],
            [
                [
                    _fmt_dt(a.date_time),
                    doc_map.get(a.doctor_id, "-"),
                    (a.reason or "-")[:30],
                    (a.location or "-")[:25],
                    a.status,
                ]
                for a in appointments
            ],
            [40, 40, 45, 40, 25],
        )

        followups = [a for a in appointments if a.requires_followup and a.followup_date]
        if followups:
            pdf.add_page()
            pdf.section_title("Seguimientos Pendientes")
            pdf.add_table(
                ["Cita", "Doctor", "Fecha Seguimiento"],
                [
                    [
                        _fmt_dt(a.date_time),
                        doc_map.get(a.doctor_id, "-"),
                        a.followup_date or "-",
                    ]
                    for a in followups
                ],
                [60, 65, 65],
            )

    return _build_response(pdf, f"citas_{now_mx().strftime('%Y%m%d')}.pdf")


# ── 5. Adherence Report ────────────────────────────────────────────────────


@router.get(
    "/adherence",
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def report_adherence(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    df, dt = _parse_dates(date_from, date_to)
    if not df:
        df = now_mx() - timedelta(days=30)
    if not dt:
        dt = now_mx()
    name = _user_name(current_user)

    rx_records = (
        db.execute(
            select(AdherenceRecord)
            .join(PrescriptionDetail)
            .join(Prescription)
            .where(
                Prescription.user_id == current_user.id,
                AdherenceRecord.scheduled_time >= df,
                AdherenceRecord.scheduled_time <= dt,
            )
        )
        .scalars()
        .all()
    )

    standalone_records = (
        db.execute(
            select(AdherenceRecord).where(
                AdherenceRecord.user_id == current_user.id,
                AdherenceRecord.prescription_detail_id.is_(None),
                AdherenceRecord.scheduled_time >= df,
                AdherenceRecord.scheduled_time <= dt,
            )
        )
        .scalars()
        .all()
    )

    records = sorted(
        list(rx_records) + list(standalone_records),
        key=lambda r: r.scheduled_time,
    )

    details_map: dict[int, PrescriptionDetail] = {}
    if rx_records:
        detail_ids = {
            r.prescription_detail_id
            for r in rx_records
            if r.prescription_detail_id is not None
        }
        for did in detail_ids:
            det = db.execute(
                select(PrescriptionDetail).where(PrescriptionDetail.id == did)
            ).scalar_one_or_none()
            if det:
                details_map[did] = det

    def _med_name(r: AdherenceRecord) -> str:
        if r.prescription_detail_id and r.prescription_detail_id in details_map:
            return details_map[r.prescription_detail_id].medication_name
        return r.medication_name or "Desconocido"

    pdf = ReportPDF("Adherencia a Medicamentos", name)
    pdf.alias_nb_pages()
    pdf.add_page()

    period = f"{_fmt_date(df)} - {_fmt_date(dt)}"
    pdf.label_value("Periodo:", period)
    pdf.label_value("Registros:", str(len(records)))

    if records:
        total = len(records)
        by_status: dict[str, int] = {}
        for r in records:
            by_status[r.status] = by_status.get(r.status, 0) + 1

        taken_count = by_status.get("taken", 0) + by_status.get("late", 0)
        rate = (taken_count / total * 100) if total else 0

        pdf.section_title("Resumen General")
        pdf.label_value("Dosis programadas:", str(total))
        labels_map = {
            "taken": "Tomadas",
            "skipped": "Saltadas",
            "late": "Tarde",
            "pending": "Pendientes",
        }
        colors_map = {
            "taken": "#4CAF50",
            "skipped": "#F44336",
            "late": "#FF9800",
            "pending": "#9E9E9E",
        }
        for s, c in by_status.items():
            pdf.label_value(f"  {labels_map.get(s, s)}:", str(c))
        pdf.label_value("Tasa de adherencia:", f"{rate:.0f}%")

        fig, ax = plt.subplots(figsize=(4, 2.5))
        ax.pie(
            by_status.values(),
            labels=[labels_map.get(s, s) for s in by_status.keys()],
            colors=[colors_map.get(s, "#ccc") for s in by_status.keys()],
            autopct="%1.0f%%",
            textprops={"fontsize": 8},
        )
        ax.set_title("Distribucion de Adherencia", fontsize=10)
        pdf.add_chart(fig, w=90)

        by_med: dict[str, list[AdherenceRecord]] = {}
        for r in records:
            mname = _med_name(r)
            by_med.setdefault(mname, []).append(r)

        pdf.add_page()
        pdf.section_title("Por Medicamento")
        for med_name, recs in by_med.items():
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(0, 7, med_name, new_x="LMARGIN", new_y="NEXT")
            med_total = len(recs)
            med_taken = sum(1 for r in recs if r.status in ("taken", "late"))
            med_rate = (med_taken / med_total * 100) if med_total else 0
            pdf.label_value("  Dosis:", str(med_total))
            pdf.label_value("  Adherencia:", f"{med_rate:.0f}%")

        if len(by_med) > 1:
            pdf.add_page()
            pdf.section_title("Comparativa por Medicamento")
            fig2, ax2 = plt.subplots(figsize=(7, 3.5))
            med_names = list(by_med.keys())
            med_rates = []
            for mn in med_names:
                recs = by_med[mn]
                t = len(recs)
                tk = sum(1 for r in recs if r.status in ("taken", "late"))
                med_rates.append((tk / t * 100) if t else 0)
            bar_colors = [
                "#4CAF50" if r >= 80 else "#FF9800" if r >= 50 else "#F44336"
                for r in med_rates
            ]
            ax2.barh(med_names, med_rates, color=bar_colors)
            ax2.set_xlim(0, 100)
            ax2.axvline(
                x=80, color="green", linestyle="--", linewidth=0.8, label="Meta 80%"
            )
            ax2.set_xlabel("% Adherencia", fontsize=9)
            ax2.set_title("Adherencia por Medicamento", fontsize=10)
            ax2.legend(fontsize=8)
            ax2.tick_params(labelsize=8)
            fig2.tight_layout()
            pdf.add_chart(fig2)

        pdf.add_page()
        pdf.section_title("Detalle de Tomas")
        status_labels = {
            "taken": "Tomada",
            "skipped": "Saltada",
            "late": "Tarde",
            "pending": "Pendiente",
        }
        detail_rows = []
        for r in records:
            detail_rows.append(
                [
                    _fmt_date(r.scheduled_time),
                    r.scheduled_time.strftime("%H:%M")
                    if isinstance(r.scheduled_time, datetime)
                    else "-",
                    _med_name(r),
                    status_labels.get(r.status, r.status),
                    (r.notes or "-")[:40],
                ]
            )
        pdf.add_table(
            ["Fecha", "Hora", "Medicamento", "Estado", "Notas"],
            detail_rows,
            col_widths=[28, 18, 60, 24, 60],
        )

    return _build_response(pdf, f"adherencia_{now_mx().strftime('%Y%m%d')}.pdf")


# ── 6. Patient Profile ─────────────────────────────────────────────────────


@router.get(
    "/patient-profile",
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def report_patient_profile(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    user = current_user
    name = _user_name(user)

    profile = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    ).scalar_one_or_none()

    doctors = (
        db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalars().all()
    )

    meds = (
        db.execute(select(Medication).where(Medication.user_id == user.id))
        .scalars()
        .all()
    )

    docs_count = (
        db.execute(
            select(func.count())
            .select_from(MedicalDocument)
            .where(MedicalDocument.user_id == user.id)
        ).scalar()
        or 0
    )

    pdf = ReportPDF("Ficha del Paciente", name)
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.section_title("Datos Personales")
    pdf.label_value("Nombre:", name)
    pdf.label_value("Email:", user.email or "-")
    pdf.label_value("Sexo:", user.sex or "-")
    pdf.label_value("Altura:", f"{user.height_cm:.0f} cm" if user.height_cm else "-")

    if profile:
        pdf.section_title("Perfil Medico")
        pdf.label_value("Fecha de nacimiento:", profile.date_of_birth or "-")
        pdf.label_value("Tipo de sangre:", profile.blood_type or "-")
        pdf.label_value("Alergias:", profile.allergies or "Ninguna registrada")
        pdf.label_value(
            "Condiciones cronicas:", profile.chronic_conditions or "Ninguna registrada"
        )

        pdf.section_title("Contacto de Emergencia")
        pdf.label_value("Nombre:", profile.emergency_contact_name or "-")
        pdf.label_value("Telefono:", profile.emergency_contact_phone or "-")

    if doctors:
        pdf.section_title("Doctores")
        pdf.add_table(
            ["Nombre", "Especialidad", "Telefono", "Email"],
            [
                [d.name, d.specialty_id and "-", d.phone or "-", d.email or "-"]
                for d in doctors
            ],
            [50, 50, 45, 45],
        )

    if meds:
        pdf.section_title("Catalogo de Medicamentos")
        pdf.add_table(
            ["Nombre Generico", "Marca", "Presentacion", "Concentracion"],
            [
                [
                    m.generic_name,
                    m.brand_name or "-",
                    m.presentation or "-",
                    m.concentration or "-",
                ]
                for m in meds
            ],
            [50, 50, 45, 45],
        )

    pdf.section_title("Resumen de Registros")
    pdf.label_value("Total doctores:", str(len(doctors)))
    pdf.label_value("Total medicamentos en catalogo:", str(len(meds)))
    pdf.label_value("Total documentos:", str(docs_count))

    return _build_response(pdf, f"ficha_paciente_{now_mx().strftime('%Y%m%d')}.pdf")


# ── 7. Blood Pressure Report ───────────────────────────────────────────────

_BP_CLASS_LABELS = {
    "Normal": ("Estable", 76, 175, 80),
    "Elevated": ("Elevada", 234, 179, 8),
    "Stage 1": ("Alta (Etapa 1)", 249, 115, 22),
    "Stage 2": ("Alta (Etapa 2)", 239, 68, 68),
    "Crisis": ("Crisis", 185, 28, 28),
}

_HR_STATUS = {
    "low": ("Bajo", 234, 179, 8),
    "normal": ("Normal", 76, 175, 80),
    "high": ("Alto", 239, 68, 68),
}


def _hr_status(hr: float) -> tuple[str, int, int, int]:
    if hr < 60:
        return _HR_STATUS["low"]
    if hr <= 100:
        return _HR_STATUS["normal"]
    return _HR_STATUS["high"]


def _bp_stat_card(
    pdf: ReportPDF,
    x: float,
    y: float,
    w: float,
    h: float,
    title: str,
    value: str,
    status: str,
    rgb: tuple[int, int, int],
):
    pdf.set_fill_color(245, 247, 250)
    pdf.rect(x, y, w, h, "F")
    pdf.set_draw_color(220, 225, 235)
    pdf.rect(x, y, w, h, "D")

    pdf.set_xy(x + 3, y + 2)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(w - 6, 4, title)

    pdf.set_xy(x + 3, y + 7)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(w - 6, 8, value)

    r, g, b = rgb
    pdf.set_xy(x + 3, y + 17)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_fill_color(r, g, b)
    pdf.set_text_color(255, 255, 255)
    bw = pdf.get_string_width(status) + 6
    pdf.cell(bw, 4, status, fill=True)


@router.get(
    "/blood-pressure",
    dependencies=[Depends(require_permissions("blood_pressure:read"))],
)
def report_blood_pressure(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    from app.schemas.blood_pressure import classify_bp

    df, dt = _parse_dates(date_from, date_to)
    name = _user_name(current_user)

    q = select(BloodPressure).where(BloodPressure.user_id == current_user.id)
    if df:
        q = q.where(BloodPressure.recorded_at >= df)
    if dt:
        q = q.where(BloodPressure.recorded_at <= dt)
    q = q.order_by(BloodPressure.recorded_at)
    readings = db.execute(q).scalars().all()

    pdf = ReportPDF("Historial de Presion Arterial", name)
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(25, 5, "Paciente:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(80, 5, name)

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(20, 5, "Periodo:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(30, 30, 30)
    period = f"{_fmt_date(df) if df else 'Inicio'} - {_fmt_date(dt) if dt else 'Hoy'}"
    pdf.cell(0, 5, period, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(2)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    if not readings:
        pdf.set_font("Helvetica", "I", 11)
        pdf.set_text_color(130, 130, 130)
        pdf.cell(0, 20, "Sin lecturas en el periodo seleccionado", align="C")
        return _build_response(
            pdf, f"presion_arterial_{now_mx().strftime('%Y%m%d')}.pdf"
        )

    sys_vals = [r.systolic for r in readings]
    dia_vals = [r.diastolic for r in readings]
    hr_vals = [r.heart_rate for r in readings if r.heart_rate]

    avg_sys = sum(sys_vals) / len(sys_vals)
    avg_dia = sum(dia_vals) / len(dia_vals)
    avg_class = classify_bp(avg_sys, avg_dia)
    avg_label, avg_r, avg_g, avg_b = _BP_CLASS_LABELS.get(
        avg_class, ("-", 100, 100, 100)
    )

    max_idx = max(range(len(sys_vals)), key=lambda i: sys_vals[i])
    min_idx = min(range(len(sys_vals)), key=lambda i: sys_vals[i])

    card_y = pdf.get_y()
    card_w = 90
    card_h = 24
    gap = 10

    _bp_stat_card(
        pdf,
        10,
        card_y,
        card_w,
        card_h,
        "Promedio Presion Arterial",
        f"{avg_sys:.0f}/{avg_dia:.0f} mmHg",
        avg_label,
        (avg_r, avg_g, avg_b),
    )

    if hr_vals:
        avg_hr = sum(hr_vals) / len(hr_vals)
        hr_label, hr_r, hr_g, hr_b = _hr_status(avg_hr)
        _bp_stat_card(
            pdf,
            10 + card_w + gap,
            card_y,
            card_w,
            card_h,
            "Promedio Frecuencia Cardiaca",
            f"{avg_hr:.0f} bpm",
            hr_label,
            (hr_r, hr_g, hr_b),
        )

    row2_y = card_y + card_h + 6
    r_max = readings[max_idx]
    r_min = readings[min_idx]
    max_class = classify_bp(r_max.systolic, r_max.diastolic)
    min_class = classify_bp(r_min.systolic, r_min.diastolic)
    max_dt = _fmt_dt(r_max.recorded_at) if r_max.recorded_at else "-"
    min_dt = _fmt_dt(r_min.recorded_at) if r_min.recorded_at else "-"

    _bp_stat_card(
        pdf,
        10,
        row2_y,
        card_w,
        card_h,
        "Mayor Presion Arterial",
        f"{r_max.systolic:.0f}/{r_max.diastolic:.0f} mmHg",
        max_dt,
        _BP_CLASS_LABELS.get(max_class, ("-", 100, 100, 100))[1:],
    )

    _bp_stat_card(
        pdf,
        10 + card_w + gap,
        row2_y,
        card_w,
        card_h,
        "Menor Presion Arterial",
        f"{r_min.systolic:.0f}/{r_min.diastolic:.0f} mmHg",
        min_dt,
        _BP_CLASS_LABELS.get(min_class, ("-", 100, 100, 100))[1:],
    )

    pdf.set_y(row2_y + card_h + 4)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(
        0, 5, f"Total de registros: {len(readings)}", new_x="LMARGIN", new_y="NEXT"
    )

    if len(readings) >= 2:
        pdf.ln(2)
        pdf.section_title("Evolucion de Presion Arterial")
        dates_r = [r.recorded_at for r in readings]
        fig, ax = plt.subplots(figsize=(7, 3))
        ax.plot(dates_r, sys_vals, "r-o", markersize=3, label="Sistolica")
        ax.plot(dates_r, dia_vals, "b-o", markersize=3, label="Diastolica")
        ax.axhline(
            y=120, color="orange", linestyle=":", linewidth=0.7, label="120 (Elevated)"
        )
        ax.axhline(
            y=130,
            color="darkorange",
            linestyle=":",
            linewidth=0.7,
            label="130 (Stage 1)",
        )
        ax.axhline(
            y=140, color="red", linestyle=":", linewidth=0.7, label="140 (Stage 2)"
        )
        ax.axhline(
            y=180, color="darkred", linestyle=":", linewidth=0.7, label="180 (Crisis)"
        )
        ax.axhline(
            y=80,
            color="cornflowerblue",
            linestyle=":",
            linewidth=0.7,
            label="80 (Normal)",
        )
        ax.axhline(
            y=90, color="blue", linestyle=":", linewidth=0.7, label="90 (Stage 1)"
        )
        ax.fill_between(dates_r, dia_vals, sys_vals, alpha=0.12, color="red")
        ax.set_ylabel("mmHg", fontsize=9)
        ax.tick_params(axis="x", rotation=30, labelsize=7)
        ax.legend(fontsize=6.5, loc="upper left", ncol=2)
        ax.set_title("Evolucion de Presion Arterial", fontsize=10)
        ax.grid(True, alpha=0.3)
        fig.tight_layout()
        pdf.add_chart(fig)

    pdf.add_page()
    pdf.section_title("Registro de Mediciones")
    pdf.add_table(
        ["Fecha/Hora", "Sist.", "Diast.", "Pulso", "Categoria", "Notas"],
        [
            [
                _fmt_dt(r.recorded_at)
                if isinstance(r.recorded_at, datetime)
                else str(r.recorded_at)[:16],
                f"{r.systolic:.0f}",
                f"{r.diastolic:.0f}",
                str(r.heart_rate) if r.heart_rate else "-",
                classify_bp(r.systolic, r.diastolic),
                (r.notes or "-")[:28],
            ]
            for r in reversed(readings)
        ],
        [38, 18, 18, 18, 38, 60],
    )

    return _build_response(pdf, f"presion_arterial_{now_mx().strftime('%Y%m%d')}.pdf")
