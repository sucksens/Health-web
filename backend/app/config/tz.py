from datetime import datetime, timezone, timedelta

MEXICO_OFFSET = timedelta(hours=-6)
MEXICO_TZ = timezone(MEXICO_OFFSET)


def now_mx() -> datetime:
    return datetime.now(MEXICO_TZ)
