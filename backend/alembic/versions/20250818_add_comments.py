import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20250818_add_comments"
down_revision = "3f171e02a761"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "recipe_id",
            sa.Integer(),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.String(length=1000), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_comments_recipe_id ON comments (recipe_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_comments_author_id ON comments (author_id)"
    )


def downgrade() -> None:
    op.drop_index("ix_comments_author_id", table_name="comments")
    op.drop_index("ix_comments_recipe_id", table_name="comments")
    op.drop_table("comments")
