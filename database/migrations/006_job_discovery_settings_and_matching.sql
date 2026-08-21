-- Migration: 006_job_discovery_settings_and_matching.sql
-- Description: Extends automation_settings, jobs, and job_scores for AI-powered Job Discovery & Matching (Profile Match & JD Match)

-- 1. Extend automation_settings table with discovery configuration fields
ALTER TABLE automation_settings
    ADD COLUMN IF NOT EXISTS remote_preference VARCHAR(50) DEFAULT 'Local + Remote',
    ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT '{"Senior UI Developer", "React Developer", "Lead Software Engineer", "AI Engineer"}'::text[],
    ADD COLUMN IF NOT EXISTS experience_levels TEXT[] DEFAULT '{"Senior", "Lead"}'::text[],
    ADD COLUMN IF NOT EXISTS employment_types TEXT[] DEFAULT '{"Full-time", "Contract"}'::text[],
    ADD COLUMN IF NOT EXISTS job_recency_hours INT DEFAULT 24,
    ADD COLUMN IF NOT EXISTS daily_schedule_time VARCHAR(50) DEFAULT '08:00 AM IST',
    ADD COLUMN IF NOT EXISTS profile_ats_threshold NUMERIC(5, 2) DEFAULT 75.00,
    ADD COLUMN IF NOT EXISTS jd_match_threshold NUMERIC(5, 2) DEFAULT 50.00;

-- 2. Extend jobs table with match metadata
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS match_type VARCHAR(50) DEFAULT 'PROFILE_MATCH',
    ADD COLUMN IF NOT EXISTS reference_jd_summary TEXT,
    ADD COLUMN IF NOT EXISTS match_score NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS published_time VARCHAR(100);

-- 3. Extend job_scores table with match type and reference metadata
ALTER TABLE job_scores
    ADD COLUMN IF NOT EXISTS match_type VARCHAR(50) DEFAULT 'PROFILE_MATCH',
    ADD COLUMN IF NOT EXISTS reference_jd TEXT;

-- 4. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_jobs_match_type ON jobs(match_type);
CREATE INDEX IF NOT EXISTS idx_jobs_discovered_at ON jobs(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_scores_match_type ON job_scores(match_type);
