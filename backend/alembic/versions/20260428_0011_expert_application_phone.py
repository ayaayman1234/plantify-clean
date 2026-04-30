"""Add phone number to expert applications

Revision ID: 20260428_0011
Revises: 20260428_0010
Create Date: 2026-04-28 15:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260428_0011"
down_revision = "20260428_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "expert_applications",
        sa.Column("phone_number", sa.String(length=32), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("expert_applications", "phone_number")
