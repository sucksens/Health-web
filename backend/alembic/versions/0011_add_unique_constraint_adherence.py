"""add_unique_constraint_adherence_records

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-06

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_adherence_prescription_time",
        "adherence_records",
        ["prescription_detail_id", "scheduled_time"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_adherence_prescription_time",
        "adherence_records",
        type_="unique",
    )