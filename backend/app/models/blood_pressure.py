from __future__ import annotations

from datetime import datetime

from sqlalchemy import Float, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base
from app.config.tz import now_mx


class BloodPressure(Base):
    __tablename__ = "blood_pressure_readings"
    __table_args__ = (Index("ix_bp_user_recorded", "user_id", "recorded_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    systolic: Mapped[float] = mapped_column(Float, nullable=False)
    diastolic: Mapped[float] = mapped_column(Float, nullable=False)
    heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: now_mx())

    user: Mapped["User"] = relationship(back_populates="blood_pressures")

    def __repr__(self) -> str:
        return f"<BloodPressure(id={self.id}, user_id={self.user_id}, {self.systolic}/{self.diastolic})>"
