from __future__ import annotations

from datetime import datetime

from sqlalchemy import Integer, DateTime, ForeignKey, String, Text, Boolean, JSON, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base
from app.config.tz import now_mx


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    date_of_birth: Mapped[str | None] = mapped_column(String(20), nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    chronic_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    emergency_contact_phone: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: now_mx(),
        onupdate=lambda: now_mx(),
    )

    user: Mapped["User"] = relationship(back_populates="patient_profile")

    def __repr__(self) -> str:
        return f"<PatientProfile(id={self.id}, user_id={self.user_id})>"


class Specialty(Base):
    __tablename__ = "specialties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())

    user: Mapped["User"] = relationship(back_populates="specialties")
    doctors: Mapped[list["Doctor"]] = relationship(
        secondary="doctor_specialties", back_populates="specialties", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Specialty(id={self.id}, name='{self.name}')>"


doctor_specialties = Table(
    "doctor_specialties",
    Base.metadata,
    Column("doctor_id", Integer, ForeignKey("doctors.id", ondelete="CASCADE"), primary_key=True),
    Column("specialty_id", Integer, ForeignKey("specialties.id", ondelete="CASCADE"), primary_key=True),
)


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    license_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: now_mx(),
        onupdate=lambda: now_mx(),
    )

    user: Mapped["User"] = relationship(back_populates="doctors")
    specialties: Mapped[list["Specialty"]] = relationship(
        secondary="doctor_specialties", back_populates="doctors", lazy="select"
    )
    appointments: Mapped[list["Appointment"]] = relationship(
        back_populates="doctor", lazy="select"
    )
    prescriptions: Mapped[list["Prescription"]] = relationship(
        back_populates="doctor", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Doctor(id={self.id}, name='{self.name}')>"


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    doctor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False
    )
    date_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    post_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_followup: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    followup_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: now_mx(),
        onupdate=lambda: now_mx(),
    )

    user: Mapped["User"] = relationship(back_populates="appointments")
    doctor: Mapped["Doctor"] = relationship(back_populates="appointments")
    prescription: Mapped["Prescription | None"] = relationship(
        back_populates="appointment", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Appointment(id={self.id}, status='{self.status}')>"


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    appointment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    doctor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False
    )
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    issue_date: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())
    valid_until: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: now_mx(),
        onupdate=lambda: now_mx(),
    )

    user: Mapped["User"] = relationship(back_populates="prescriptions")
    appointment: Mapped["Appointment | None"] = relationship(
        back_populates="prescription"
    )
    doctor: Mapped["Doctor"] = relationship(back_populates="prescriptions")
    details: Mapped[list["PrescriptionDetail"]] = relationship(
        back_populates="prescription", lazy="select", cascade="all, delete-orphan"
    )
    documents: Mapped[list["MedicalDocument"]] = relationship(
        back_populates="prescription", lazy="select", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Prescription(id={self.id})>"


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    generic_name: Mapped[str] = mapped_column(String(200), nullable=False)
    brand_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    presentation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    concentration: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: now_mx(),
        onupdate=lambda: now_mx(),
    )

    user: Mapped["User"] = relationship(back_populates="medications")

    def __repr__(self) -> str:
        return f"<Medication(id={self.id}, name='{self.generic_name}')>"


class PrescriptionDetail(Base):
    __tablename__ = "prescription_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prescription_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False
    )
    medication_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("medications.id", ondelete="SET NULL"), nullable=True
    )
    medication_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    scheduled_times: Mapped[list | None] = mapped_column(
        JSON, nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())

    prescription: Mapped["Prescription"] = relationship(back_populates="details")
    medication: Mapped["Medication | None"] = relationship()
    adherence_records: Mapped[list["AdherenceRecord"]] = relationship(
        back_populates="prescription_detail",
        lazy="select",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<PrescriptionDetail(id={self.id}, name='{self.medication_name}')>"


class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    prescription_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("prescriptions.id", ondelete="SET NULL"), nullable=True
    )
    appointment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())

    user: Mapped["User"] = relationship(back_populates="medical_documents")
    prescription: Mapped["Prescription | None"] = relationship(
        back_populates="documents"
    )

    def __repr__(self) -> str:
        return f"<MedicalDocument(id={self.id}, filename='{self.filename}')>"


class AdherenceRecord(Base):
    __tablename__ = "adherence_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prescription_detail_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("prescription_details.id", ondelete="CASCADE"),
        nullable=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )
    medication_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    taken_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())

    prescription_detail: Mapped["PrescriptionDetail | None"] = relationship(
        back_populates="adherence_records"
    )

    def __repr__(self) -> str:
        return f"<AdherenceRecord(id={self.id}, status='{self.status}')>"
