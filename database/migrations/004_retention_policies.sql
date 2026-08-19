-- Migration 004: Retention Policies & Audit Log Compatibility

CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline TEXT NOT NULL UNIQUE CHECK (pipeline IN ('jobs','applications','resumes','referrals','emails')),
    enabled BOOLEAN NOT NULL DEFAULT false,
    retention_days INT NOT NULL DEFAULT 10,
    status_filter TEXT[] DEFAULT NULL,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    last_run_deleted_count INT DEFAULT 0,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Seed one disabled row per pipeline so the UI always has something to render/edit
INSERT INTO retention_policies (pipeline, enabled, retention_days) VALUES
    ('jobs', false, 10),
    ('applications', false, 10),
    ('resumes', false, 10),
    ('referrals', false, 10),
    ('emails', false, 10)
ON CONFLICT (pipeline) DO NOTHING;

-- Alter audit_logs.entity_id to TEXT to support string-based entity IDs
ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE TEXT;
