"""Add user reports

Revision ID: 20260428_0014
Revises: 20260428_0013
Create Date: 2026-04-28 20:15:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260428_0014"
down_revision = "20260428_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("reporter_user_id", sa.String(length=36), nullable=False),
        sa.Column("target_user_id", sa.String(length=36), nullable=False),
        sa.Column("post_id", sa.String(length=36), nullable=True),
        sa.Column("report_type", sa.String(length=20), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("reviewed_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["scan_history.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_reports_created_at"), "user_reports", ["created_at"], unique=False)
    op.create_index(op.f("ix_user_reports_post_id"), "user_reports", ["post_id"], unique=False)
    op.create_index(op.f("ix_user_reports_report_type"), "user_reports", ["report_type"], unique=False)
    op.create_index(op.f("ix_user_reports_reporter_user_id"), "user_reports", ["reporter_user_id"], unique=False)
    op.create_index(op.f("ix_user_reports_status"), "user_reports", ["status"], unique=False)
    op.create_index(op.f("ix_user_reports_target_user_id"), "user_reports", ["target_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_reports_target_user_id"), table_name="user_reports")
    op.drop_index(op.f("ix_user_reports_status"), table_name="user_reports")
    op.drop_index(op.f("ix_user_reports_reporter_user_id"), table_name="user_reports")
    op.drop_index(op.f("ix_user_reports_report_type"), table_name="user_reports")
    op.drop_index(op.f("ix_user_reports_post_id"), table_name="user_reports")
    op.drop_index(op.f("ix_user_reports_created_at"), table_name="user_reports")
    op.drop_table("user_reports")
