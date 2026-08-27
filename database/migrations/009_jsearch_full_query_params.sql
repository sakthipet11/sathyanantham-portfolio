-- ============================================================================
-- 009_JSEARCH_FULL_QUERY_PARAMS.SQL
-- Extends automation_settings with all official JSearch API Query Parameters:
-- country, language, date_posted, work_from_home, job_requirements, radius,
-- exclude_job_publishers, num_pages, fields
-- ============================================================================

ALTER TABLE automation_settings
    ADD COLUMN IF NOT EXISTS country VARCHAR(10) DEFAULT 'in',
    ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS date_posted VARCHAR(20) DEFAULT 'week',
    ADD COLUMN IF NOT EXISTS work_from_home BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS job_requirements TEXT[] DEFAULT '{"more_than_3_years_experience"}'::text[],
    ADD COLUMN IF NOT EXISTS radius INT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS exclude_job_publishers TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS num_pages INT DEFAULT 1;
