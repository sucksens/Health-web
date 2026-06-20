from dataclasses import dataclass
from datetime import datetime

_ISO_FORMATS = (
    "%Y-%m-%dT%H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
)


@dataclass(frozen=True)
class DateRange:
    start: datetime | None = None
    end: datetime | None = None


def parse_datetime(value: str | datetime) -> datetime:
    """Parsea una fecha ISO-8601 (o la devuelve si ya es ``datetime``)."""
    if isinstance(value, datetime):
        return value
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1]
    for fmt in _ISO_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    raise ValueError(f"Formato de fecha invalido: {value!r}")


def parse_date_range(
    date_from: str | datetime | None = None,
    date_to: str | datetime | None = None,
) -> DateRange:
    """Construye un ``DateRange`` validando que inicio <= fin."""
    start = parse_datetime(date_from) if date_from else None
    end = parse_datetime(date_to) if date_to else None
    if start is not None and end is not None and start > end:
        raise ValueError("date_from no puede ser mayor que date_to")
    return DateRange(start=start, end=end)
