-- ============================================================================
-- 003_USER_PROFILE_SEED.SQL
-- Seed verified Candidate Truth Store & default automation settings
-- ============================================================================

INSERT INTO user_profile (
    id,
    full_name,
    email,
    phone,
    location,
    work_authorization,
    years_of_experience,
    notice_period_days,
    current_salary,
    expected_salary_min,
    primary_skills,
    secondary_skills,
    experience_history,
    education_history,
    certifications,
    portfolio_urls,
    answers_to_common_questions
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Sathyanantham V',
    'v.sathyanantham@gmail.com',
    '+91 8870956756',
    'Coimbatore, Tamil Nadu, India (Open to Remote / Relocation)',
    'Authorized to work in India, open to Global Sponsorship & Remote contracts',
    13.0,
    30,
    0.00,
    140000.00,
    ARRAY['React', 'TypeScript', 'Micro Frontends', 'Next.js', 'System Architecture', 'Module Federation', 'Claude Skills', 'IBM AI'],
    ARRAY['Node.js', 'Python', 'FastAPI', 'Spring Boot', 'Tailwind CSS', 'Docker', 'GraphQL', 'Supabase', 'AWS', 'GCP'],
    '[
        {
            "company": "Nextuple Inc.",
            "role": "Lead Software Engineer",
            "period": "Aug 2023 - Present",
            "highlights": [
                "Leading an engineering team of 8 developers across frontend and backend, establishing engineering standards and architecture.",
                "Delivered Micro Frontend Architecture with Module Federation across 15+ enterprise modules and OMS platforms.",
                "Pioneered Claude Skills Initiative, reducing common engineering effort from ~20 days to 5 days."
            ]
        },
        {
            "company": "Cognizant Technology Solutions",
            "role": "Senior Associate",
            "period": "Nov 2018 - Aug 2022",
            "highlights": [
                "Architected 30+ global multi-localized responsive digital platforms for Bayer and US Bank authentication portal."
            ]
        },
        {
            "company": "Skava Systems (Infosys)",
            "role": "Dev Lead",
            "period": "July 2012 - Nov 2018",
            "highlights": [
                "Led Kohl''s Omnichannel Mobile & Tablet platforms (m.kohls.com), Toys''R''Us, Adidas, Reebok, and Kraft Foods."
            ]
        }
    ]'::jsonb,
    '[
        {
            "degree": "Master of Computer Applications (MCA)",
            "institution": "Dr. Mahalingam College of Engineering and Technology, Pollachi",
            "period": "2009 - 2012",
            "score": "8.28 CGPA / 82.8%"
        },
        {
            "degree": "Bachelor of Science in Computer Science (B.Sc CS)",
            "institution": "Nallamuthu Gounder Mahalingam College, Pollachi",
            "period": "2006 - 2009",
            "score": "78.51%"
        }
    ]'::jsonb,
    '[
        {
            "name": "Introduction to Agent Skills (Claude Certificate)",
            "issuer": "Anthropic / Claude",
            "year": "2024"
        }
    ]'::jsonb,
    '{
        "github": "https://github.com/sakthipet11",
        "linkedin": "https://www.linkedin.com/in/sathyanantham-v-646b911b",
        "portfolio": "https://sathyanantham-portfolio-tv.vercel.app"
    }'::jsonb,
    '{
        "require_sponsorship": "No / Open depending on location",
        "willing_to_relocate": "Yes",
        "preferred_work_type": "Full-Time / Contract Remote",
        "eeo_gender": "Decline to specify",
        "eeo_veteran": "Not a veteran",
        "eeo_disability": "No"
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());

INSERT INTO automation_settings (
    id,
    user_profile_id,
    daily_application_limit,
    min_ats_score_threshold,
    auto_apply_enabled,
    require_human_review_for_apply,
    require_human_review_for_email,
    target_titles,
    target_locations,
    blacklisted_companies,
    blacklisted_keywords
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    10,
    80.00,
    false,
    true,
    true,
    ARRAY['Lead Software Engineer', 'Frontend Architect', 'Lead Full Stack Engineer', 'Principal UI Engineer'],
    ARRAY['Remote', 'Coimbatore', 'Bangalore', 'Hybrid', 'US Remote'],
    ARRAY['Revature', 'CyberCoders'],
    ARRAY['Unpaid', 'Volunteer', 'Junior Intern']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO job_sources (id, name, base_url, source_type, is_active) VALUES
    ('00000000-0000-0000-0000-000000000011', 'linkedin', 'https://www.linkedin.com/jobs', 'mcp_browserbase', true),
    ('00000000-0000-0000-0000-000000000012', 'greenhouse', 'https://boards.greenhouse.io', 'api', true),
    ('00000000-0000-0000-0000-000000000013', 'lever', 'https://jobs.lever.co', 'api', true),
    ('00000000-0000-0000-0000-000000000014', 'workday', 'https://myworkdayjobs.com', 'mcp_browserbase', true)
ON CONFLICT (name) DO NOTHING;
