"""Add posting permissions and expert applications

Revision ID: 20260428_0010
Revises: 20260418_0009
Create Date: 2026-04-28 13:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260428_0010"
down_revision = "20260418_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("can_create_posts", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(
        "users",
        sa.Column("expert_application_status", sa.String(length=32), nullable=False, server_default="none"),
    )
    op.create_index(op.f("ix_users_expert_application_status"), "users", ["expert_application_status"], unique=False)

    op.create_table(
        "expert_applications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("headline", sa.String(length=160), nullable=False),
        sa.Column("about", sa.Text(), nullable=False),
        sa.Column("credentials", sa.Text(), nullable=False),
        sa.Column("years_experience", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_user_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_expert_applications_created_at"), "expert_applications", ["created_at"], unique=False)
    op.create_index(op.f("ix_expert_applications_status"), "expert_applications", ["status"], unique=False)
    op.create_index(op.f("ix_expert_applications_user_id"), "expert_applications", ["user_id"], unique=False)

    op.execute("UPDATE users SET can_create_posts = 1 WHERE role IN ('admin', 'developer', 'expert')")
    op.execute("UPDATE users SET expert_application_status = 'approved' WHERE role IN ('admin', 'developer', 'expert')")


def downgrade() -> None:
    op.drop_index(op.f("ix_expert_applications_user_id"), table_name="expert_applications")
    op.drop_index(op.f("ix_expert_applications_status"), table_name="expert_applications")
    op.drop_index(op.f("ix_expert_applications_created_at"), table_name="expert_applications")
    op.drop_table("expert_applications")

    op.drop_index(op.f("ix_users_expert_application_status"), table_name="users")
    op.drop_column("users", "expert_application_status")
    op.drop_column("users", "can_create_posts")
