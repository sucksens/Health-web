from __future__ import annotations

from datetime import datetime, date, timezone

from sqlalchemy import Float, Integer, DateTime, ForeignKey, String, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base
from app.config.tz import now_mx


class WeightGoal(Base):
    __tablename__ = "weight_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    target_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    start_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    achieved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: now_mx()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: now_mx(),
        onupdate=lambda: now_mx(),
    )

    user: Mapped["User"] = relationship(back_populates="weight_goals")

    def __repr__(self) -> str:
        return f"<WeightGoal(id={self.id}, user_id={self.user_id}, target={self.target_weight_kg}, status={self.status})>"
