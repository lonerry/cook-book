"""add FTS indexes for recipes

Revision ID: fts_20250819
Revises: 20250818_add_recipe_steps
Create Date: 2025-08-19
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "fts_20250819"
down_revision = "20250818_add_recipe_steps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure pg_trgm and FTS indexes; safe to run if they already exist
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    # GIN index over title+description
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_recipes_fts ON recipes
        USING GIN (to_tsvector('russian', coalesce(title,'') || ' ' || coalesce(description,'')));
        """
    )
    # Index for ingredients names
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_recipe_ingredients_fts ON recipe_ingredients
        USING GIN (to_tsvector('russian', coalesce(name,'')));
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_recipe_ingredients_fts")
    op.execute("DROP INDEX IF EXISTS ix_recipes_fts")
