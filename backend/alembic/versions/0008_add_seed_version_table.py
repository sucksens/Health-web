"""add_seed_version_table

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-20

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "seed_version",
        sa.Column("version", sa.String(20), nullable=False, primary_key=True),
        sa.Column("applied_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("seed_version")
