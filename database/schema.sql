-- ============================================================================
-- AI-POWERED PORTFOLIO PLATFORM DATABASE SCHEMA & SEED DATA (SUPABASE POSTGRESQL)
-- ============================================================================

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS visitor_events CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS education CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS experience CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Profiles Table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    headline TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Skills Table
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- 'frontend', 'backend', 'cloud', 'ai', 'tools', 'oms'
    proficiency TEXT NOT NULL, -- 'expert', 'advanced', 'professional'
    display_order INT DEFAULT 0
);

-- 3. Experience Table
CREATE TABLE experience (
    id SERIAL PRIMARY KEY,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    duration TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    highlights TEXT[] NOT NULL,
    technologies TEXT[] NOT NULL,
    display_order INT DEFAULT 0
);

-- 4. Projects Table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    overview TEXT,
    problem TEXT,
    solution TEXT,
    challenges TEXT,
    results TEXT,
    tech_stack TEXT[] NOT NULL,
    live_url TEXT,
    github_url TEXT,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0
);

-- 5. Education Table
CREATE TABLE education (
    id SERIAL PRIMARY KEY,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    duration TEXT NOT NULL,
    score TEXT,
    location TEXT,
    display_order INT DEFAULT 0
);

-- 6. Certificates Table
CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    issue_date DATE,
    verification_url TEXT,
    display_order INT DEFAULT 0
);

-- 7. Contacts Table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    message TEXT NOT NULL,
    purpose TEXT,
    budget TEXT
);

-- 8. Chat Sessions Table
CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY, -- Visitor Session UUID or Custom String
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'ai_twin' NOT NULL, -- 'ai_twin', 'live_human', 'closed'
    visitor_info JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- 9. Chat Messages Table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Visitor Events Table (Analytics)
CREATE TABLE visitor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    session_id TEXT,
    country TEXT,
    city TEXT,
    browser TEXT,
    os TEXT,
    event_type TEXT NOT NULL, -- 'page_view', 'resume_download', 'project_click', 'contact_submit'
    event_details JSONB DEFAULT '{}'::jsonb NOT NULL
);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Allow public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow admin write profiles" ON profiles FOR ALL TO authenticated USING (true);

-- 2. Skills Policies
CREATE POLICY "Allow public read skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Allow admin write skills" ON skills FOR ALL TO authenticated USING (true);

-- 3. Experience Policies
CREATE POLICY "Allow public read experience" ON experience FOR SELECT USING (true);
CREATE POLICY "Allow admin write experience" ON experience FOR ALL TO authenticated USING (true);

-- 4. Projects Policies
CREATE POLICY "Allow public read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow admin write projects" ON projects FOR ALL TO authenticated USING (true);

-- 5. Education Policies
CREATE POLICY "Allow public read education" ON education FOR SELECT USING (true);
CREATE POLICY "Allow admin write education" ON education FOR ALL TO authenticated USING (true);

-- 6. Certificates Policies
CREATE POLICY "Allow public read certificates" ON certificates FOR SELECT USING (true);
CREATE POLICY "Allow admin write certificates" ON certificates FOR ALL TO authenticated USING (true);

-- 7. Contacts Policies
CREATE POLICY "Allow public insert contacts" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin view/manage contacts" ON contacts FOR ALL TO authenticated USING (true);

-- 8. Chat Sessions Policies
CREATE POLICY "Allow public read/insert chat_sessions" ON chat_sessions FOR ALL USING (true);
CREATE POLICY "Allow admin manage chat_sessions" ON chat_sessions FOR ALL TO authenticated USING (true);

-- 9. Chat Messages Policies
CREATE POLICY "Allow public read/insert chat_messages" ON chat_messages FOR ALL USING (true);
CREATE POLICY "Allow admin manage chat_messages" ON chat_messages FOR ALL TO authenticated USING (true);

-- 10. Visitor Events Policies
CREATE POLICY "Allow public insert visitor_events" ON visitor_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin view/manage visitor_events" ON visitor_events FOR ALL TO authenticated USING (true);


-- ============================================================================
-- INITIAL DATA SEEDING (Sathyanantham V Resume Data)
-- ============================================================================

