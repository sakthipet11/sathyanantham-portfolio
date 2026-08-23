-- ============================================================================
-- 007_CONNECTIONS_AND_REFERRAL_ENRICHMENT.SQL
-- Connections Ingestion & Real LinkedIn / Apify Recruiter Directory Schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT DEFAULT '',
    full_name TEXT NOT NULL,
    company TEXT NOT NULL,
    position TEXT DEFAULT '',
    location TEXT DEFAULT '',
    email TEXT,
    linkedin_url TEXT,
    connection_degree VARCHAR(50) DEFAULT '1st', -- '1st', '2nd', 'Recruiter', 'Public'
    connected_on VARCHAR(100),
    source VARCHAR(100) DEFAULT 'LINKEDIN_CSV', -- 'LINKEDIN_CSV', 'APIFY_RECRUITER', 'APIFY_GEO_FALLBACK', 'MANUAL_ENTRY'
    tags TEXT[] DEFAULT '{}'::text[],
    raw_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connections_company ON connections(company);
CREATE INDEX IF NOT EXISTS idx_connections_email ON connections(email);
CREATE INDEX IF NOT EXISTS idx_connections_linkedin_url ON connections(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_connections_degree ON connections(connection_degree);
CREATE INDEX IF NOT EXISTS idx_connections_source ON connections(source);
