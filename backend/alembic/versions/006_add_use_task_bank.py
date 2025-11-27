"""Add use_task_bank - Already in 001

Revision ID: 006
Revises: 005
Create Date: 2024-01-06 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Column already added in 001
    pass


def downgrade() -> None:
    pass
