from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class PatientProfileUpdate(BaseModel):
    date_of_birth: Optional[str] = Field(default=None, max_length=20)
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    blood_type: Optional[str] = Field(default=None, max_length=10)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=30)


class PatientProfileOut(BaseModel):
    id: int
    user_id: int
    date_of_birth: Optional[str]
    allergies: Optional[str]
    chronic_conditions: Optional[str]
    blood_type: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class SpecialtyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)


class SpecialtyUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)


class SpecialtyOut(BaseModel):
    id: int
    user_id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DoctorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    specialty_ids: list[int] = Field(default_factory=list)
    license_number: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    email: Optional[str] = Field(default=None, max_length=255)
    address: Optional[str] = Field(default=None, max_length=300)
    notes: Optional[str] = None


class DoctorUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    specialty_ids: Optional[list[int]] = None
    license_number: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    email: Optional[str] = Field(default=None, max_length=255)
    address: Optional[str] = Field(default=None, max_length=300)
    notes: Optional[str] = None


class DoctorOut(BaseModel):
    id: int
    user_id: int
    name: str
    specialty_ids: list[int] = []
    license_number: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_specialty_ids(cls, values):
        if isinstance(values, dict):
            return values
        specialty_ids = [s.id for s in values.specialties] if hasattr(values, "specialties") else []
        return {
            "id": values.id,
            "user_id": values.user_id,
            "name": values.name,
            "specialty_ids": specialty_ids,
            "license_number": values.license_number,
            "phone": values.phone,
            "email": values.email,
            "address": values.address,
            "notes": values.notes,
            "created_at": values.created_at,
            "updated_at": values.updated_at,
        }


class AppointmentCreate(BaseModel):
    doctor_id: int
    date_time: datetime
    reason: Optional[str] = None
    location: Optional[str] = Field(default=None, max_length=300)


class AppointmentUpdate(BaseModel):
    doctor_id: Optional[int] = None
    date_time: Optional[datetime] = None
    reason: Optional[str] = None
    location: Optional[str] = Field(default=None, max_length=300)
    status: Optional[str] = Field(
        default=None, pattern="^(pending|completed|cancelled)$"
    )
    post_notes: Optional[str] = None
    requires_followup: Optional[bool] = None
    followup_date: Optional[str] = Field(default=None, max_length=20)


class AppointmentOut(BaseModel):
    id: int
    user_id: int
    doctor_id: int
    date_time: datetime
    reason: Optional[str]
    location: Optional[str]
    status: str
    post_notes: Optional[str]
    requires_followup: bool
    followup_date: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MedicationCreate(BaseModel):
    generic_name: str = Field(..., min_length=1, max_length=200)
    brand_name: Optional[str] = Field(default=None, max_length=200)
    presentation: Optional[str] = Field(default=None, max_length=100)
    concentration: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None


class MedicationUpdate(BaseModel):
    generic_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    brand_name: Optional[str] = Field(default=None, max_length=200)
    presentation: Optional[str] = Field(default=None, max_length=100)
    concentration: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None


class MedicationOut(BaseModel):
    id: int
    user_id: int
    generic_name: str
    brand_name: Optional[str]
    presentation: Optional[str]
    concentration: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PrescriptionDetailCreate(BaseModel):
    medication_id: Optional[int] = None
    medication_name: str = Field(..., min_length=1, max_length=200)
    dosage: Optional[str] = Field(default=None, max_length=100)
    frequency: Optional[str] = Field(default=None, max_length=100)
    duration_days: Optional[int] = Field(default=None, gt=0)
    start_date: Optional[str] = Field(default=None, max_length=20)
    end_date: Optional[str] = Field(default=None, max_length=20)
    instructions: Optional[str] = None
    scheduled_times: Optional[list[str]] = None


class PrescriptionDetailUpdate(BaseModel):
    dosage: Optional[str] = Field(default=None, max_length=100)
    frequency: Optional[str] = Field(default=None, max_length=100)
    duration_days: Optional[int] = Field(default=None, gt=0)
    start_date: Optional[str] = Field(default=None, max_length=20)
    end_date: Optional[str] = Field(default=None, max_length=20)
    instructions: Optional[str] = None
    status: Optional[str] = Field(
        default=None, pattern="^(active|completed|suspended)$"
    )
    scheduled_times: Optional[list[str]] = None


class PrescriptionDetailOut(BaseModel):
    id: int
    prescription_id: int
    medication_id: Optional[int]
    medication_name: str
    dosage: Optional[str]
    frequency: Optional[str]
    duration_days: Optional[int]
    start_date: Optional[str]
    end_date: Optional[str]
    instructions: Optional[str]
    status: str
    scheduled_times: Optional[list[str]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PrescriptionCreate(BaseModel):
    appointment_id: Optional[int] = None
    doctor_id: int
    diagnosis: Optional[str] = None
    valid_until: Optional[str] = Field(default=None, max_length=20)
    notes: Optional[str] = None
    details: list[PrescriptionDetailCreate] = Field(default_factory=list)


class PrescriptionUpdate(BaseModel):
    diagnosis: Optional[str] = None
    valid_until: Optional[str] = Field(default=None, max_length=20)
    notes: Optional[str] = None


class PrescriptionOut(BaseModel):
    id: int
    user_id: int
    appointment_id: Optional[int]
    doctor_id: int
    diagnosis: Optional[str]
    issue_date: datetime
    valid_until: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    details: list[PrescriptionDetailOut] = []
    documents: list["MedicalDocumentOut"] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class MedicalDocumentOut(BaseModel):
    id: int
    user_id: int
    prescription_id: Optional[int]
    appointment_id: Optional[int]
    filename: str
    doc_type: str
    mime_type: Optional[str]
    file_size: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class AdherenceRecordCreate(BaseModel):
    prescription_detail_id: Optional[int] = None
    medication_name: Optional[str] = None
    scheduled_time: datetime
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_source(self):
        if not self.prescription_detail_id and not self.medication_name:
            raise ValueError("Se requiere prescription_detail_id o medication_name")
        return self


class AdherenceRecordUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(taken|skipped|late)$")
    notes: Optional[str] = None
    scheduled_time: Optional[datetime] = None


class AdherenceRecordOut(BaseModel):
    id: int
    prescription_detail_id: Optional[int] = None
    scheduled_time: datetime
    taken_at: Optional[str]
    status: str
    notes: Optional[str]
    created_at: datetime
    medication_name: Optional[str] = None

    model_config = {"from_attributes": True}


PrescriptionOut.model_rebuild()
