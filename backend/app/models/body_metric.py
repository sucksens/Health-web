from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base
from app.config.tz import now_mx


class BodyMetric(Base):
    __tablename__ = "body_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    bmi: Mapped[float] = mapped_column(Float, nullable=False)
    waist_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    chest_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    arm_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: now_mx()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: now_mx()
    )

    user: Mapped["User"] = relationship(back_populates="body_metrics")

    def __repr__(self) -> str:
        return f"<BodyMetric(id={self.id}, user_id={self.user_id}, weight={self.weight_kg})>"
