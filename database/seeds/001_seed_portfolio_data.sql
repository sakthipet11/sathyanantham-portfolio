-- ============================================================================
-- 001_SEED_PORTFOLIO_DATA.SQL (Sathyanantham V Resume Seed Data)
-- ============================================================================

INSERT INTO profiles (id, name, title, headline, email, phone, location, linkedin_url, github_url, summary)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    'Sathyanantham V',
    'Frontend Architect & Lead Software Engineer',
    'Frontend Architect | Lead Software Engineer | Micro Frontends & AI-Assisted Engineering (13+ Yrs)',
    'v.sathyanantham@gmail.com',
    '+91 8870956756',
    'Coimbatore, Tamil Nadu, India',
    'https://www.linkedin.com/in/sathyanantham-v-646b911b',
    'https://github.com/sakthipet11',
    'Frontend Architect and Lead Software Engineer with 13+ years designing and scaling enterprise UI platforms, Micro Frontend ecosystems, and AI-assisted engineering workflows across Retail, Digital Commerce, Banking, and Order Management.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO skills (name, category, proficiency, display_order) VALUES
('React.js / Next.js', 'frontend', 'expert', 1),
('TypeScript & JavaScript (ES6+)', 'frontend', 'expert', 2),
('Micro Frontends & Module Federation', 'frontend', 'expert', 3),
('AI Agents & MCP (Model Context Protocol)', 'ai', 'expert', 4),
('Node.js & Python (FastAPI)', 'backend', 'advanced', 5),
('TailwindCSS & Design Systems', 'frontend', 'expert', 6),
('Supabase & PostgreSQL', 'cloud', 'advanced', 7)
ON CONFLICT (name) DO NOTHING;
