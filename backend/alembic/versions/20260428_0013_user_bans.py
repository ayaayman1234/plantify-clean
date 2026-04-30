"""Add user ban fields

Revision ID: 20260428_0013
Revises: 20260428_0012
Create Date: 2026-04-28 18:25:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260428_0013"
down_revision = "20260428_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_banned", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("banned_reason", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("banned_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_users_is_banned"), "users", ["is_banned"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_is_banned"), table_name="users")
    op.drop_column("users", "banned_at")
    op.drop_column("users", "banned_reason")
    op.drop_column("users", "is_banned")
