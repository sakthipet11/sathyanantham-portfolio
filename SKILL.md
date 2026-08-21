---
name: portfolio-architect
description: Comprehensive architecture skill for operating and expanding Sathyanantham V's Multi-Agent Portfolio, Job Discovery MCP Server & Recruiter OS platform.
---

# Business Use Case: AI Job Search Copilot

## Problem

Job seekers — especially senior/lead-level professionals — spend hours manually searching multiple portals (Naukri, LinkedIn, Instahyre, etc.), rewriting resumes and cover letters for each role, and tracking applications in spreadsheets. Most listings turn out to be a poor fit only after the effort is already spent, and relevant postings get missed simply because no one checked that day.

## Solution

An autonomous AI agent that runs the entire job search loop on the user's behalf: discovers relevant openings across multiple platforms, scores them against the user's profile, generates a tailored resume and cover letter on demand, and — with explicit user confirmation — sends the application directly to the recruiter/HR contact. Everything is tracked automatically so nothing falls through the cracks.

## Target Users

- Active job seekers who want to save time on repetitive search/apply work
- Passive candidates who want to be notified only when a strong match appears
- Recruiters/agencies (future extension) who want a self-serve candidate-matching tool

## Core Value Proposition

- **Turns a multi-hour weekly chore into a single conversational request**
- **Tailored Applications**: Every application is tailored to the specific job, not a generic resume blast — improving response rates
- **Full Coverage**: Automated background cronjob scheduler catches new postings daily at configured schedule (e.g. 08:00 AM IST)
- **Full Visibility**: Every match, application, and recruiter reply is logged and searchable
- **Strict Rate-Limit Optimization**: Combines target roles & locations into 1 single HTTP request per discovery run

## Key Capabilities

1. **Job Discovery** — Live natural-language search via JSearch / Google for Jobs with saved user preferences (target roles, target locations, remote/hybrid, job recency, CTC band).
2. **Fit Scoring** — Dynamic ATS evaluation engine ranking listings against candidate experience (Skills %, Experience %, Title %) with zero key overlap between matched skills and gaps.
3. **Tailored Application Generation** — Resume + cover letter rewritten per job, downloadable instantly.
4. **Application Sending** — Drafts outreach email to HR/recruiter, previews it, and sends only after explicit user confirmation.
5. **Referral Discovery** — Surfaces 1st-degree connections at target companies to boost response odds.
6. **Recruiter Inbox** — Centralizes inbound recruiter messages so replies aren't scattered across email/LinkedIn.
7. **Application Tracking** — Real-time dashboard of every job touched, its match score HUD, status, and candidate evaluation metrics.

---

## 🎯 System Architecture Overview

The platform operates on a clean 4-tier decoupled architecture:

```
[ Frontend: Next.js 15 App Router ]  <-- NEXT_PUBLIC_API_URL -->  [ Backend: FastAPI (Python 3.12+) ]
  ├── Public Candidate Portfolio (React 19)                         ├── 6 Autonomous AI Agents
  └── Recruiter / Admin OS (/admin/*)                               ├── Job Discovery MCP Server (JSearch Live)
                                                                    └── Live Handoff & Visitor Telemetry
                                                                                   │
                                                                       [ Database & Cache Layer ]
                                                                        ├── PostgreSQL (Local) / Supabase (Prod)
                                                                        └── Redis / In-Memory TTL Cache
```

1. **Frontend (`app/`, `components/`, `lib/`)**: Next.js 15 App Router. Public portfolio (`ProjectsSection`, `ExperienceSection`, `SkillsMatrix`) and Admin OS (`/admin/dashboard`, `/admin/jobs`, `/admin/applications`, `/admin/resumes`, `/admin/referrals`, `/admin/recruiter-inbox`, `/admin/automation`, `/admin/retention`). All frontend API calls resolve dynamically through `getApiHost()` via `NEXT_PUBLIC_API_URL`.
2. **Backend Engine (`backend/python/`)**: FastAPI server housing 6 autonomous AI agents, OpenRouter / Gemini LLM evaluation, background cronjob scheduler loop, and WebSocket presence handoff.
3. **Job Discovery MCP Server (`backend/python/mcp/job_discovery/`)**: Official Model Context Protocol (MCP) server implementing live JSearch / Google for Jobs discovery via OpenWeb Ninja (`https://api.openwebninja.com/jsearch/search-v2`), rate limiting, deduplication, and canonical schema normalization.
4. **Database & Data Lifecycle Layer (`backend/python/repositories/`)**: Dual-engine persistence supporting Local PostgreSQL in development and Supabase in production with cascade transactions, `_normalize_score_details()` score key mappings, and automated retention purging.

---

