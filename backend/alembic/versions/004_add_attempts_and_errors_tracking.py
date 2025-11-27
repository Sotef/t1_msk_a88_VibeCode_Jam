"""Add attempts and errors tracking - Already in 001

Revision ID: 004
Revises: 003
Create Date: 2024-01-04 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # All columns already added in 001
    pass


def downgrade() -> None:
    pass
