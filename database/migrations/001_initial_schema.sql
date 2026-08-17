-- ============================================================================
-- 001_INITIAL_SCHEMA.SQL (Core Portfolio & Visitor System Schema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
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

CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    proficiency TEXT NOT NULL,
    display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS experience (
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

CREATE TABLE IF NOT EXISTS projects (
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

CREATE TABLE IF NOT EXISTS education (
    id SERIAL PRIMARY KEY,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    duration TEXT NOT NULL,
    score TEXT,
    location TEXT,
    display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    issue_date DATE,
    verification_url TEXT,
    display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    message TEXT NOT NULL,
    purpose TEXT,
    budget TEXT
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'ai_twin' NOT NULL,
    visitor_info JSONB DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS visitor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    session_id TEXT,
    country TEXT,
    city TEXT,
    browser TEXT,
    os TEXT,
    event_type TEXT NOT NULL,
    event_details JSONB DEFAULT '{}'::jsonb NOT NULL
);
