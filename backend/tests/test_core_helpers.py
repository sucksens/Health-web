from datetime import datetime
from pathlib import Path

import pytest
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.config.paths import UPLOAD_DIR
from app.core.dates import DateRange, parse_date_range, parse_datetime
from app.core.pagination import paginate
from app.core.query_utils import (
    apply_date_range,
    apply_partial_update,
    get_owned_or_404,
)
from app.models.blood_pressure import BloodPressure
from app.models.user import User


def _admin(db):
    return db.execute(select(User).where(User.username == "admin")).scalar_one()


def _add_readings(db, user_id, days):
    for day in days:
        db.add(
            BloodPressure(
                user_id=user_id,
                systolic=120,
                diastolic=80,
                recorded_at=datetime(2025, 1, day),
            )
        )
    db.flush()


class TestDates:
    def test_parse_datetime_passthrough(self):
        dt = datetime(2025, 6, 1, 12, 0, 0)
        assert parse_datetime(dt) is dt

    @pytest.mark.parametrize(
        "s",
        [
            "2025-06-01",
            "2025-06-01 12:30:00",
            "2025-06-01T12:30:00",
            "2025-06-01T12:30:00.123456",
            "2025-06-01T12:30:00Z",
        ],
    )
    def test_parse_datetime_formats(self, s):
        assert parse_datetime(s).year == 2025

    def test_parse_datetime_invalid(self):
        with pytest.raises(ValueError):
            parse_datetime("not-a-date")

    def test_parse_date_range_both(self):
        dr = parse_date_range("2025-01-01", "2025-12-31")
        assert dr.start.year == 2025 and dr.end.month == 12

    def test_parse_date_range_none(self):
        assert parse_date_range() == DateRange(None, None)

    def test_parse_date_range_invalid_order(self):
        with pytest.raises(ValueError):
            parse_date_range("2025-12-31", "2025-01-01")


class TestPaginate:
    def test_paginate_total_and_limit(self, db):
        admin = _admin(db)
        _add_readings(db, admin.id, range(1, 6))
        q = select(BloodPressure).where(BloodPressure.user_id == admin.id)
        items, total = paginate(db, q, skip=0, limit=2)
        assert total == 5
        assert len(items) == 2

    def test_paginate_skip(self, db):
        admin = _admin(db)
        _add_readings(db, admin.id, range(1, 5))
        q = (
            select(BloodPressure)
            .where(BloodPressure.user_id == admin.id)
            .order_by(BloodPressure.recorded_at)
        )
        items, total = paginate(db, q, skip=2, limit=10)
        assert total == 4
        assert len(items) == 2


class TestQueryUtils:
    def test_get_owned_or_404_found(self, db):
        admin = _admin(db)
        bp = BloodPressure(
            user_id=admin.id,
            systolic=120,
            diastolic=80,
            recorded_at=datetime(2025, 1, 1),
        )
        db.add(bp)
        db.flush()
        found = get_owned_or_404(db, BloodPressure, bp.id, admin.id)
        assert found.id == bp.id

    def test_get_owned_or_404_wrong_user(self, db):
        admin = _admin(db)
        bp = BloodPressure(
            user_id=admin.id,
            systolic=120,
            diastolic=80,
            recorded_at=datetime(2025, 1, 1),
        )
        db.add(bp)
        db.flush()
        with pytest.raises(HTTPException) as exc:
            get_owned_or_404(db, BloodPressure, bp.id, 999999)
        assert exc.value.status_code == 404

    def test_get_owned_or_404_missing(self, db):
        admin = _admin(db)
        with pytest.raises(HTTPException) as exc:
            get_owned_or_404(db, BloodPressure, 888888, admin.id)
        assert exc.value.status_code == 404

    def test_apply_partial_update_only_set_fields(self):
        class Update(BaseModel):
            a: int | None = None
            b: int | None = None

        class Obj:
            def __init__(self):
                self.a = 1
                self.b = 2

        obj = Obj()
        apply_partial_update(obj, Update(a=10))
        assert obj.a == 10 and obj.b == 2

    def test_apply_date_range_filters(self, db):
        admin = _admin(db)
        _add_readings(db, admin.id, [1, 15, 28])
        q = select(BloodPressure).where(BloodPressure.user_id == admin.id)
        filtered = apply_date_range(
            q, BloodPressure.recorded_at, datetime(2025, 1, 10), datetime(2025, 1, 20)
        )
        items = db.execute(filtered).scalars().all()
        assert len(items) == 1

    def test_apply_date_range_none_returns_same_query(self):
        q = select(BloodPressure)
        assert apply_date_range(q, BloodPressure.recorded_at, None, None) is q


class TestPaths:
    def test_upload_dir_is_path_with_default(self):
        assert isinstance(UPLOAD_DIR, Path)
        assert UPLOAD_DIR.name == "uploads"
