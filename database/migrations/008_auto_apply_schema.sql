-- ============================================================================
-- 008_AUTO_APPLY_SCHEMA.SQL
-- AI-Powered Multi-Job Auto-Apply Database Schema
-- ============================================================================
-- Author: AI Solution Architect
-- Date: 2026-08-25
-- Purpose: Add tables for Playwright automation, LLM field mapping cache,
--          batch application processing, and screenshot audit trail
-- ============================================================================

-- 1. APPLICATION BATCHES
-- Tracks bulk application batches for progress monitoring and orchestration
CREATE TABLE IF NOT EXISTS application_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profile(id) ON DELETE SET NULL,
    job_ids UUID[] NOT NULL,
    total_count INT NOT NULL,
    completed_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    needs_review_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'QUEUED' NOT NULL,
    -- Status values: 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
    initiated_by VARCHAR(50) DEFAULT 'MANUAL_ADMIN' NOT NULL,
    -- 'MANUAL_ADMIN', 'AUTOMATED_SCHEDULE', 'API_TRIGGER'
    resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
    rate_limit_seconds INT DEFAULT 30,
    -- Delay between applications to avoid portal bans
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Store additional context: trigger source, user notes, configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_batches_status ON application_batches(status);
CREATE INDEX idx_batches_user ON application_batches(user_profile_id);
CREATE INDEX idx_batches_created ON application_batches(created_at DESC);

COMMENT ON TABLE application_batches IS 'Tracks bulk application batches for multi-job auto-apply orchestration';
COMMENT ON COLUMN application_batches.job_ids IS 'Array of job UUIDs included in this batch';
COMMENT ON COLUMN application_batches.rate_limit_seconds IS 'Delay between applications to avoid portal bans';

-- 2. PORTAL FORM MAPPINGS
-- Persistent cache for LLM-generated form field mappings per portal
CREATE TABLE IF NOT EXISTS portal_form_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_identifier VARCHAR(255) NOT NULL UNIQUE,
    -- Format: "portal_type:company" e.g., "greenhouse:acme-corp", "lever:startup-xyz"
    portal_type VARCHAR(50) NOT NULL,
    -- 'greenhouse', 'lever', 'workday', 'ashby', 'recruitee', 'custom'
    base_url TEXT,
    -- Base URL pattern for this portal
    form_structure_hash VARCHAR(64) NOT NULL,
    -- SHA256 hash of form HTML to detect portal UI changes
    field_mappings JSONB NOT NULL,
    -- JSON mapping: { "full_name": "input#applicant-name", "email": "input#email", ... }
    validation_status VARCHAR(50) DEFAULT 'UNVALIDATED' NOT NULL,
    -- 'UNVALIDATED' (new), 'HUMAN_REVIEWED' (first-time check), 'VALIDATED' (proven), 'DEPRECATED' (form changed)
    success_count INT DEFAULT 0,
    -- Number of successful applications using this mapping
    failure_count INT DEFAULT 0,
    -- Number of failed applications (triggers re-validation if high)
    llm_model_used VARCHAR(100),
    -- Track which LLM version generated this mapping
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    last_failed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT chk_validation_status CHECK (
        validation_status IN ('UNVALIDATED', 'HUMAN_REVIEWED', 'VALIDATED', 'DEPRECATED')
    )
);

CREATE INDEX idx_portal_mappings_identifier ON portal_form_mappings(portal_identifier);
CREATE INDEX idx_portal_mappings_type ON portal_form_mappings(portal_type);
CREATE INDEX idx_portal_mappings_validation ON portal_form_mappings(validation_status);
CREATE INDEX idx_portal_mappings_success ON portal_form_mappings(success_count DESC);

COMMENT ON TABLE portal_form_mappings IS 'LLM-generated field mappings cache per job portal to avoid repeated analysis';
COMMENT ON COLUMN portal_form_mappings.portal_identifier IS 'Unique identifier: portal_type:company (e.g., greenhouse:acme-corp)';
COMMENT ON COLUMN portal_form_mappings.form_structure_hash IS 'SHA256 hash of form HTML to detect UI changes';
COMMENT ON COLUMN portal_form_mappings.validation_status IS 'Mapping validation state: UNVALIDATED → HUMAN_REVIEWED → VALIDATED';

