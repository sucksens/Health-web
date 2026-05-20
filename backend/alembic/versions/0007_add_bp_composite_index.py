"""add_bp_composite_index

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-20

"""

from typing import Sequence, Union

from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_bp_user_recorded",
        "blood_pressure_readings",
        ["user_id", "recorded_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_bp_user_recorded", table_name="blood_pressure_readings")