-- Seed Profiles
INSERT INTO profiles (id, name, title, headline, email, phone, location, linkedin_url, github_url, summary)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    'Sathyanantham V',
    'Lead Software Engineer & Frontend Architect',
    'Lead Software Engineer | Frontend Architect | Enterprise UI Platforms | React.js Expert | Micro Frontend Architecture | Technical Mentor | Generative AI Practitioner',
    'v.sathyanantham@gmail.com',
    '+91-8870956756',
    'Coimbatore, Tamil Nadu, India',
    'https://www.linkedin.com/in/sathyanantham-v-646b911b',
    'https://github.com/sathyanantham',
    'Lead Software Engineer with 13+ years of experience designing, architecting, and delivering enterprise-scale frontend applications, digital commerce platforms, and Order Management solutions. Specialized in React.js, TypeScript, Enterprise UI Platforms, Micro Frontend Architecture, and scalable frontend ecosystems with extensive experience leading engineering teams, mentoring developers, and driving technical architecture for global enterprise clients.'
);

-- Seed Skills
INSERT INTO skills (name, category, proficiency, display_order) VALUES
('React.js', 'frontend', 'expert', 1),
('TypeScript', 'frontend', 'expert', 2),
('JavaScript (ES6+)', 'frontend', 'expert', 3),
('Next.js', 'frontend', 'expert', 4),
('Micro Frontend Architecture', 'frontend', 'expert', 5),
('Module Federation', 'frontend', 'expert', 6),
('Design Systems', 'frontend', 'expert', 7),
('Redux Toolkit', 'frontend', 'expert', 8),
('Node.js', 'backend', 'advanced', 9),
('FastAPI / Python', 'backend', 'advanced', 10),
('Spring Boot', 'backend', 'advanced', 11),
('PostgreSQL', 'backend', 'advanced', 12),
('Kafka', 'backend', 'advanced', 13),
('Redis', 'backend', 'advanced', 14),
('IBM Sterling OMS', 'oms', 'advanced', 15),
('IBM Call Center', 'oms', 'advanced', 16),
('Generative AI', 'ai', 'advanced', 17),
('Claude AI / Claude Skills', 'ai', 'advanced', 18),
('Prompt Engineering', 'ai', 'advanced', 19),
('AI Agents / RAG', 'ai', 'advanced', 20),
('Docker', 'cloud', 'advanced', 21),
('Azure Serverless', 'cloud', 'advanced', 22),
('CI/CD Jenkins', 'cloud', 'advanced', 23),
('Git / Bitbucket', 'tools', 'expert', 24);

-- Seed Experience
INSERT INTO experience (company, role, duration, start_date, end_date, highlights, technologies, display_order) VALUES
(
    'Nextuple Inc.',
    'Lead Software Engineer',
    'August 2023 – Present',
    '2023-08-01',
    NULL,
    ARRAY[
        'Lead frontend architecture for enterprise Order Management and commerce applications, mentoring a team of 8 engineers across frontend and backend development.',
        'Designed and implemented the Claude Skills Initiative, standardizing UI Schema Generation, technical docs, unit tests, and API documentation to reduce engineering effort from 20 to 5 days.',
        'Led the integration of an IBM AI-powered chatbot into Call Center applications and contributed to IBM Sterling OMS frontend extensions for Tapestry, DSG, and Ashley Furniture.'
    ],
    ARRAY['React.js', 'TypeScript', 'Node.js', 'Python', 'Spring Boot', 'IBM Sterling OMS', 'Generative AI', 'Vite', 'Module Federation'],
    1
),
(
    'Nextuple Inc.',
    'Senior Software Engineer',
    'August 2022 – July 2023',
    '2022-08-01',
    '2023-07-31',
    ARRAY[
        'Developed enterprise Order Management applications, contributing to the core Promise Engine, Inventory, Picking, Packing, Staging, and Hub applications.',
        'Built reusable React components, custom hooks, and robust UI configurations in close collaboration with product owners and architects.'
    ],
    ARRAY['React.js', 'TypeScript', 'Node.js', 'Spring Boot', 'Kafka', 'Redis', 'PostgreSQL'],
    2
),
(
    'Cognizant Technology Solutions',
    'Senior Associate',
    'November 2018 – August 2022',
    '2018-11-01',
    '2022-08-01',
    ARRAY[
        'Developed enterprise applications using React.js and Drupal for global clients in Banking, Healthcare, and Life Sciences.',
        'Delivered responsive websites for global brands (such as Bayer and US Bank) and led offshore and onsite team reviews.'
    ],
    ARRAY['React.js', 'Drupal', 'JavaScript', 'HTML5', 'CSS3', 'SCSS', 'Node.js'],
    3
),
(
    'Skava Systems (Infosys)',
    'Lead Developer / Senior Software Engineer',
    'July 2012 – November 2018',
    '2012-07-01',
    '2018-11-01',
    ARRAY[
        'Led frontend development for large-scale retail eCommerce platforms, delivering mobile-responsive systems for Adidas, Reebok, Kohl''s, and Toys"R"Us.',
        'Mentored junior engineers, conducted structural architecture reviews, and established best practices for performance optimization.'
    ],
    ARRAY['React.js', 'JavaScript', 'HTML5', 'CSS3', 'Node.js', 'Micro Frontend Architecture'],
    4
);

