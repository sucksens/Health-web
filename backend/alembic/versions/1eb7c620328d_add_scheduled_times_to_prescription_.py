"""add_scheduled_times_to_prescription_details

Revision ID: 1eb7c620328d
Revises: 0004
Create Date: 2026-05-08 19:10:06.366180

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1eb7c620328d"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "prescription_details", sa.Column("scheduled_times", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("prescription_details", "scheduled_times")
