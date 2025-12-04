"""increase ingredient name quantity length

Revision ID: increase_ingredient_length
Revises: add_more_categories
Create Date: 2025-01-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'increase_ingredient_length'
down_revision: Union[str, None] = 'add_more_categories'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Increase name column from VARCHAR(100) to VARCHAR(255)
    op.alter_column('recipe_ingredients', 'name',
                    existing_type=sa.String(length=100),
                    type_=sa.String(length=255),
                    existing_nullable=False)
    
    # Increase quantity column from VARCHAR(50) to VARCHAR(255)
    op.alter_column('recipe_ingredients', 'quantity',
                    existing_type=sa.String(length=50),
                    type_=sa.String(length=255),
                    existing_nullable=False)


def downgrade() -> None:
    # Revert name column back to VARCHAR(100)
    op.alter_column('recipe_ingredients', 'name',
                    existing_type=sa.String(length=255),
                    type_=sa.String(length=100),
                    existing_nullable=False)
    
    # Revert quantity column back to VARCHAR(50)
    op.alter_column('recipe_ingredients', 'quantity',
                    existing_type=sa.String(length=255),
                    type_=sa.String(length=50),
                    existing_nullable=False)

