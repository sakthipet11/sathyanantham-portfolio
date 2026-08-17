-- ============================================================================
-- 002_MULTI_AGENT_TABLES.SQL (Multi-Agent Operating System Tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_listings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    tech_stack TEXT[] DEFAULT '{}',
    source TEXT NOT NULL,
    discovered_by_agent TEXT DEFAULT 'job_discovery_agent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS job_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT REFERENCES job_listings(id) ON DELETE CASCADE NOT NULL,
    match_score NUMERIC(5, 2) NOT NULL,
    matching_skills TEXT[] DEFAULT '{}',
    recommendation TEXT,
    evaluated_by_agent TEXT DEFAULT 'job_scoring_agent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    job_id TEXT REFERENCES job_listings(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    status TEXT DEFAULT 'Submitted' NOT NULL, -- 'Submitted', 'Interviewing', 'Offer Stage', 'Rejected'
    tailored_resume_url TEXT,
    submitted_via_agent TEXT DEFAULT 'application_agent',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_outreach (
    id SERIAL PRIMARY KEY,
    contact_name TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    connection_type TEXT,
    outreach_status TEXT DEFAULT 'Outreach Sent',
    managed_by_agent TEXT DEFAULT 'referral_agent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'RUNNING'
    execution_details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
