from datetime import timedelta

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    UploadFile,
    File,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.dependencies import CurrentUser, require_permissions
from app.database.db import get_db
from app.models.medical_history import (
    PatientProfile,
    Specialty,
    Doctor,
    Appointment,
    Prescription,
    Medication,
    PrescriptionDetail,
    MedicalDocument,
    AdherenceRecord,
)
from app.schemas.medical_history import (
    PatientProfileUpdate,
    PatientProfileOut,
    SpecialtyCreate,
    SpecialtyUpdate,
    SpecialtyOut,
    DoctorCreate,
    DoctorUpdate,
    DoctorOut,
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentOut,
    MedicationCreate,
    MedicationUpdate,
    MedicationOut,
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionOut,
    PrescriptionDetailCreate,
    PrescriptionDetailUpdate,
    PrescriptionDetailOut,
    MedicalDocumentOut,
    AdherenceRecordCreate,
    AdherenceRecordUpdate,
    AdherenceRecordOut,
)
from app.services import log_activity
from app.storage import save_upload, delete_file
from app.config.tz import now_mx
from app.config.adherence import parse_frequency_to_hours

router = APIRouter(prefix="/medical-history", tags=["Medical History"])


# ── Patient Profile ──────────────────────────────────────────────────────────


@router.get(
    "/profile",
    response_model=PatientProfileOut | None,
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def get_profile(current_user: CurrentUser, db: Session = Depends(get_db)):
    return db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    ).scalar_one_or_none()


@router.put(
    "/profile",
    response_model=PatientProfileOut,
    dependencies=[Depends(require_permissions("medical_history:create"))],
)
def upsert_profile(
    body: PatientProfileUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    profile = db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    ).scalar_one_or_none()

    if not profile:
        profile = PatientProfile(
            user_id=current_user.id, **body.model_dump(exclude_unset=True)
        )
        db.add(profile)
    else:
        for key, value in body.model_dump(exclude_unset=True).items():
            setattr(profile, key, value)

    db.flush()
    db.refresh(profile)
    return profile


# ── Specialties ──────────────────────────────────────────────────────────────


