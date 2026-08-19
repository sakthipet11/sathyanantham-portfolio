---
name: portfolio-architect
description: Comprehensive architecture skill for operating and expanding Sathyanantham V's Multi-Agent Portfolio, Job Discovery MCP Server & Recruiter OS platform.
---

# Portfolio Architect & Job Discovery Engine Skill

This skill provides complete architecture specifications, logic flow, configuration reference, and operational workflows for managing Sathyanantham V's AI-Powered Digital Twin & Autonomous Multi-Agent Recruiter System.

---

## 🎯 System Architecture Overview

The platform operates on a clean 4-tier decoupled architecture:

```
[ Frontend: Next.js 15 App Router ]  <-- NEXT_PUBLIC_API_URL -->  [ Backend: FastAPI (Python 3.12+) ]
  ├── Public Candidate Portfolio (React 19)                         ├── 6 Autonomous AI Agents
  └── Recruiter / Admin OS (/admin/*)                               ├── Job Discovery MCP Server (10 Tools)
                                                                    └── Live Handoff & Visitor Telemetry
                                                                                   │
                                                                       [ Database & Cache Layer ]
                                                                        ├── PostgreSQL (Local) / Supabase (Prod)
                                                                        └── Redis / In-Memory TTL Cache
```

1. **Frontend (`app/`, `components/`, `lib/`)**: Next.js 15 App Router. Public portfolio (`ProjectsSection`, `ExperienceSection`, `SkillsMatrix`) and Admin OS (`/admin/dashboard`, `/admin/jobs`, `/admin/applications`, `/admin/resumes`, `/admin/referrals`, `/admin/recruiter-inbox`, `/admin/automation`, `/admin/retention`). All frontend API calls resolve dynamically through `getApiHost()` via `NEXT_PUBLIC_API_URL`.
2. **Backend Engine (`backend/python/`)**: FastAPI server housing 6 autonomous AI agents, OpenRouter / Gemini LLM evaluation, RAG knowledge retrieval, and WebSocket presence handoff.
3. **Job Discovery MCP Server (`backend/python/mcp/job_discovery/`)**: Official Model Context Protocol (MCP) server implementing live multi-portal discovery, rate limiting, deduplication, and schema normalization across 9+ job sources.
4. **Database & Data Lifecycle Layer (`backend/python/repositories/`)**: Dual-engine persistence supporting Local PostgreSQL in development and Supabase in production with cascade transactions and automated retention purging.

---

## 🔍 Job Fetching & Discovery Engine

### 1. Job Fetching Logic Flow

```mermaid
sequenceDiagram
    autonumber
    actor AdminOrCron as Cloud Scheduler / Admin UI
    participant Service as JobDiscoveryService
    participant MCP as JobDiscoveryMCPServer
    participant Registry as ProviderRegistry
    participant Portals as Active Live Providers (LinkedIn, RemoteOK, Arbeitnow, TheMuse, Remotive, Himalayas)
    participant Dedup as DeduplicationService
    participant Scoring as JobScoringService (Gemini)
    participant Repo as JobRepository (PostgreSQL / Supabase)

    AdminOrCron->>Service: POST /api/automation/jobs/discover {"target_role": "..."}
    Service->>MCP: search_jobs(query, location, limit)
    MCP->>Registry: get_enabled()
    Registry-->>MCP: [linkedin, remoteok, arbeitnow, themuse, remotive, himalayas, ...]
    
    par Concurrent Fetching with Rate Limiting & Circuit Breakers
        MCP->>Portals: search_jobs() via httpx async
    end
    Portals-->>MCP: Raw job card HTML / JSON responses

    MCP->>MCP: Normalize to NormalizedJob schema
    MCP->>Dedup: filter_duplicates(jobs) using SHA256 Canonical Fingerprint
    Dedup-->>MCP: Deduplicated NormalizedJob list
    MCP-->>Service: SearchResponse (jobs, provider breakdown)

    loop For each discovered job
        Service->>Scoring: score_job(job, candidate_profile)
        Scoring-->>Service: ATS score, match breakdown, strengths, gaps
        Service->>Repo: save_job(job) [Committed DB write]
        Service->>Repo: save_job_score(score) [Committed DB write]
    end

    Service-->>AdminOrCron: Summary metrics (discovered, qualified, rejected)
```

---

### 2. Multi-Portal Provider Registry & Endpoints

| Portal / Engine | Provider Class | Type / Endpoint | Fetching Mechanism |
| :--- | :--- | :--- | :--- |
| **LinkedIn** | `LinkedInProvider` | Public Guest API | `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search` (Extracts real company, title, location, apply URL) |
| **RemoteOK** | `RemoteOKProvider` | Live JSON API | `https://remoteok.com/api` (Tech & developer roles, salary ranges, tags) |
| **Arbeitnow** | `ArbeitnowProvider` | Live Board API | `https://www.arbeitnow.com/api/job-board-api` (European & Global tech postings) |
| **The Muse** | `TheMuseProvider` | Enterprise API | `https://www.themuse.com/api/public/jobs` (Verified enterprise tech postings: Google, Stripe, Uber) |
| **Remotive** | `RemotiveProvider` | Public Remote API | `https://remotive.com/api/remote-jobs` (Global remote software engineering feeds) |
| **Himalayas** | `HimalayasProvider` | Public Remote API | `https://himalayas.app/jobs/api` (Remote developer roles) |
| **Adzuna** | `AdzunaProvider` | Aggregator API | `https://api.adzuna.com/v1/api` (Aggregated Indeed/Monster/LinkedIn postings with API keys) |
| **Greenhouse** | `GreenhouseProvider` | Board API | `https://boards-api.greenhouse.io/v1/boards/{board}/jobs` (Enterprise ATS direct boards) |
| **Lever** | `LeverProvider` | Board API | `https://api.lever.co/v0/postings/{site}` (Enterprise ATS direct boards) |

