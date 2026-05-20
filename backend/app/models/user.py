from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Float, Integer, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base
from app.config.tz import now_mx


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    sex: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(default=False, nullable=False)
    token_version: Mapped[int] = mapped_column(default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: now_mx(),
        onupdate=lambda: now_mx(),
    )

    roles: Mapped[list["Role"]] = relationship(
        secondary="user_roles", back_populates="users", lazy="selectin"
    )

    body_metrics: Mapped[list["BodyMetric"]] = relationship(
        back_populates="user", lazy="select", order_by="BodyMetric.recorded_at.desc()"
    )

    weight_goals: Mapped[list["WeightGoal"]] = relationship(
        back_populates="user", lazy="select", order_by="WeightGoal.created_at.desc()"
    )

    patient_profile: Mapped["PatientProfile | None"] = relationship(
        back_populates="user", uselist=False, lazy="select"
    )

    specialties: Mapped[list["Specialty"]] = relationship(
        back_populates="user", lazy="select", cascade="all, delete-orphan"
    )

    doctors: Mapped[list["Doctor"]] = relationship(
        back_populates="user", lazy="select", cascade="all, delete-orphan"
    )

    appointments: Mapped[list["Appointment"]] = relationship(
        back_populates="user", lazy="select", cascade="all, delete-orphan"
    )

    prescriptions: Mapped[list["Prescription"]] = relationship(
        back_populates="user", lazy="select", cascade="all, delete-orphan"
    )

    medications: Mapped[list["Medication"]] = relationship(
        back_populates="user", lazy="select", cascade="all, delete-orphan"
    )

    medical_documents: Mapped[list["MedicalDocument"]] = relationship(
        back_populates="user", lazy="select", cascade="all, delete-orphan"
    )

    blood_pressures: Mapped[list["BloodPressure"]] = relationship(
        back_populates="user",
        lazy="select",
        order_by="BloodPressure.recorded_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}')>"
