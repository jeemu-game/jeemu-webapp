"""Initial schema for subscribers, telemetry_events, posts, and settings.

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'subscribers',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('name', sa.String(), server_default='Backer'),
        sa.Column('referral_code', sa.String(), nullable=False, unique=True),
        sa.Column('referred_by', sa.String(), nullable=True),
        sa.Column('timestamp', sa.BigInteger(), nullable=False),
        sa.Column('is_vip', sa.Boolean(), server_default='false'),
        sa.Column('deposit_amount', sa.Numeric(10, 2), server_default='0.00'),
        sa.Column('friends_referred', sa.BigInteger(), server_default='0'),
        sa.Column('stripe_charge_id', sa.String(), nullable=True),
        sa.Column('stripe_session_id', sa.String(), nullable=True),
        sa.Column('vip_timestamp', sa.BigInteger(), nullable=True),
        sa.Column('unsubscribed', sa.Boolean(), server_default='false'),
        sa.Column('unsubscribed_at', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_subscribers_email', 'subscribers', ['email'])
    op.create_index('idx_subscribers_referral_code', 'subscribers', ['referral_code'])
    op.create_index('idx_subscribers_referred_by', 'subscribers', ['referred_by'])

    op.create_table(
        'telemetry_events',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('timestamp', sa.BigInteger(), nullable=False),
        sa.Column('iso_time', sa.String(), nullable=True),
        sa.Column('visitor_id', sa.String(), nullable=True),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('utm', sa.JSON(), server_default='{}'),
        sa.Column('dwell_seconds', sa.Integer(), server_default='0'),
        sa.Column('data', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_telemetry_type', 'telemetry_events', ['type'])
    op.create_index('idx_telemetry_timestamp', 'telemetry_events', ['timestamp'])
    op.create_index('idx_telemetry_visitor_id', 'telemetry_events', ['visitor_id'])

    op.create_table(
        'posts',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('author', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('author_initials', sa.String(), nullable=True),
        sa.Column('date', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('content', sa.String(), nullable=True),
        sa.Column('image', sa.String(), nullable=True),
        sa.Column('likes', sa.Integer(), server_default='0'),
        sa.Column('comments', sa.Integer(), server_default='0'),
        sa.Column('tag', sa.String(), nullable=True),
        sa.Column('reactions', sa.JSON(), server_default='{"rip": 0, "chaos": 0, "sip": 0}'),
        sa.Column('milestone', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('badge', sa.String(), nullable=True),
        sa.Column('timestamp', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_posts_category', 'posts', ['category'])


def downgrade() -> None:
    op.drop_table('posts')
    op.drop_table('telemetry_events')
    op.drop_table('subscribers')
