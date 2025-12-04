"""add more recipe categories

Revision ID: add_more_categories
Revises: 20250819_add_fts_indexes
Create Date: 2025-01-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_more_categories'
down_revision: Union[str, None] = '8d060618aceb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create new enum with all categories
    op.execute("""
        CREATE TYPE topicenum_new AS ENUM (
            'breakfast', 'lunch', 'dinner', 
            'desserts', 'appetizers', 'salads', 
            'soups', 'drinks', 'baking', 
            'snacks', 'vegetarian', 'quick'
        );
    """)
    
    # Alter column to use new enum
    op.execute("""
        ALTER TABLE recipes 
        ALTER COLUMN topic TYPE topicenum_new 
        USING topic::text::topicenum_new;
    """)
    
    # Drop old enum and rename new one
    op.execute("DROP TYPE topicenum;")
    op.execute("ALTER TYPE topicenum_new RENAME TO topicenum;")


def downgrade() -> None:
    # Revert to old enum
    op.execute("""
        CREATE TYPE topicenum_old AS ENUM ('breakfast', 'lunch', 'dinner');
    """)
    
    # Update any recipes with new categories to 'dinner' (or handle as needed)
    op.execute("""
        UPDATE recipes 
        SET topic = 'dinner'::topicenum_old 
        WHERE topic::text NOT IN ('breakfast', 'lunch', 'dinner');
    """)
    
    # Alter column back
    op.execute("""
        ALTER TABLE recipes 
        ALTER COLUMN topic TYPE topicenum_old 
        USING topic::text::topicenum_old;
    """)
    
    # Drop new enum and rename old one
    op.execute("DROP TYPE topicenum;")
    op.execute("ALTER TYPE topicenum_old RENAME TO topicenum;")