## 🔍 Job Fetching & Discovery Engine

### 1. Job Fetching Logic Flow

```mermaid
sequenceDiagram
    autonumber
    actor AdminOrCron as Background Cronjob Scheduler / Admin UI
    participant Service as JobDiscoveryService
    participant MCP as JobDiscoveryMCPServer
    participant JSearch as JSearch Live Provider (OpenWeb Ninja)
    participant Dedup as DeduplicationService
    participant Scoring as JobScoringService (Dynamic ATS Engine)
    participant Repo as JobRepository (PostgreSQL / Supabase)

    AdminOrCron->>Service: POST /api/automation/jobs/discover {"queries": [...], "locations": [...]}
    Service->>Service: Combine roles & target locations into 1 unified query string
    Service->>MCP: search_jobs(combined_query, combined_location, remote_only, limit)
    
    Note over MCP,JSearch: Single Rate-Limit Efficient HTTP GET Call
    MCP->>JSearch: GET https://api.openwebninja.com/jsearch/search-v2 (query="Role1 OR Role2 in Loc1, Loc2")
    JSearch-->>MCP: Live raw Google for Jobs JSON response

    MCP->>MCP: Normalize to NormalizedJob schema
    MCP->>Dedup: filter_duplicates(jobs) using SHA256 Canonical Fingerprint
    Dedup-->>MCP: Deduplicated NormalizedJob list
    MCP-->>Service: SearchResponse (normalized jobs)

    loop For each discovered job
        Service->>Scoring: score_job(job, candidate_profile)
        Scoring-->>Service: Dynamic ATS score (skills %, exp %, title %), strengths, gaps
        Service->>Repo: save_job(job) [Committed DB write]
        Service->>Repo: save_job_score(score) [Committed DB write]
    end

    Service-->>AdminOrCron: Summary metrics (discovered, qualified, rejected)
```

---

### 2. Multi-Portal Provider Registry & Endpoints

| Portal / Engine | Provider Class | Type / Endpoint | Fetching Mechanism |
| :--- | :--- | :--- | :--- |
| **JSearch / Google for Jobs** | `JSearchProvider` | Live OpenWeb Ninja API | `https://api.openwebninja.com/jsearch/search-v2` or `https://jsearch.p.rapidapi.com/search` (Combines roles, locations, recency, remote preference, and employment types into 1 single call) |
| **LinkedIn** | `LinkedInProvider` | Public Guest API | `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search` |
| **RemoteOK** | `RemoteOKProvider` | Live JSON API | `https://remoteok.com/api` |
| **Arbeitnow** | `ArbeitnowProvider` | Live Board API | `https://www.arbeitnow.com/api/job-board-api` |
| **The Muse** | `TheMuseProvider` | Enterprise API | `https://www.themuse.com/api/public/jobs` |
| **Remotive** | `RemotiveProvider` | Public Remote API | `https://remotive.com/api/remote-jobs` |
| **Himalayas** | `HimalayasProvider` | Public Remote API | `https://himalayas.app/jobs/api` |

---

### 3. Canonical Data Schema & Deduplication

#### Normalized Data Model (`NormalizedJob`)

Every job fetched from any provider is normalized into a standard Pydantic model:

- `source`: Provider identifier (`"jsearch"`, `"linkedin"`, `"remoteok"`, etc.)
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

### Single-Call Rate-Limit Optimization

- **API Efficiency**: Discovery runs pool target roles (`unique_queries[:3]`) and user target locations into **EXACTLY 1 single JSearch HTTP request**.
- **No Extraneous Calls**: Unnecessary pre-search `health_check()` or per-job `get_job()` calls are omitted during discovery runs to preserve OpenWeb Ninja rate limits.

---

## 🛠️ 10 Standard MCP Tools

The Job Discovery MCP Server exposes the following standard tools:

1. `search_jobs(query, location, remote_only, limit, providers)`: Combined single-request multi-portal search with rate-limiting and deduplication.
2. `get_job(source, source_job_id)`: Fetches details for a single job by source ID from live API.
3. `get_jobs(job_ids)`: Batch fetch by source:job_id pairs.
4. `get_new_jobs(since, limit)`: Delta sync for newly posted jobs.
5. `search_jobs_for_profile(profile, limit)`: Queries matching jobs based on candidate skills.
6. `get_provider_status()`: Real-time health, latency, and error state tracking.
7. `refresh_job(source, source_job_id)`: Re-fetches a job to check if listing is still active.
8. `save_job(job)`: Database persistence owned exclusively by `job_repository.py`.
9. `health_check()`: Server status and active provider checks.
10. `search_companies(query, limit)`: Discovers hiring companies across providers.

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

### Available Delete API Routes

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
