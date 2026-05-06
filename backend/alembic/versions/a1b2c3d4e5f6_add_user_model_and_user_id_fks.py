"""add_user_model_and_user_id_fks

Revision ID: a1b2c3d4e5f6
Revises: 0e1776769b56
Create Date: 2026-05-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '0e1776769b56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('x_user_id', sa.String(), nullable=False),
        sa.Column('x_handle', sa.String(), nullable=False),
        sa.Column('access_token', sa.Text(), nullable=False),
        sa.Column('refresh_token', sa.Text(), nullable=False),
        sa.Column('token_expires_at', sa.DateTime(), nullable=False),
        sa.Column('voice_profile', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('x_user_id'),
    )

    op.add_column('posts', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_posts_user_id', 'posts', 'users', ['user_id'], ['id'])

    op.add_column('drafts', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_drafts_user_id', 'drafts', 'users', ['user_id'], ['id'])

    op.add_column('sent_replies', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_sent_replies_user_id', 'sent_replies', 'users', ['user_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_sent_replies_user_id', 'sent_replies', type_='foreignkey')
    op.drop_column('sent_replies', 'user_id')

    op.drop_constraint('fk_drafts_user_id', 'drafts', type_='foreignkey')
    op.drop_column('drafts', 'user_id')

    op.drop_constraint('fk_posts_user_id', 'posts', type_='foreignkey')
    op.drop_column('posts', 'user_id')

    op.drop_table('users')
