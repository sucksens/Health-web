"""fix_taken_at_column_size

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-05

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "adherence_records",
        "taken_at",
        existing_type=sa.String(30),
        type_=sa.String(50),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "adherence_records",
        "taken_at",
        existing_type=sa.String(50),
        type_=sa.String(30),
        existing_nullable=True,
    )
