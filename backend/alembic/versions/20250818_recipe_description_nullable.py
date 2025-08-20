import sqlalchemy as sa

from alembic import op

# Keep revision id <= 32 chars to fit alembic_version.version_num
revision = "a1d9d5e8c1ab"
down_revision = "20250818_add_recipe_steps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("recipes", "description", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("recipes", "description", existing_type=sa.Text(), nullable=False)
