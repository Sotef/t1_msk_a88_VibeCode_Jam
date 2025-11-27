"""Add anti_cheat_metrics - Already in 001

Revision ID: 003
Revises: 002
Create Date: 2024-01-03 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # All columns and tables already added in 001
    pass


def downgrade() -> None:
    pass
