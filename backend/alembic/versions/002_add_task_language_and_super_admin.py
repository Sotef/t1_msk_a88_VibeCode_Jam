"""Add task_language and super_admin - Already in 001

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # All columns already added in 001
    pass


def downgrade() -> None:
    pass
