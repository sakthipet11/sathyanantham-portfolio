-- ============================================================================
-- 003_JOB_AUTOMATION_SCHEMA.SQL
-- Multi-Agent Job Application Automation & Recruiter OS Schema
-- ============================================================================

-- 1. USER PROFILE (Immutable Candidate Truth Store)
CREATE TABLE IF NOT EXISTS user_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT NOT NULL,
    work_authorization TEXT NOT NULL, -- e.g. 'US Citizen', 'Green Card', 'Permanent Resident'
    years_of_experience NUMERIC(4, 1) NOT NULL,
    notice_period_days INT DEFAULT 0,
    current_salary NUMERIC(12, 2),
    expected_salary_min NUMERIC(12, 2),
    primary_skills TEXT[] NOT NULL DEFAULT '{}',
    secondary_skills TEXT[] DEFAULT '{}',
    experience_history JSONB NOT NULL DEFAULT '[]'::jsonb, -- Verified real company/project bullet points
    education_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    portfolio_urls JSONB DEFAULT '{}'::jsonb,
    answers_to_common_questions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. AUTOMATION SETTINGS
CREATE TABLE IF NOT EXISTS automation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profile(id) ON DELETE CASCADE,
    daily_application_limit INT DEFAULT 10,
    min_ats_score_threshold NUMERIC(5, 2) DEFAULT 80.00,
    auto_apply_enabled BOOLEAN DEFAULT false,
    require_human_review_for_apply BOOLEAN DEFAULT true,
    require_human_review_for_email BOOLEAN DEFAULT true,
    target_titles TEXT[] DEFAULT '{"Lead Frontend Architect", "Principal UI Platform Engineer"}'::text[],
    target_locations TEXT[] DEFAULT '{"Remote", "Hybrid"}'::text[],
    blacklisted_companies TEXT[] DEFAULT '{}'::text[],
    blacklisted_keywords TEXT[] DEFAULT '{}'::text[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. JOB SOURCES
CREATE TABLE IF NOT EXISTS job_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- 'linkedin', 'indeed', 'greenhouse', 'lever', 'workday', 'wellfound'
    base_url TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'api', 'mcp_browserbase', 'rss', 'manual'
    scraping_config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_scanned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. JOBS
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES job_sources(id) ON DELETE SET NULL,
    external_job_id VARCHAR(255),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    location_type VARCHAR(50) DEFAULT 'Remote',
    employment_type VARCHAR(50) DEFAULT 'Full-time',
    salary_min NUMERIC(12, 2),
    salary_max NUMERIC(12, 2),
    salary_currency VARCHAR(10) DEFAULT 'USD',
    description_raw TEXT NOT NULL,
    requirements_clean TEXT,
    tech_stack TEXT[] DEFAULT '{}'::text[],
    apply_url TEXT NOT NULL,
    portal_type VARCHAR(50) DEFAULT 'custom', -- 'greenhouse', 'lever', 'workday', 'custom'
    status VARCHAR(50) DEFAULT 'DISCOVERED' NOT NULL, -- 'DISCOVERED', 'SCORING', 'QUALIFIED', 'REJECTED', 'TAILORING', 'READY_FOR_REVIEW', 'APPROVED', 'APPLYING', 'APPLIED', 'MANUAL_REQUIRED', 'FAILED', 'CLOSED'
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company_title ON jobs(company, title);
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency ON jobs(idempotency_key);

-- 5. JOB SCORES
CREATE TABLE IF NOT EXISTS job_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    overall_score NUMERIC(5, 2) NOT NULL,
    skills_match_score NUMERIC(5, 2) NOT NULL,
    experience_match_score NUMERIC(5, 2) NOT NULL,
    seniority_match_score NUMERIC(5, 2) NOT NULL,
    missing_skills TEXT[] DEFAULT '{}'::text[],
    matching_skills TEXT[] DEFAULT '{}'::text[],
    evaluation_summary TEXT NOT NULL,
    score_breakdown JSONB DEFAULT '{}'::jsonb NOT NULL,
    llm_model_used VARCHAR(100) NOT NULL,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_scores_job_id ON job_scores(job_id);
CREATE INDEX IF NOT EXISTS idx_job_scores_overall ON job_scores(overall_score DESC);

-- 6. RESUME VERSIONS
CREATE TABLE IF NOT EXISTS resume_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    version_name VARCHAR(255) NOT NULL,
    latex_source TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    google_drive_file_id VARCHAR(255),
    tailored_keywords TEXT[] DEFAULT '{}'::text[],
    changes_summary TEXT,
    status VARCHAR(50) DEFAULT 'GENERATED', -- 'GENERATED', 'APPROVED', 'ACTIVE', 'ARCHIVED'
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resume_versions_job_id ON resume_versions(job_id);

-- 7. APPLICATIONS (V2 Enhanced)
CREATE TABLE IF NOT EXISTS applications_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL, -- 'DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'SUBMITTING', 'SUBMITTED', 'FAILED', 'MANUAL_REQUIRED', 'WITHDRAWN'
    form_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    submission_method VARCHAR(50) DEFAULT 'mcp_browserbase',
    external_confirmation_id TEXT,
    screenshot_url TEXT,
    manual_reason TEXT,
    human_reviewer_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_v2_job ON applications_v2(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_v2_status ON applications_v2(status);

-- 8. APPLICATION EVENTS
CREATE TABLE IF NOT EXISTS application_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications_v2(id) ON DELETE CASCADE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_events_app_id ON application_events(application_id);

-- 9. RECRUITERS
CREATE TABLE IF NOT EXISTS recruiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    linkedin_url TEXT,
    role_title TEXT,
    relationship_stage VARCHAR(50) DEFAULT 'DISCOVERED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recruiters_company ON recruiters(company);

-- 10. REFERRALS
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT,
    contact_linkedin TEXT,
    connection_degree VARCHAR(20) DEFAULT 'Cold',
    status VARCHAR(50) DEFAULT 'DISCOVERED' NOT NULL, -- 'DISCOVERED', 'QUALIFIED', 'DRAFTED', 'READY_FOR_REVIEW', 'APPROVED', 'SENT', 'REPLIED', 'FAILED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_referrals_job_id ON referrals(job_id);

-- 11. REFERRAL REQUESTS
CREATE TABLE IF NOT EXISTS referral_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE NOT NULL,
    message_draft TEXT NOT NULL,
    approved_message TEXT,
    sent_channel VARCHAR(50) DEFAULT 'linkedin',
    sent_at TIMESTAMP WITH TIME ZONE,
    response_received_at TIMESTAMP WITH TIME ZONE,
    response_content TEXT,
    status VARCHAR(50) DEFAULT 'DRAFTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. EMAILS
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    recruiter_id UUID REFERENCES recruiters(id) ON DELETE SET NULL,
    gmail_message_id VARCHAR(255) UNIQUE,
    gmail_thread_id VARCHAR(255),
    direction VARCHAR(20) NOT NULL, -- 'INBOUND', 'OUTBOUND'
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    ai_classification VARCHAR(50), -- 'INTERVIEW_INVITE', 'REJECTION', 'TECHNICAL_SCREEN', 'OFFER', 'OTHER'
    ai_extracted_details JSONB DEFAULT '{}'::jsonb,
    requires_action BOOLEAN DEFAULT false,
    action_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_classification ON emails(ai_classification);

-- 13. AUTOMATION RUNS
CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type VARCHAR(100) NOT NULL,
    triggered_by VARCHAR(50) NOT NULL, -- 'CLOUD_SCHEDULER', 'MANUAL_ADMIN', 'WEBHOOK'
    status VARCHAR(50) DEFAULT 'RUNNING' NOT NULL,
    items_processed INT DEFAULT 0,
    items_succeeded INT DEFAULT 0,
    items_failed INT DEFAULT 0,
    error_summary TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 14. AUTOMATION TASKS
CREATE TABLE IF NOT EXISTS automation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES automation_runs(id) ON DELETE CASCADE NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    target_entity_type VARCHAR(50),
    target_entity_id UUID,
    status VARCHAR(50) DEFAULT 'PENDING',
    input_payload JSONB DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_tasks_run_id ON automation_tasks(run_id);

-- 15. AUDIT LOGS (Immutable Compliance Vault)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type VARCHAR(50) NOT NULL, -- 'SYSTEM_AGENT', 'ADMIN_HUMAN', 'MCP_TOOL'
    actor_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    ip_address VARCHAR(50),
    before_state JSONB,
    after_state JSONB,
    justification_rationale TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
