"""Initial migration - Complete schema with all ENUMs

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ENUM types FIRST (before any tables that use them)
    # Используем прямые SQL команды для надежности
    connection = op.get_bind()
    
    # ProgrammingLanguage
    connection.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE programminglanguage AS ENUM ('python', 'javascript', 'cpp');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    # Difficulty
    connection.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    # InterviewStatus
    connection.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE interviewstatus AS ENUM ('pending', 'in_progress', 'completed', 'terminated');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    # TaskType
    connection.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE tasktype AS ENUM ('algorithm', 'system_design', 'code_review', 'debugging', 'practical');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    # InterviewDirection
    connection.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE interviewdirection AS ENUM ('frontend', 'backend', 'fullstack', 'data_science', 'devops');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    # AntiCheatEventType
    connection.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE anticheateventtype AS ENUM (
                'tab_switch', 'copy_paste', 'devtools_open', 'focus_loss',
                'large_paste', 'suspicious_typing', 'code_change_timestamp',
                'large_code_change', 'external_service_request', 'ai_service_request',
                'call_service_request', 'frequent_paste', 'code_paste'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    # Admins table
    op.create_table(
        'admins',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('username', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_superadmin', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_admins_username', 'admins', ['username'])

    # Interviews table - using ENUMs correctly
    op.create_table(
        'interviews',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('candidate_name', sa.String(255), nullable=False),
        sa.Column('candidate_email', sa.String(255), nullable=False),
        sa.Column('direction', sa.String(50), nullable=False),  # String, not enum
        sa.Column('language', postgresql.ENUM('python', 'javascript', 'cpp', name='programminglanguage', create_type=False), nullable=False),
        sa.Column('task_language', sa.String(10), server_default='ru', nullable=False),
        sa.Column('difficulty', postgresql.ENUM('easy', 'medium', 'hard', name='difficulty', create_type=False), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'in_progress', 'completed', 'terminated', name='interviewstatus', create_type=False), server_default='pending', nullable=False),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('technical_score', sa.Float(), nullable=True),
        sa.Column('softskills_score', sa.Float(), nullable=True),
        sa.Column('total_tasks', sa.Integer(), server_default='5', nullable=False),
        sa.Column('tasks_completed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('hints_used', sa.Integer(), server_default='0', nullable=False),
        sa.Column('anti_cheat_flags', sa.Integer(), server_default='0', nullable=False),
        sa.Column('use_task_bank', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('strengths', sa.JSON(), nullable=True),
        sa.Column('areas_for_improvement', sa.JSON(), nullable=True),
        sa.Column('recommendation', sa.Text(), nullable=True),
        sa.Column('softskills_assessment', sa.JSON(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('finished_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_interviews_candidate_email', 'interviews', ['candidate_email'])

    # Interview tasks table - using ENUMs correctly
    op.create_table(
        'interview_tasks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('interview_id', sa.String(), nullable=False),
        sa.Column('task_number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('task_type', postgresql.ENUM('algorithm', 'system_design', 'code_review', 'debugging', 'practical', name='tasktype', create_type=False), nullable=False),
        sa.Column('difficulty', postgresql.ENUM('easy', 'medium', 'hard', name='difficulty', create_type=False), nullable=False),
        sa.Column('examples', sa.JSON(), nullable=True),
        sa.Column('constraints', sa.JSON(), nullable=True),
        sa.Column('test_cases', sa.JSON(), nullable=True),
        sa.Column('starter_code', sa.JSON(), nullable=True),
        sa.Column('submitted_code', sa.Text(), nullable=True),
        sa.Column('submission_language', postgresql.ENUM('python', 'javascript', 'cpp', name='programminglanguage', create_type=False), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('code_quality', sa.Float(), nullable=True),
        sa.Column('efficiency', sa.Float(), nullable=True),
        sa.Column('correctness', sa.Float(), nullable=True),
        sa.Column('execution_result', sa.JSON(), nullable=True),
        sa.Column('hints_used', sa.Integer(), server_default='0', nullable=False),
        sa.Column('time_spent_seconds', sa.Integer(), nullable=True),
        sa.Column('submission_attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('test_runs', sa.Integer(), server_default='0', nullable=False),
        sa.Column('compilation_errors', sa.Integer(), server_default='0', nullable=False),
        sa.Column('execution_errors', sa.Integer(), server_default='0', nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Chat messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('interview_id', sa.String(), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('context', sa.String(50), server_default='softskills', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Anti-cheat events table - using ENUM correctly
    op.create_table(
        'anti_cheat_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('interview_id', sa.String(), nullable=False),
        sa.Column('event_type', postgresql.ENUM('tab_switch', 'copy_paste', 'devtools_open', 'focus_loss', 'large_paste', 'suspicious_typing', 'code_change_timestamp', 'large_code_change', 'external_service_request', 'ai_service_request', 'call_service_request', 'frequent_paste', 'code_paste', name='anticheateventtype', create_type=False), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('severity', sa.String(20), server_default='low', nullable=False),
        sa.Column('typing_patterns', sa.JSON(), nullable=True),
        sa.Column('code_change_timestamps', sa.JSON(), nullable=True),
        sa.Column('code_style_analysis', sa.JSON(), nullable=True),
        sa.Column('network_activity', sa.JSON(), nullable=True),
        sa.Column('clipboard_analysis', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Anti-cheat metrics table
    op.create_table(
        'anti_cheat_metrics',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('interview_id', sa.String(), nullable=False),
        sa.Column('typing_wpm', sa.Float(), nullable=True),
        sa.Column('typing_cv', sa.Float(), nullable=True),
        sa.Column('backspace_ratio', sa.Float(), nullable=True),
        sa.Column('pause_count', sa.Integer(), nullable=True),
        sa.Column('code_changes_count', sa.Integer(), nullable=True),
        sa.Column('large_changes_count', sa.Integer(), nullable=True),
        sa.Column('average_change_size', sa.Float(), nullable=True),
        sa.Column('style_consistency_score', sa.Float(), nullable=True),
        sa.Column('is_too_perfect', sa.Boolean(), nullable=True),
        sa.Column('style_change_detected', sa.Boolean(), nullable=True),
        sa.Column('external_requests_count', sa.Integer(), nullable=True),
        sa.Column('ai_service_detected', sa.Boolean(), nullable=True),
        sa.Column('call_service_detected', sa.Boolean(), nullable=True),
        sa.Column('clipboard_operations_count', sa.Integer(), nullable=True),
        sa.Column('large_clipboard_pastes', sa.Integer(), nullable=True),
        sa.Column('aggregate_score', sa.Float(), nullable=True),
        sa.Column('flags_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_anti_cheat_metrics_interview_id', 'anti_cheat_metrics', ['interview_id'])

    # Task bank table - using ENUMs correctly
    op.create_table(
        'task_bank',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('task_type', postgresql.ENUM('algorithm', 'system_design', 'code_review', 'debugging', 'practical', name='tasktype', create_type=False), nullable=False),
        sa.Column('difficulty', postgresql.ENUM('easy', 'medium', 'hard', name='difficulty', create_type=False), nullable=False),
        sa.Column('direction', postgresql.ENUM('frontend', 'backend', 'fullstack', 'data_science', 'devops', name='interviewdirection', create_type=False), nullable=False),
        sa.Column('examples', sa.JSON(), nullable=True),
        sa.Column('constraints', sa.JSON(), nullable=True),
        sa.Column('test_cases', sa.JSON(), nullable=True),
        sa.Column('starter_code', sa.JSON(), nullable=True),
        sa.Column('expected_solution', sa.Text(), nullable=True),
        sa.Column('embedding', sa.JSON(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('topic', sa.String(255), nullable=True),
        sa.Column('language', postgresql.ENUM('python', 'javascript', 'cpp', name='programminglanguage', create_type=False), nullable=True),
        sa.Column('times_used', sa.Integer(), server_default='0', nullable=False),
        sa.Column('average_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['admins.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('task_bank')
    op.drop_table('anti_cheat_metrics')
    op.drop_table('anti_cheat_events')
    op.drop_table('chat_messages')
    op.drop_table('interview_tasks')
    op.drop_table('interviews')
    op.drop_table('admins')
    
    # Drop ENUM types
    op.execute('DROP TYPE IF EXISTS anticheateventtype')
    op.execute('DROP TYPE IF EXISTS interviewdirection')
    op.execute('DROP TYPE IF EXISTS tasktype')
    op.execute('DROP TYPE IF EXISTS interviewstatus')
    op.execute('DROP TYPE IF EXISTS difficulty')
    op.execute('DROP TYPE IF EXISTS programminglanguage')
