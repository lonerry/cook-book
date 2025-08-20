import sqlalchemy as sa

from alembic import op

revision = "20250818_add_recipe_steps"
down_revision = "20250818_add_comments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recipe_steps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "recipe_id",
            sa.Integer(),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("photo_path", sa.String(length=255), nullable=True),
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_recipe_steps_recipe_id ON recipe_steps (recipe_id)"
    )


def downgrade() -> None:
    op.drop_table("recipe_steps")
