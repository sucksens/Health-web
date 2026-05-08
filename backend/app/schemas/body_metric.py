from datetime import datetime

from pydantic import BaseModel, Field


class BodyMetricCreate(BaseModel):
    weight_kg: float = Field(..., gt=0, le=500)
    waist_cm: float | None = Field(default=None, gt=0, le=300)
    chest_cm: float | None = Field(default=None, gt=0, le=300)
    arm_cm: float | None = Field(default=None, gt=0, le=300)
    recorded_at: datetime | None = None


class BodyMetricUpdate(BaseModel):
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    waist_cm: float | None = Field(default=None, gt=0, le=300)
    chest_cm: float | None = Field(default=None, gt=0, le=300)
    arm_cm: float | None = Field(default=None, gt=0, le=300)
    recorded_at: datetime | None = None


class BodyMetricOut(BaseModel):
    id: int
    user_id: int
    weight_kg: float
    bmi: float
    waist_cm: float | None
    chest_cm: float | None
    arm_cm: float | None
    recorded_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
