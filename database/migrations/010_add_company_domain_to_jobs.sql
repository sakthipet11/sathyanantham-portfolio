-- ============================================================================
-- 010_ADD_COMPANY_DOMAIN_TO_JOBS.SQL
-- Adds company_domain column to jobs table for storing resolved company domains.
-- ============================================================================

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS company_domain VARCHAR(255);
