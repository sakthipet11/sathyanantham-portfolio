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
    'sakthipet111@gmail.com',
    '+91-XXXXXXXXXX',
    'Bangalore, India (Open to Remote / Relocation)',
    'Authorized to work in India, open to US/Global Sponsorship & Remote contracts',
    13.5,
    30,
    0.00,
    140000.00,
    ARRAY['React', 'TypeScript', 'Micro Frontends', 'Next.js', 'System Architecture', 'Module Federation', 'State Management', 'Web Performance Optimization'],
    ARRAY['Node.js', 'Python', 'FastAPI', 'Tailwind CSS', 'Docker', 'GraphQL', 'Supabase', 'AWS', 'GCP'],
    '[
        {
            "company": "Enterprise Tech Solutions",
            "role": "Lead Frontend Architect",
            "period": "2021 - Present",
            "highlights": [
                "Architected large-scale Micro Frontend platform serving 5M+ monthly active users with Module Federation and Webpack 5.",
                "Spearheaded UI design system adoption across 14 cross-functional engineering pods, reducing feature delivery time by 35%.",
                "Optimized Core Web Vitals resulting in 42% improvement in Largest Contentful Paint (LCP) and 99.8% crash-free sessions."
            ]
        },
        {
            "company": "Digital Innovations Corp",
            "role": "Senior UI Platform Engineer",
            "period": "2016 - 2021",
            "highlights": [
                "Engineered responsive high-throughput dashboards and real-time visualization suites with React, TypeScript, and D3.",
                "Standardized frontend CI/CD automation pipelines and automated end-to-end Cypress/Playwright regression testing."
            ]
        }
    ]'::jsonb,
    '[
        {
            "degree": "Bachelor of Engineering in Computer Science & Engineering",
            "institution": "Anna University",
            "period": "2007 - 2011"
        }
    ]'::jsonb,
    '[
        {
            "name": "AWS Certified Solutions Architect - Associate",
            "issuer": "Amazon Web Services",
            "year": "2023"
        }
    ]'::jsonb,
    '{
        "github": "https://github.com/sakthipet11",
        "linkedin": "https://linkedin.com/in/sathyanantham",
        "portfolio": "https://sathya-ai.studio"
    }'::jsonb,
    '{
        "require_sponsorship": "No / Yes depending on jurisdiction",
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
    ARRAY['Lead Frontend Architect', 'Principal UI Platform Engineer', 'Staff Micro Frontend Architect', 'Senior UI Platform Lead'],
    ARRAY['Remote', 'Hybrid', 'Bangalore', 'US Remote'],
    ARRAY['Revature', 'CyberCoders'],
    ARRAY['Unpaid', 'Volunteer', 'Junior Intern']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO job_sources (id, name, base_url, source_type, is_active) VALUES
    ('00000000-0000-0000-0000-000000000011', 'linkedin', 'https://www.linkedin.com/jobs', 'mcp_browserbase', true),
    ('00000000-0000-0000-0000-000000000012', 'greenhouse', 'https://boards.greenhouse.io', 'api', true),
    ('00000000-0000-0000-0000-000000000013', 'lever', 'https://jobs.lever.co', 'api', true),
    ('00000000-0000-0000-0000-000000000014', 'workday', 'https://myworkdayjobs.com', 'mcp_browserbase', true)
ON CONFLICT (name) DO NOTHING;