-- Seed Projects
INSERT INTO projects (title, description, overview, problem, solution, challenges, results, tech_stack, live_url, github_url, is_featured, display_order) VALUES
(
    'Claude Skills Initiative',
    'AI-assisted development accelerators standardizing UI schema, code generation, and test suites.',
    'Developed custom modular assistant prompts and context configurations for Claude AI, standardizing and accelerating everyday full-stack development tasks.',
    'Standardizing code quality, UI schema construction, and API documentation across distributed engineering teams was slow and inconsistent.',
    'Designed reusable AI agent templates (Claude Skills) that execute tasks like automatic schema parsing, TypeScript definition creation, and unit test generation.',
    'Creating high-accuracy prompts that reliably adhere to strict enterprise coding styles without hallucinations.',
    'Successfully reduced engineering effort for common boilerplate activities from 20 days to 5 days, accelerating developer onboarding and code reuse.',
    ARRAY['Claude AI', 'Prompt Engineering', 'TypeScript', 'Node.js', 'FastAPI'],
    NULL,
    NULL,
    true,
    1
),
(
    'IBM AI-Powered Call Center Chatbot',
    'Integration of enterprise RAG chat capabilities into customer order support systems.',
    'Built a bridge between customer support interfaces and enterprise backend data sources using generative AI to handle direct customer order inquiries.',
    'Call Center agents spent excessive time browsing manual logs and documentation to address order modification and shipping status queries.',
    'Led frontend integration of an AI-powered conversational agent, utilizing Python-based middleware services to fetch RAG data from order databases.',
    'Securing customer data privacy while streaming order-specific details in real-time with zero system latency.',
    'Enhanced Call Center workflow efficiency, decreasing average query resolution times and boosting agent satisfaction.',
    ARRAY['FastAPI', 'Python', 'IBM Sterling OMS', 'React.js', 'RAG', 'WebSockets'],
    NULL,
    NULL,
    true,
    2
),
(
    'Enterprise Micro Frontend Platform',
    'Module Federation architecture powering 15+ complex business components.',
    'Designed a federated UI shell supporting modular runtime assembly of shipping, catalog, and inventory screens.',
    'Monolithic frontend repositories suffered from slow build times, rigid deployments, and merge conflicts across teams.',
    'Implemented Micro Frontend Architecture utilizing Webpack Module Federation, enabling independent deploy cycles for sub-modules.',
    'Handling shared global state management, style isolation, and reliable cross-app routing without visual lag.',
    'Delivered reusable layouts across 15+ distinct applications, dramatically increasing developer agility and independent ship rates.',
    ARRAY['React.js', 'Webpack', 'Module Federation', 'Redux Toolkit', 'TypeScript'],
    NULL,
    NULL,
    true,
    3
);

-- Seed Education
INSERT INTO education (institution, degree, duration, score, location, display_order) VALUES
(
    'Dr. Mahalingam College of Engineering and Technology',
    'Master of Computer Applications (MCA)',
    'July 2009 – June 2012',
    '8.28 CGPA',
    'Pollachi, Tamil Nadu, India',
    1
),
(
    'Nallamuthu Gounder Mahalingam College',
    'Bachelor of Science (Computer Science)',
    'July 2006 – May 2009',
    '78.51%',
    'Pollachi, Tamil Nadu, India',
    2
);

-- Seed Certificates
INSERT INTO certificates (name, issuer, issue_date, verification_url, display_order) VALUES
('Introduction to Agent Skills', 'Anthropic Claude', '2024-05-15', NULL, 1),
('React Testing Library with Jest / Vitest', 'Udemy', '2023-11-20', NULL, 2),
('Principles of Secure Coding', 'Cognizant Academy', '2021-08-10', NULL, 3),
('Docker for the Absolute Beginner', 'KodeKloud', '2022-03-05', NULL, 4),
('Azure Serverless – Hands-on Learning', 'Microsoft', '2022-09-12', NULL, 5),
('Generative AI Practitioner', 'Google Cloud', '2024-01-20', NULL, 6);
