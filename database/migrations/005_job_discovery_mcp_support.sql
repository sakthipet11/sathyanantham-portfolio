-- ============================================================================
-- 005_JOB_DISCOVERY_MCP_SUPPORT.SQL
-- Extends existing schema for Job Discovery MCP Server integration.
-- 
-- OWNERSHIP: job_repository.py remains the canonical writer for jobs/job_scores.
-- This migration ONLY adds nullable columns to the existing jobs table and
-- creates new MCP-specific support tables. It does NOT recreate any table.
-- 
-- ROLLBACK: All changes are additive-only (nullable columns, new tables).
-- Disabling the MCP does not require dropping these — they go unused.
-- ============================================================================

-- 1. Extend existing jobs table with MCP-specific columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_url TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_date DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS responsibilities TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(64);

-- Index for fingerprint-based deduplication
CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint) WHERE fingerprint IS NOT NULL;
-- Index for source-based filtering
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source) WHERE source IS NOT NULL;

-- 2. Job Search Runs — tracks each MCP search execution
CREATE TABLE IF NOT EXISTS job_search_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_query TEXT NOT NULL,
    search_params JSONB DEFAULT '{}'::jsonb,
    providers_queried TEXT[] DEFAULT '{}'::text[],
    providers_succeeded TEXT[] DEFAULT '{}'::text[],
    providers_failed TEXT[] DEFAULT '{}'::text[],
    total_results INT DEFAULT 0,
    deduplicated_count INT DEFAULT 0,
    new_jobs_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED', -- 'COMPLETED', 'PARTIAL', 'DEGRADED', 'FAILED'
    duration_ms NUMERIC(10, 2),
    triggered_by VARCHAR(50) DEFAULT 'MANUAL', -- 'CLOUD_SCHEDULER', 'MANUAL_ADMIN', 'API'
    error_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_runs_created ON job_search_runs(created_at DESC);

-- 3. Job Source Records — raw provider response tracking (for debugging)
CREATE TABLE IF NOT EXISTS job_source_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    provider_job_id VARCHAR(255),
    raw_payload JSONB DEFAULT '{}'::jsonb,
    normalized_at TIMESTAMP WITH TIME ZONE,
    search_run_id UUID REFERENCES job_search_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_source_records_job ON job_source_records(job_id);
CREATE INDEX IF NOT EXISTS idx_source_records_provider ON job_source_records(provider);

-- 4. Provider Health — tracks provider reliability metrics
CREATE TABLE IF NOT EXISTS provider_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(100) NOT NULL,
    check_type VARCHAR(50) NOT NULL, -- 'HEALTH_CHECK', 'SEARCH', 'GET_JOB'
    is_healthy BOOLEAN NOT NULL,
    response_time_ms NUMERIC(10, 2),
    error_message TEXT,
    status_code INT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_provider_health_provider ON provider_health(provider, checked_at DESC);
