from datetime import datetime

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Select, select
from sqlalchemy.orm import Session


def get_owned_or_404(
    db: Session,
    model: type,
    obj_id: int,
    user_id: int,
    *,
    detail: str = "Registro no encontrado",
):
    """Busca ``model`` por ``id`` perteneciente a ``user_id`` o levanta 404."""
    obj = db.execute(
        select(model).where(model.id == obj_id, model.user_id == user_id)
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return obj


def apply_partial_update(obj: object, schema: BaseModel) -> object:
    """Aplica solo los campos provistos en ``schema`` (exclude_unset=True)."""
    changes = schema.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(obj, key, value)
    return obj


def apply_date_range(
    query: Select,
    column,
    date_from: datetime | str | None = None,
    date_to: datetime | str | None = None,
) -> Select:
    """Encadena filtros ``column >= date_from`` y ``column <= date_to``."""
    if date_from is not None:
        query = query.where(column >= date_from)
    if date_to is not None:
        query = query.where(column <= date_to)
    return query
