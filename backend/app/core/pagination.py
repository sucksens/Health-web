from collections.abc import Sequence
from dataclasses import dataclass

from fastapi import Query
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


@dataclass
class PaginationParams:
    skip: int = Query(0, ge=0, description="Numero de registros a omitir")
    limit: int = Query(
        DEFAULT_LIMIT, ge=1, le=MAX_LIMIT, description="Maximo de registros a retornar"
    )


def paginate(
    db: Session,
    query: Select,
    *,
    skip: int = 0,
    limit: int = DEFAULT_LIMIT,
) -> tuple[Sequence, int]:
    """Aplica offset/limit a ``query`` y cuenta el total sin paginar.

    ``query`` no debe llevar ``offset``/``limit`` aplicados previamente.
    Retorna ``(items, total)``.
    """
    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    result = db.execute(query.offset(skip).limit(limit))
    return result.scalars().all(), total