@router.get(
    "/specialties",
    response_model=list[SpecialtyOut],
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def list_specialties(current_user: CurrentUser, db: Session = Depends(get_db)):
    result = db.execute(
        select(Specialty)
        .where(Specialty.user_id == current_user.id)
        .order_by(Specialty.name)
    )
    return result.scalars().all()


@router.post(
    "/specialties",
    response_model=SpecialtyOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("medical_history:create"))],
)
def create_specialty(
    body: SpecialtyCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    spec = Specialty(user_id=current_user.id, name=body.name)
    db.add(spec)
    db.flush()
    db.refresh(spec)
    return spec


@router.patch(
    "/specialties/{spec_id}",
    response_model=SpecialtyOut,
    dependencies=[Depends(require_permissions("medical_history:update"))],
)
def update_specialty(
    spec_id: int,
    body: SpecialtyUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    spec = db.execute(
        select(Specialty).where(
            Specialty.id == spec_id, Specialty.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not spec:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(spec, key, value)
    db.flush()
    db.refresh(spec)
    return spec


@router.delete(
    "/specialties/{spec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("medical_history:delete"))],
)
def delete_specialty(
    spec_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    spec = db.execute(
        select(Specialty).where(
            Specialty.id == spec_id, Specialty.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not spec:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")
    db.delete(spec)


# ── Doctors ──────────────────────────────────────────────────────────────────


@router.get(
    "/doctors",
    response_model=list[DoctorOut],
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def list_doctors(current_user: CurrentUser, db: Session = Depends(get_db)):
    result = db.execute(
        select(Doctor).where(Doctor.user_id == current_user.id).order_by(Doctor.name)
    )
    return result.scalars().all()


@router.post(
    "/doctors",
    response_model=DoctorOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("medical_history:create"))],
)
def create_doctor(
    body: DoctorCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    doc = Doctor(user_id=current_user.id, **body.model_dump())
    db.add(doc)
    db.flush()
    db.refresh(doc)
    return doc


@router.get(
    "/doctors/{doc_id}",
    response_model=DoctorOut,
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def get_doctor(
    doc_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(Doctor).where(Doctor.id == doc_id, Doctor.user_id == current_user.id)
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return doc


@router.patch(
    "/doctors/{doc_id}",
    response_model=DoctorOut,
    dependencies=[Depends(require_permissions("medical_history:update"))],
)
def update_doctor(
    doc_id: int,
    body: DoctorUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(Doctor).where(Doctor.id == doc_id, Doctor.user_id == current_user.id)
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(doc, key, value)
    db.flush()
    db.refresh(doc)
    return doc


@router.delete(
    "/doctors/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("medical_history:delete"))],
)
def delete_doctor(
    doc_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(Doctor).where(Doctor.id == doc_id, Doctor.user_id == current_user.id)
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    db.delete(doc)


# ── Appointments ─────────────────────────────────────────────────────────────


@router.get(
    "/appointments",
    response_model=list[AppointmentOut],
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def list_appointments(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Appointment).where(Appointment.user_id == current_user.id)
    if date_from:
        query = query.where(Appointment.date_time >= date_from)
    if date_to:
        query = query.where(Appointment.date_time <= date_to)
    query = query.order_by(Appointment.date_time.asc()).offset(skip).limit(limit)
    result = db.execute(query)
    return result.scalars().all()


@router.post(
    "/appointments",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("medical_history:create"))],
)
def create_appointment(
    body: AppointmentCreate,
    current_user: CurrentUser,
    request: Request,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(Doctor).where(
            Doctor.id == body.doctor_id, Doctor.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    appt = Appointment(user_id=current_user.id, **body.model_dump())
    db.add(appt)
    db.flush()
    db.refresh(appt)

    log_activity(
        db,
        action="create_appointment",
        module="medical_history",
        type="action",
        user_id=current_user.id,
        details={"appointment_id": appt.id},
        request=request,
    )
    return appt


@router.get(
    "/appointments/{appt_id}",
    response_model=AppointmentOut,
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def get_appointment(
    appt_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    appt = db.execute(
        select(Appointment).where(
            Appointment.id == appt_id, Appointment.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    return appt


@router.patch(
    "/appointments/{appt_id}",
    response_model=AppointmentOut,
    dependencies=[Depends(require_permissions("medical_history:update"))],
)
def update_appointment(
    appt_id: int,
    body: AppointmentUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    appt = db.execute(
        select(Appointment).where(
            Appointment.id == appt_id, Appointment.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(appt, key, value)
    db.flush()
    db.refresh(appt)
    return appt


@router.delete(
    "/appointments/{appt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("medical_history:delete"))],
)
def delete_appointment(
    appt_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    appt = db.execute(
        select(Appointment).where(
            Appointment.id == appt_id, Appointment.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    db.delete(appt)


# ── Medications ──────────────────────────────────────────────────────────────


@router.get(
    "/medications",
    response_model=list[MedicationOut],
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def list_medications(current_user: CurrentUser, db: Session = Depends(get_db)):
    result = db.execute(
        select(Medication)
        .where(Medication.user_id == current_user.id)
        .order_by(Medication.generic_name)
    )
    return result.scalars().all()


@router.post(
    "/medications",
    response_model=MedicationOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("medical_history:create"))],
)
def create_medication(
    body: MedicationCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    med = Medication(user_id=current_user.id, **body.model_dump())
    db.add(med)
    db.flush()
    db.refresh(med)
    return med


@router.patch(
    "/medications/{med_id}",
    response_model=MedicationOut,
    dependencies=[Depends(require_permissions("medical_history:update"))],
)
def update_medication(
    med_id: int,
    body: MedicationUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    med = db.execute(
        select(Medication).where(
            Medication.id == med_id, Medication.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not med:
        raise HTTPException(status_code=404, detail="Medicamento no encontrado")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(med, key, value)
    db.flush()
    db.refresh(med)
    return med


@router.delete(
    "/medications/{med_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("medical_history:delete"))],
)
def delete_medication(
    med_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    med = db.execute(
        select(Medication).where(
            Medication.id == med_id, Medication.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not med:
        raise HTTPException(status_code=404, detail="Medicamento no encontrado")
    db.delete(med)


# ── Prescriptions ────────────────────────────────────────────────────────────


@router.get(
    "/prescriptions",
    response_model=list[PrescriptionOut],
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def list_prescriptions(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(Prescription)
        .where(Prescription.user_id == current_user.id)
        .options(
            selectinload(Prescription.details), selectinload(Prescription.documents)
        )
        .order_by(Prescription.issue_date.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post(
    "/prescriptions",
    response_model=PrescriptionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("medical_history:create"))],
)
def create_prescription(
    body: PrescriptionCreate,
    current_user: CurrentUser,
    request: Request,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(Doctor).where(
            Doctor.id == body.doctor_id, Doctor.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    details_data = body.details
    body_data = body.model_dump(exclude={"details"})

    rx = Prescription(user_id=current_user.id, **body_data)
    db.add(rx)
    db.flush()

    for det in details_data:
        detail = PrescriptionDetail(prescription_id=rx.id, **det.model_dump())
        db.add(detail)

    db.flush()
    db.refresh(rx, attribute_names=["details", "documents"])

    log_activity(
        db,
        action="create_prescription",
        module="medical_history",
        type="action",
        user_id=current_user.id,
        details={"prescription_id": rx.id, "items": len(details_data)},
        request=request,
    )
    return rx


@router.get(
    "/prescriptions/{rx_id}",
    response_model=PrescriptionOut,
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def get_prescription(
    rx_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    rx = db.execute(
        select(Prescription)
        .where(Prescription.id == rx_id, Prescription.user_id == current_user.id)
        .options(
            selectinload(Prescription.details), selectinload(Prescription.documents)
        )
    ).scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return rx


@router.patch(
    "/prescriptions/{rx_id}",
    response_model=PrescriptionOut,
    dependencies=[Depends(require_permissions("medical_history:update"))],
)
def update_prescription(
    rx_id: int,
    body: PrescriptionUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    rx = db.execute(
        select(Prescription)
        .where(Prescription.id == rx_id, Prescription.user_id == current_user.id)
        .options(
            selectinload(Prescription.details), selectinload(Prescription.documents)
        )
    ).scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(rx, key, value)
    db.flush()
    db.refresh(rx, attribute_names=["details", "documents"])
    return rx


@router.delete(
    "/prescriptions/{rx_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("medical_history:delete"))],
)
def delete_prescription(
    rx_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    rx = db.execute(
        select(Prescription).where(
            Prescription.id == rx_id, Prescription.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    db.delete(rx)


# ── Prescription Details ─────────────────────────────────────────────────────


@router.post(
    "/prescriptions/{rx_id}/details",
    response_model=PrescriptionDetailOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("medical_history:create"))],
)
def add_prescription_detail(
    rx_id: int,
    body: PrescriptionDetailCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    rx = db.execute(
        select(Prescription).where(
            Prescription.id == rx_id, Prescription.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    detail = PrescriptionDetail(prescription_id=rx_id, **body.model_dump())
    db.add(detail)
    db.flush()
    db.refresh(detail)
    return detail


@router.patch(
    "/prescriptions/{rx_id}/details/{det_id}",
    response_model=PrescriptionDetailOut,
    dependencies=[Depends(require_permissions("medical_history:update"))],
)
def update_prescription_detail(
    rx_id: int,
    det_id: int,
    body: PrescriptionDetailUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    detail = db.execute(
        select(PrescriptionDetail)
        .join(Prescription)
        .where(
            PrescriptionDetail.id == det_id,
            PrescriptionDetail.prescription_id == rx_id,
            Prescription.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not detail:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(detail, key, value)
    db.flush()
    db.refresh(detail)
    return detail


@router.delete(
    "/prescriptions/{rx_id}/details/{det_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("medical_history:delete"))],
)
def delete_prescription_detail(
    rx_id: int,
    det_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    detail = db.execute(
        select(PrescriptionDetail)
        .join(Prescription)
        .where(
            PrescriptionDetail.id == det_id,
            PrescriptionDetail.prescription_id == rx_id,
            Prescription.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not detail:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")
    db.delete(detail)


# ── Medical Documents ────────────────────────────────────────────────────────


@router.get(
    "/documents",
    response_model=list[MedicalDocumentOut],
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def list_documents(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    search: str | None = Query(None),
    doc_type: str | None = Query(None),
):
    query = select(MedicalDocument).where(MedicalDocument.user_id == current_user.id)
    if search:
        query = query.where(MedicalDocument.filename.ilike(f"%{search}%"))
    if doc_type:
        query = query.where(MedicalDocument.doc_type == doc_type)
    query = query.order_by(MedicalDocument.created_at.desc())
    return db.execute(query).scalars().all()


@router.post(
    "/documents/upload",
    response_model=MedicalDocumentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("medical_history:create"))],
)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = "other",
    prescription_id: int | None = None,
    appointment_id: int | None = None,
    current_user: CurrentUser = None,
    db: Session = Depends(get_db),
):
    try:
        _, file_path, file_size = await save_upload(file, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    doc = MedicalDocument(
        user_id=current_user.id,
        prescription_id=prescription_id,
        appointment_id=appointment_id,
        filename=file.filename or "document",
        file_path=file_path,
        doc_type=doc_type,
        mime_type=file.content_type,
        file_size=file_size,
    )
    db.add(doc)
    db.flush()
    db.refresh(doc)
    return doc


@router.get(
    "/documents/{doc_id}",
    response_model=MedicalDocumentOut,
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def get_document(
    doc_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(MedicalDocument).where(
            MedicalDocument.id == doc_id, MedicalDocument.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return doc


@router.get(
    "/documents/{doc_id}/download",
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def download_document(
    doc_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    from pathlib import Path
    import os

    doc = db.execute(
        select(MedicalDocument).where(
            MedicalDocument.id == doc_id, MedicalDocument.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    base_dir = Path(os.getcwd())
    file_path = (base_dir / doc.file_path).resolve()
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en disco")

    return FileResponse(
        path=str(file_path),
        filename=doc.filename,
        media_type=doc.mime_type or "application/octet-stream",
    )


@router.delete(
    "/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("medical_history:delete"))],
)
def delete_document(
    doc_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(MedicalDocument).where(
            MedicalDocument.id == doc_id, MedicalDocument.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    delete_file(doc.file_path)
    db.delete(doc)


# ── Adherence Records ────────────────────────────────────────────────────────


def _enrich_record(record: AdherenceRecord) -> dict:
    detail = record.prescription_detail
    med_name = detail.medication_name if detail else None
    if not med_name:
        med_name = record.medication_name
    return {
        "id": record.id,
        "prescription_detail_id": record.prescription_detail_id,
        "scheduled_time": record.scheduled_time,
        "taken_at": record.taken_at,
        "status": record.status,
        "notes": record.notes,
        "created_at": record.created_at,
        "medication_name": med_name,
    }


def _parse_time_str(t: str) -> tuple[int, int]:
    parts = t.strip().split(":")
    return int(parts[0]), int(parts[1]) if len(parts) > 1 else 0


def _generate_today_records(user_id: int, db: Session) -> None:
    today_start = now_mx().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)

    active_details = (
        db.execute(
            select(PrescriptionDetail)
            .join(Prescription)
            .where(
                Prescription.user_id == user_id,
                PrescriptionDetail.status == "active",
            )
        )
        .scalars()
        .all()
    )

    for detail in active_details:
        existing_count = (
            db.execute(
                select(AdherenceRecord).where(
                    AdherenceRecord.prescription_detail_id == detail.id,
                    AdherenceRecord.scheduled_time >= today_start,
                    AdherenceRecord.scheduled_time <= today_end,
                )
            )
            .scalars()
            .all()
        )

        if existing_count:
            continue

        times = detail.scheduled_times
        if times:
            scheduled_datetimes = []
            for t in times:
                h, m = _parse_time_str(t)
                scheduled_datetimes.append(today_start.replace(hour=h, minute=m))
        else:
            hours = parse_frequency_to_hours(detail.frequency)
            n = max(1, 24 // hours)
            scheduled_datetimes = []
            for i in range(n):
                scheduled = today_start + timedelta(hours=hours * i + 8)
                if scheduled <= today_end:
                    scheduled_datetimes.append(scheduled)

        for scheduled in scheduled_datetimes:
            record = AdherenceRecord(
                prescription_detail_id=detail.id,
                scheduled_time=scheduled,
                status="pending",
            )
            db.add(record)

    db.flush()


@router.get(
    "/adherence/today",
    response_model=list[AdherenceRecordOut],
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def get_today_adherence(current_user: CurrentUser, db: Session = Depends(get_db)):
    _generate_today_records(current_user.id, db)

    today_start = now_mx().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)

    rx_records = (
        db.execute(
            select(AdherenceRecord)
            .join(PrescriptionDetail)
            .join(Prescription)
            .where(
                Prescription.user_id == current_user.id,
                PrescriptionDetail.status == "active",
                AdherenceRecord.scheduled_time >= today_start,
                AdherenceRecord.scheduled_time <= today_end,
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
                AdherenceRecord.scheduled_time >= today_start,
                AdherenceRecord.scheduled_time <= today_end,
            )
        )
        .scalars()
        .all()
    )

    all_records = sorted(
        list(rx_records) + list(standalone_records),
        key=lambda r: r.scheduled_time,
    )
    return [_enrich_record(r) for r in all_records]


@router.get(
    "/adherence/history",
    response_model=list[AdherenceRecordOut],
    dependencies=[Depends(require_permissions("medical_history:read"))],
)
def get_adherence_history(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    _generate_today_records(current_user.id, db)

    rx_records = (
        db.execute(
            select(AdherenceRecord)
            .join(PrescriptionDetail)
            .join(Prescription)
            .where(Prescription.user_id == current_user.id)
            .order_by(AdherenceRecord.scheduled_time.desc())
            .offset(skip)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    standalone_records = (
        db.execute(
            select(AdherenceRecord)
            .where(
                AdherenceRecord.user_id == current_user.id,
                AdherenceRecord.prescription_detail_id.is_(None),
            )
            .order_by(AdherenceRecord.scheduled_time.desc())
            .offset(skip)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    all_records = sorted(
        list(rx_records) + list(standalone_records),
        key=lambda r: r.scheduled_time,
        reverse=True,
    )
    return [_enrich_record(r) for r in all_records[:limit]]


@router.post(
    "/adherence",
    response_model=AdherenceRecordOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("medical_history:create"))],
)
def create_adherence_record(
    body: AdherenceRecordCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    if body.prescription_detail_id:
        detail = db.execute(
            select(PrescriptionDetail)
            .join(Prescription)
            .where(
                PrescriptionDetail.id == body.prescription_detail_id,
                Prescription.user_id == current_user.id,
            )
        ).scalar_one_or_none()
        if not detail:
            raise HTTPException(
                status_code=404, detail="Detalle de receta no encontrado"
            )
        record = AdherenceRecord(
            prescription_detail_id=body.prescription_detail_id,
            scheduled_time=body.scheduled_time,
            notes=body.notes,
        )
    else:
        record = AdherenceRecord(
            user_id=current_user.id,
            medication_name=body.medication_name,
            scheduled_time=body.scheduled_time,
            notes=body.notes,
            status="pending",
        )

    db.add(record)
    db.flush()
    db.refresh(record)
    return _enrich_record(record)


@router.patch(
    "/adherence/{record_id}",
    response_model=AdherenceRecordOut,
    dependencies=[Depends(require_permissions("medical_history:update"))],
)
def update_adherence_record(
    record_id: int,
    body: AdherenceRecordUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    record = db.execute(
        select(AdherenceRecord)
        .outerjoin(
            PrescriptionDetail,
            AdherenceRecord.prescription_detail_id == PrescriptionDetail.id,
        )
        .outerjoin(Prescription, PrescriptionDetail.prescription_id == Prescription.id)
        .where(
            AdherenceRecord.id == record_id,
            (Prescription.user_id == current_user.id)
            | (AdherenceRecord.user_id == current_user.id),
        )
    ).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    changes = body.model_dump(exclude_unset=True)
    if "status" in changes:
        record.status = changes.pop("status")
        record.taken_at = now_mx().isoformat()
    if "notes" in changes:
        record.notes = changes.pop("notes")
    if "scheduled_time" in changes:
        record.scheduled_time = changes.pop("scheduled_time")

    db.flush()
    db.refresh(record)
    return _enrich_record(record)
