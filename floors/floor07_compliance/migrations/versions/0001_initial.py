"""Initial migration creating all floor07 tables.

Revision ID: 0001_initial
Revises: 
Create Date: 2026-07-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Table: audit_logs ──
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('entity_id', sa.String(length=512), nullable=False),
        sa.Column('entity_type', sa.String(length=64), nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('actor', sa.String(length=128), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_entity_id'), 'audit_logs', ['entity_id'], unique=False)

    # ── Table: certificates ──
    op.create_table(
        'certificates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('artifact_id', sa.String(length=512), nullable=False),
        sa.Column('pipeline_run_id', sa.UUID(), nullable=False),
        sa.Column('guardian_version', sa.String(length=32), nullable=False),
        sa.Column('fact_confidence', sa.Float(), nullable=False),
        sa.Column('policy_violations_count', sa.Integer(), nullable=False),
        sa.Column('risk_score', sa.Float(), nullable=False),
        sa.Column('risk_rating', sa.String(length=16), nullable=False),
        sa.Column('publishing_decision', sa.String(length=32), nullable=False),
        sa.Column('certification_status', sa.String(length=32), nullable=False),
        sa.Column('payload_hash', sa.String(length=64), nullable=False),
        sa.Column('signature', sa.String(length=64), nullable=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_certificates_artifact_id'), 'certificates', ['artifact_id'], unique=False)
    op.create_index(op.f('ix_certificates_pipeline_run_id'), 'certificates', ['pipeline_run_id'], unique=False)

    # ── Table: policies ──
    op.create_table(
        'policies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('platform', sa.String(length=64), nullable=False),
        sa.Column('version', sa.String(length=32), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('rules', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_policies_platform'), 'policies', ['platform'], unique=False)

    # ── Table: validation_runs ──
    op.create_table(
        'validation_runs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('artifact_id', sa.String(length=512), nullable=False),
        sa.Column('platform', sa.String(length=64), nullable=False),
        sa.Column('language', sa.String(length=16), nullable=False),
        sa.Column('content_type', sa.String(length=64), nullable=False),
        sa.Column('pipeline_version', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('fact_result', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('policy_result', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('risk_result', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('certificate_id', sa.UUID(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_validation_runs_artifact_id'), 'validation_runs', ['artifact_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_validation_runs_artifact_id'), table_name='validation_runs')
    op.drop_table('validation_runs')
    op.drop_index(op.f('ix_policies_platform'), table_name='policies')
    op.drop_table('policies')
    op.drop_index(op.f('ix_certificates_pipeline_run_id'), table_name='certificates')
    op.drop_index(op.f('ix_certificates_artifact_id'), table_name='certificates')
    op.drop_table('certificates')
    op.drop_index(op.f('ix_audit_logs_entity_id'), table_name='audit_logs')
    op.drop_table('audit_logs')