---

### 3. Canonical Data Schema & Deduplication

#### Normalized Data Model (`NormalizedJob`)
Every job fetched from any provider is normalized into a standard Pydantic model:
- `source`: Provider identifier (`"linkedin"`, `"remoteok"`, `"arbeitnow"`, etc.)
- `source_job_id`: Native ID from the provider
- `title`: Job title (sanitized)
- `company`: Company name (sanitized)
- `location`: Plaintext location string
- `location_type`: Enum (`"remote"`, `"hybrid"`, `"onsite"`, `"unspecified"`)
- `employment_type`: Enum (`"full_time"`, `"contract"`, `"part_time"`, etc.)
- `salary_min` / `salary_max` / `salary_currency`: Extracted compensation
- `tech_stack`: List of extracted tech keywords (`["React", "TypeScript", "Next.js"]`)
- `job_url` / `apply_url`: Direct public application link
- `fingerprint`: SHA256 canonical hash

#### SHA256 Canonical Fingerprint Logic
```python
def generate_fingerprint(company: str, title: str, location: str) -> str:
    canonical = f"{company.strip().lower()}:{title.strip().lower()}:{location.strip().lower()}"
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
```

---

## ⚙️ Configuration Reference (`config.py` & `.env`)

### Dynamic Database Resolution

The MCP server and backend dynamically switch database targets:
- **Development**: Local PostgreSQL (`postgresql://postgres:postgres@127.0.0.1:5432/postgres`)
- **Production**: Supabase Cloud (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`)

```python
# MCPServerConfig dynamic database resolution
environment = os.getenv("ENVIRONMENT", "development")
is_production = environment.lower() == "production" or "supabase.co" in os.getenv("SUPABASE_URL", "")

database_url = os.getenv("DATABASE_URL") or (
    f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:{os.getenv('POSTGRES_PASSWORD', 'postgres')}@"
    f"{os.getenv('POSTGRES_HOST', '127.0.0.1')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'postgres')}"
)
```

### Provider Settings & Rate Limits

```python
# Provider Flags and Rate Limits (RPM)
remotive_enabled = True        # RPM: 30, Cache TTL: 1800s
himalayas_enabled = True       # RPM: 30, Cache TTL: 1800s
linkedin_enabled = True        # RPM: 15, Cache TTL: 900s
remoteok_enabled = True        # RPM: 20, Cache TTL: 1800s
arbeitnow_enabled = True       # RPM: 30, Cache TTL: 1800s
themuse_enabled = True         # RPM: 30, Cache TTL: 1800s
adzuna_enabled = False         # Requires adzuna_app_id & adzuna_api_key
greenhouse_enabled = True      # Scans enterprise target boards
lever_enabled = True           # Scans enterprise target sites
```

---

## 🛠️ 10 Standard MCP Tools

The Job Discovery MCP Server exposes the following standard tools:

1. `search_jobs(query, location, remote_only, limit, providers)`: Concurrent multi-portal search with rate-limiting and deduplication.
2. `get_job(source, source_job_id)`: Fetches full details for a single job by source ID.
3. `get_jobs(job_ids)`: Batch fetch by source:job_id pairs.
4. `get_new_jobs(since, limit)`: Delta sync for newly posted jobs.
5. `search_jobs_for_profile(profile, limit)`: Queries matching jobs based on candidate skills.
6. `get_provider_status()`: Real-time health, latency, error count, and circuit breaker states.
7. `refresh_job(source, source_job_id)`: Re-fetches a job to check if listing is still active.
8. `save_job(job)`: **Inert by architectural specification**. Database persistence is owned exclusively by `job_repository.py`.
9. `health_check()`: Server status, active providers, and memory metrics.
10. `search_companies(query, limit)`: Discovers hiring companies across all providers.

---

## 🗑️ Deletion & Retention Lifecycle

All delete paths for jobs execute **explicit PostgreSQL commits (`pg_conn.commit()`)** and cascade delete dependent evaluation records:

```python
# Single and bulk delete in job_repository.py
cur.execute("DELETE FROM job_scores WHERE job_id::text = %s;", (str(job_id),))
cur.execute("DELETE FROM job_source_records WHERE job_id::text = %s;", (str(job_id),))
cur.execute("DELETE FROM jobs WHERE id::text = %s;", (str(job_id),))
cur.execute("DELETE FROM job_listings WHERE id::text = %s;", (str(job_id),))
pg_conn.commit()
```

### Available Delete API Routes:
- `DELETE /api/v2/jobs/{job_id}`: Single hard delete.
- `POST /api/v2/jobs/bulk-delete {"ids": [...]}`: Batch delete (up to 500 IDs).
- `DELETE /api/v2/{pipeline}/{item_id}`: Generic lifecycle delete (`pipeline="jobs"`).
- `POST /api/v2/{pipeline}/bulk-delete`: Generic lifecycle bulk delete.
- `POST /api/v2/automation/retention-purge/{pipeline}`: Automated expiry purge based on configured retention days.

---

## 🚀 Key Operational Commands

```bash
# 1. Run MCP Server Unit Test Suite
python -m pytest backend/python/mcp/job_discovery/tests -v

# 2. Trigger End-to-End Multi-Portal Job Discovery
curl -X POST "http://localhost:8000/api/automation/jobs/discover" \
     -H "Content-Type: application/json" \
     -d '{"target_role": "Lead Frontend Architect"}'

# 3. View Discovered Jobs & HUD Metrics
curl -s "http://localhost:8000/api/v2/jobs/metrics"
curl -s "http://localhost:8000/api/v2/jobs?limit=10"
```
