from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, Field


class WeightGoalCreate(BaseModel):
    target_weight_kg: float = Field(..., gt=0, le=500)
    start_weight_kg: float = Field(..., gt=0, le=500)
    target_date: date = Field(..., ge=date.today())
    notes: Optional[str] = Field(default=None, max_length=500)


class WeightGoalUpdate(BaseModel):
    target_weight_kg: Optional[float] = Field(default=None, gt=0, le=500)
    target_date: Optional[date] = Field(default=None)
    notes: Optional[str] = Field(default=None, max_length=500)


class WeightGoalOut(BaseModel):
    id: int
    user_id: int
    target_weight_kg: float
    start_weight_kg: float
    target_date: date
    status: str
    notes: Optional[str]
    achieved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WeightGoalWithProgress(BaseModel):
    id: int
    user_id: int
    target_weight_kg: float
    start_weight_kg: float
    target_date: date
    status: str
    notes: Optional[str]
    achieved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    current_weight: Optional[float]
    progress: Optional[float]
    days_remaining: int
    total_change: Optional[float]
    avg_weekly_change: Optional[float]

    model_config = {"from_attributes": True}
