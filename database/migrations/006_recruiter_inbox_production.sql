-- Migration 006: Recruiter Inbox & Gmail Automation Center Production Schema

-- 1. Ensure `emails` table has all necessary columns for production recruiter automation
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    recruiter_id UUID REFERENCES recruiters(id) ON DELETE SET NULL,
    gmail_message_id VARCHAR(255) UNIQUE,
    gmail_thread_id VARCHAR(255),
    direction VARCHAR(20) NOT NULL DEFAULT 'INBOUND',
    sender TEXT NOT NULL,
    sender_name TEXT,
    company TEXT,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    body_summary TEXT,
    ai_classification VARCHAR(50),
    confidence NUMERIC(4,3) DEFAULT 0.950,
    ai_extracted_details JSONB DEFAULT '{}'::jsonb,
    requires_human_review BOOLEAN DEFAULT true,
    risk_reasons JSONB DEFAULT '[]'::jsonb,
    action_status VARCHAR(50) DEFAULT 'DRAFT_READY',
    draft_reply_subject TEXT,
    draft_reply_body TEXT,
    attached_resume_id TEXT,
    sent_message_id TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add any missing columns to existing emails table safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'sender_name') THEN
        ALTER TABLE emails ADD COLUMN sender_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'company') THEN
        ALTER TABLE emails ADD COLUMN company TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'confidence') THEN
        ALTER TABLE emails ADD COLUMN confidence NUMERIC(4,3) DEFAULT 0.950;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'body_summary') THEN
        ALTER TABLE emails ADD COLUMN body_summary TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'requires_human_review') THEN
        ALTER TABLE emails ADD COLUMN requires_human_review BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'risk_reasons') THEN
        ALTER TABLE emails ADD COLUMN risk_reasons JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'draft_reply_subject') THEN
        ALTER TABLE emails ADD COLUMN draft_reply_subject TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'draft_reply_body') THEN
        ALTER TABLE emails ADD COLUMN draft_reply_body TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'attached_resume_id') THEN
        ALTER TABLE emails ADD COLUMN attached_resume_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'sent_message_id') THEN
        ALTER TABLE emails ADD COLUMN sent_message_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'received_at') THEN
        ALTER TABLE emails ADD COLUMN received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'sent_at') THEN
        ALTER TABLE emails ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'updated_at') THEN
        ALTER TABLE emails ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Create Indexes for High-Speed Querying & Filtering
CREATE INDEX IF NOT EXISTS idx_emails_gmail_message_id ON emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_classification ON emails(ai_classification);
CREATE INDEX IF NOT EXISTS idx_emails_action_status ON emails(action_status);
CREATE INDEX IF NOT EXISTS idx_emails_company ON emails(company);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);

-- 2. Email Audit Logs Table for Auditing AI & Human Decisions
CREATE TABLE IF NOT EXISTS email_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    notes TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
DO $$
BEGIN
    ALTER TABLE email_audit_logs ALTER COLUMN email_id DROP NOT NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_email_audit_logs_email_id ON email_audit_logs(email_id);

-- Safe schema alignment for resume_versions
DO $$
BEGIN
    ALTER TABLE resume_versions ALTER COLUMN latex_source DROP NOT NULL;
    ALTER TABLE resume_versions ALTER COLUMN idempotency_key DROP NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_versions' AND column_name = 'name') THEN
        ALTER TABLE resume_versions ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_versions' AND column_name = 'role') THEN
        ALTER TABLE resume_versions ADD COLUMN role TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_versions' AND column_name = 'score') THEN
        ALTER TABLE resume_versions ADD COLUMN score TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_versions' AND column_name = 'download_url') THEN
        ALTER TABLE resume_versions ADD COLUMN download_url TEXT;
    END IF;
END $$;

-- 3. Seed Authoritative Resume Versions referencing real files in public/downloads
INSERT INTO resume_versions (id, name, version_name, latex_source, idempotency_key, role, score, status, download_url, pdf_url, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000011', 'Sathyanantham_V_Frontend_Architect_2026.pdf', 'Lead Frontend Architect', '% Lead Frontend Architect Resume', 'seed-resume-frontend-architect', 'Lead Frontend Architect', '99%', 'ACTIVE', '/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf', '/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf', timezone('utc'::text, now())),
    ('00000000-0000-0000-0000-000000000012', 'Sathyanantham_V_AI_FullStack_Lead.pdf', 'AI-Assisted Lead Engineer', '% AI FullStack Lead Resume', 'seed-resume-ai-lead', 'AI-Assisted Lead Engineer', '97%', 'ACTIVE', '/downloads/Sathyanantham_V_AI_FullStack_Lead.pdf', '/downloads/Sathyanantham_V_AI_FullStack_Lead.pdf', timezone('utc'::text, now())),
    ('00000000-0000-0000-0000-000000000013', 'Sathyanantham_V_MicroFrontend_Specialist.pdf', 'Micro Frontend Architect', '% Micro Frontend Specialist Resume', 'seed-resume-mfe-specialist', 'Micro Frontend Architect', '98%', 'ACTIVE', '/downloads/Sathyanantham_V_MicroFrontend_Specialist.pdf', '/downloads/Sathyanantham_V_MicroFrontend_Specialist.pdf', timezone('utc'::text, now())),
    ('00000000-0000-0000-0000-000000000014', 'Sathyanantham_V_Resume.pdf', 'Principal Architect & FullStack Lead', '% General Lead Architect Resume', 'seed-resume-general-architect', 'Principal Architect & FullStack Lead', '95%', 'ACTIVE', '/downloads/Sathyanantham_V_Resume.pdf', '/downloads/Sathyanantham_V_Resume.pdf', timezone('utc'::text, now()))
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    version_name = EXCLUDED.version_name,
    latex_source = EXCLUDED.latex_source,
    idempotency_key = EXCLUDED.idempotency_key,
    role = EXCLUDED.role,
    score = EXCLUDED.score,
    status = EXCLUDED.status,
    download_url = EXCLUDED.download_url,
    pdf_url = EXCLUDED.pdf_url;
