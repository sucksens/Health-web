"""doctor_specialties_m2m

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-04

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = inspector.get_table_names()

    if "doctor_specialties" not in existing:
        op.create_table(
            "doctor_specialties",
            sa.Column("doctor_id", sa.Integer(), nullable=False),
            sa.Column("specialty_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["specialty_id"], ["specialties.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("doctor_id", "specialty_id"),
        )
        op.execute(
            """
            INSERT INTO doctor_specialties (doctor_id, specialty_id)
            SELECT id, specialty_id FROM doctors WHERE specialty_id IS NOT NULL
            """
        )

    cols = [c["name"] for c in inspector.get_columns("doctors")]
    if "specialty_id" in cols:
        fks = inspector.get_foreign_keys("doctors")
        for fk in fks:
            if "specialty_id" in fk.get("constrained_columns", []):
                op.drop_constraint(fk["name"], "doctors", type_="foreignkey")
        op.drop_column("doctors", "specialty_id")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    cols = [c["name"] for c in inspector.get_columns("doctors")]
    if "specialty_id" not in cols:
        op.add_column(
            "doctors",
            sa.Column("specialty_id", sa.Integer(), nullable=True),
        )
        op.execute(
            """
            UPDATE doctors d
            INNER JOIN doctor_specialties ds ON d.id = ds.doctor_id
            SET d.specialty_id = ds.specialty_id
            """
        )
        op.create_foreign_key(
            "fk_doctors_specialty_id",
            "doctors",
            "specialties",
            ["specialty_id"],
            ["id"],
            ondelete="SET NULL",
        )

    existing = inspector.get_table_names()
    if "doctor_specialties" in existing:
        op.drop_table("doctor_specialties")
