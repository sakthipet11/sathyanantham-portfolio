-- ============================================================================
-- 002_SEED_JOBS_AND_AGENTS.SQL (Job Listings & Initial Agent Seeds)
-- ============================================================================

INSERT INTO job_listings (id, title, company, location, tech_stack, source, discovered_by_agent) VALUES
('JOB-101', 'Lead Frontend Architect', 'TechCorp Enterprise', 'Remote / US', ARRAY['React', 'TypeScript', 'Module Federation', 'Next.js'], 'LinkedIn', 'job_discovery_agent'),
('JOB-102', 'Principal UI Platform Engineer', 'CloudCommerce Inc', 'Hybrid', ARRAY['React', 'Design Systems', 'FastAPI', 'AI Agents'], 'Indeed', 'job_discovery_agent')
ON CONFLICT (id) DO NOTHING;

INSERT INTO applications (id, job_id, role, company, status, submitted_via_agent) VALUES
('APP-101', 'JOB-101', 'Lead Frontend Architect', 'TechCorp Enterprise', 'Interviewing', 'application_agent')
ON CONFLICT (id) DO NOTHING;
