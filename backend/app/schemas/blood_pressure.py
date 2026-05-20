from datetime import datetime

from pydantic import BaseModel, Field, model_validator


def classify_bp(systolic: float, diastolic: float) -> str:
    if systolic > 180 or diastolic > 120:
        return "Crisis"
    if systolic >= 140 or diastolic >= 90:
        return "Stage 2"
    if systolic >= 130 or diastolic >= 80:
        return "Stage 1"
    if systolic >= 120 and diastolic < 80:
        return "Elevated"
    return "Normal"


class BloodPressureCreate(BaseModel):
    systolic: float = Field(..., gt=30, le=300)
    diastolic: float = Field(..., gt=20, le=200)
    heart_rate: int | None = Field(default=None, gt=20, le=300)
    notes: str | None = Field(default=None, max_length=500)
    recorded_at: datetime | None = None

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.systolic <= self.diastolic:
            raise ValueError("systolic must be greater than diastolic")
        return self


class BloodPressureUpdate(BaseModel):
    systolic: float | None = Field(default=None, gt=30, le=300)
    diastolic: float | None = Field(default=None, gt=20, le=200)
    heart_rate: int | None = Field(default=None, gt=20, le=300)
    notes: str | None = Field(default=None, max_length=500)
    recorded_at: datetime | None = None

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.systolic is not None and self.diastolic is not None:
            if self.systolic <= self.diastolic:
                raise ValueError("systolic must be greater than diastolic")
        return self


class BloodPressureOut(BaseModel):
    id: int
    user_id: int
    systolic: float
    diastolic: float
    heart_rate: int | None
    notes: str | None
    classification: str
    recorded_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            user_id=obj.user_id,
            systolic=obj.systolic,
            diastolic=obj.diastolic,
            heart_rate=obj.heart_rate,
            notes=obj.notes,
            classification=classify_bp(obj.systolic, obj.diastolic),
            recorded_at=obj.recorded_at,
            created_at=obj.created_at,
        )


class BloodPressureListResponse(BaseModel):
    items: list[BloodPressureOut]
    total: int
