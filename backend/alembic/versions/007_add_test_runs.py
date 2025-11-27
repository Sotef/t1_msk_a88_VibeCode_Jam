"""Add test_runs - Already in 001

Revision ID: 007
Revises: 006
Create Date: 2024-01-07 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Column already added in 001
    pass


def downgrade() -> None:
    pass
