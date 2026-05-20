"""standalone_adherence_records

Revision ID: 0005_standalone
Revises: 1eb7c620328d
Create Date: 2026-05-19

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_standalone"
down_revision: Union[str, None] = "1eb7c620328d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("adherence_records") as batch_op:
        batch_op.alter_column(
            "prescription_detail_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.add_column(
            sa.Column("user_id", sa.Integer(), nullable=True),
        )
        batch_op.create_foreign_key(
            "fk_adherence_records_user_id",
            "users",
            ["user_id"],
            ["id"],
        )
        batch_op.add_column(
            sa.Column("medication_name", sa.String(200), nullable=True),
        )


def downgrade() -> None:
    with op.batch_alter_table("adherence_records") as batch_op:
        batch_op.drop_column("medication_name")
        batch_op.drop_constraint("fk_adherence_records_user_id", type_="foreignkey")
        batch_op.drop_column("user_id")
        batch_op.alter_column(
            "prescription_detail_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