-- 3. AUTOMATION SCREENSHOTS
-- Stores screenshots for audit trail, debugging, and compliance
CREATE TABLE IF NOT EXISTS automation_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications_v2(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES application_batches(id) ON DELETE SET NULL,
    screenshot_type VARCHAR(50) NOT NULL,
    -- 'PRE_SUBMIT', 'SUCCESS', 'ERROR', 'CAPTCHA', 'LOGIN_WALL', 'FORM_VALIDATION', 'TIMEOUT'
    screenshot_url TEXT,
    -- S3/Supabase Storage URL (preferred for large files)
    screenshot_base64 TEXT,
    -- Base64 encoded PNG (for immediate storage, can be moved to blob storage later)
    page_url TEXT NOT NULL,
    -- URL where screenshot was captured
    page_title TEXT,
    -- Page title at capture time
    error_message TEXT,
    -- Error details if screenshot_type is ERROR
    portal_type VARCHAR(50),
    -- Portal type at time of capture
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Additional context: browser viewport, user agent, form state
    file_size_bytes INT,
    -- Size of screenshot for storage management
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT chk_screenshot_type CHECK (
        screenshot_type IN ('PRE_SUBMIT', 'SUCCESS', 'ERROR', 'CAPTCHA', 'LOGIN_WALL', 'FORM_VALIDATION', 'TIMEOUT')
    ),
    CONSTRAINT chk_screenshot_storage CHECK (
        screenshot_url IS NOT NULL OR screenshot_base64 IS NOT NULL
    )
);

CREATE INDEX idx_screenshots_application ON automation_screenshots(application_id);
CREATE INDEX idx_screenshots_job ON automation_screenshots(job_id);
CREATE INDEX idx_screenshots_batch ON automation_screenshots(batch_id);
CREATE INDEX idx_screenshots_type ON automation_screenshots(screenshot_type);
CREATE INDEX idx_screenshots_captured ON automation_screenshots(captured_at DESC);

COMMENT ON TABLE automation_screenshots IS 'Audit trail screenshots from automated job applications';
COMMENT ON COLUMN automation_screenshots.screenshot_type IS 'Categorizes screenshot purpose: SUCCESS, ERROR, CAPTCHA, etc.';
COMMENT ON COLUMN automation_screenshots.screenshot_base64 IS 'Base64 PNG for immediate storage (should be migrated to blob storage for large files)';

-- 4. BATCH APPLICATION MAPPINGS
-- Junction table linking batches to applications with execution order
CREATE TABLE IF NOT EXISTS batch_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES application_batches(id) ON DELETE CASCADE NOT NULL,
    application_id UUID REFERENCES applications_v2(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    execution_order INT NOT NULL,
    -- Order in which this application should be processed in the batch
    status VARCHAR(50) DEFAULT 'QUEUED' NOT NULL,
    -- 'QUEUED', 'PROCESSING', 'SUBMITTED', 'FAILED', 'NEEDS_REVIEW', 'SKIPPED'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE(batch_id, job_id)
);

CREATE INDEX idx_batch_apps_batch ON batch_applications(batch_id);
CREATE INDEX idx_batch_apps_application ON batch_applications(application_id);
CREATE INDEX idx_batch_apps_status ON batch_applications(status);
CREATE INDEX idx_batch_apps_order ON batch_applications(batch_id, execution_order);

COMMENT ON TABLE batch_applications IS 'Junction table linking application batches to individual applications';
COMMENT ON COLUMN batch_applications.execution_order IS 'Determines processing order within batch (e.g., high-score jobs first)';

-- 5. EXTEND EXISTING applications_v2 TABLE
-- Add new columns for auto-apply tracking (no destructive changes)
DO $$
BEGIN
    -- Add batch_id reference if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='applications_v2' AND column_name='batch_id'
    ) THEN
        ALTER TABLE applications_v2
        ADD COLUMN batch_id UUID REFERENCES application_batches(id) ON DELETE SET NULL;

        CREATE INDEX idx_applications_v2_batch ON applications_v2(batch_id);

        COMMENT ON COLUMN applications_v2.batch_id IS 'Reference to batch if application was part of bulk auto-apply';
    END IF;

    -- Add portal_mapping_id reference if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='applications_v2' AND column_name='portal_mapping_id'
    ) THEN
        ALTER TABLE applications_v2
        ADD COLUMN portal_mapping_id UUID REFERENCES portal_form_mappings(id) ON DELETE SET NULL;

        CREATE INDEX idx_applications_v2_portal_mapping ON applications_v2(portal_mapping_id);

        COMMENT ON COLUMN applications_v2.portal_mapping_id IS 'Reference to cached portal mapping used for this application';
    END IF;

    -- Add automation_metadata JSONB column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='applications_v2' AND column_name='automation_metadata'
    ) THEN
        ALTER TABLE applications_v2
        ADD COLUMN automation_metadata JSONB DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN applications_v2.automation_metadata IS 'Playwright automation metadata: browser version, execution time, selectors used, etc.';
    END IF;
END $$;

