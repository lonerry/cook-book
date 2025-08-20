"""merge heads

Revision ID: 8d060618aceb
Revises: a1d9d5e8c1ab, fts_20250819
Create Date: 2025-08-19 21:30:42.875999

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "8d060618aceb"
down_revision: Union[str, None] = ("a1d9d5e8c1ab", "fts_20250819")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