-- 6. UPDATE TRIGGER FOR applications_v2
-- Auto-update batch counters when application status changes
CREATE OR REPLACE FUNCTION update_batch_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.batch_id IS NOT NULL THEN
        -- Update batch counters based on new status
        UPDATE application_batches
        SET
            completed_count = (
                SELECT COUNT(*) FROM applications_v2
                WHERE batch_id = NEW.batch_id
                AND status IN ('SUBMITTED', 'FAILED', 'MANUAL_REQUIRED')
            ),
            success_count = (
                SELECT COUNT(*) FROM applications_v2
                WHERE batch_id = NEW.batch_id
                AND status = 'SUBMITTED'
            ),
            failed_count = (
                SELECT COUNT(*) FROM applications_v2
                WHERE batch_id = NEW.batch_id
                AND status = 'FAILED'
            ),
            needs_review_count = (
                SELECT COUNT(*) FROM applications_v2
                WHERE batch_id = NEW.batch_id
                AND status IN ('READY_FOR_REVIEW', 'MANUAL_REQUIRED')
            ),
            status = CASE
                WHEN (
                    SELECT COUNT(*) FROM applications_v2
                    WHERE batch_id = NEW.batch_id
                    AND status IN ('SUBMITTED', 'FAILED', 'MANUAL_REQUIRED')
                ) >= total_count THEN 'COMPLETED'
                ELSE 'PROCESSING'
            END,
            completed_at = CASE
                WHEN (
                    SELECT COUNT(*) FROM applications_v2
                    WHERE batch_id = NEW.batch_id
                    AND status IN ('SUBMITTED', 'FAILED', 'MANUAL_REQUIRED')
                ) >= total_count THEN timezone('utc'::text, now())
                ELSE completed_at
            END,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.batch_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_batch_counters ON applications_v2;
CREATE TRIGGER trigger_update_batch_counters
    AFTER INSERT OR UPDATE OF status ON applications_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_counters();

-- 7. UPDATE TRIGGER FOR portal_form_mappings
-- Auto-update success/failure counts
CREATE OR REPLACE FUNCTION update_portal_mapping_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.portal_mapping_id IS NOT NULL AND OLD.status != NEW.status THEN
        IF NEW.status = 'SUBMITTED' THEN
            UPDATE portal_form_mappings
            SET
                success_count = success_count + 1,
                last_used_at = timezone('utc'::text, now()),
                updated_at = timezone('utc'::text, now())
            WHERE id = NEW.portal_mapping_id;
        ELSIF NEW.status = 'FAILED' THEN
            UPDATE portal_form_mappings
            SET
                failure_count = failure_count + 1,
                last_failed_at = timezone('utc'::text, now()),
                updated_at = timezone('utc'::text, now())
            WHERE id = NEW.portal_mapping_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_portal_mapping_stats ON applications_v2;
CREATE TRIGGER trigger_update_portal_mapping_stats
    AFTER UPDATE OF status ON applications_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_portal_mapping_stats();

-- 8. HELPER VIEW: Batch Progress Summary
CREATE OR REPLACE VIEW batch_progress_summary AS
SELECT
    b.id as batch_id,
    b.user_profile_id,
    b.status as batch_status,
    b.total_count,
    b.completed_count,
    b.success_count,
    b.failed_count,
    b.needs_review_count,
    b.started_at,
    b.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(b.completed_at, NOW()) - b.started_at)) as duration_seconds,
    ROUND((b.completed_count::numeric / b.total_count) * 100, 2) as completion_percentage,
    ROUND((b.success_count::numeric / GREATEST(b.completed_count, 1)) * 100, 2) as success_rate,
    array_agg(
        json_build_object(
            'job_id', a.job_id,
            'status', a.status,
            'submitted_at', a.submitted_at
        ) ORDER BY a.created_at
    ) as applications
FROM application_batches b
LEFT JOIN applications_v2 a ON a.batch_id = b.id
GROUP BY b.id;

COMMENT ON VIEW batch_progress_summary IS 'Real-time batch progress metrics for UI display';

-- 9. HELPER VIEW: Portal Mapping Reliability
CREATE OR REPLACE VIEW portal_mapping_reliability AS
SELECT
    portal_identifier,
    portal_type,
    validation_status,
    success_count,
    failure_count,
    CASE
        WHEN (success_count + failure_count) = 0 THEN 0
        ELSE ROUND((success_count::numeric / (success_count + failure_count)) * 100, 2)
    END as success_rate,
    last_used_at,
    last_validated_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 as age_days
FROM portal_form_mappings
ORDER BY success_count DESC;

COMMENT ON VIEW portal_mapping_reliability IS 'Portal mapping reliability metrics for monitoring and alerting';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
