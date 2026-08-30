# Enterprise Architectural Blueprint & Implementation Details

## Overview

This repository is structured as a production-grade **Multi-Agent Portfolio & Recruiter Operating System** platform. Next.js 15 App Router (`app/`, `components/`, `lib/`, `hooks/`, `public/`) lives at the root without wrapping subfolders. The Python AI Multi-Agent engine lives in `backend/python/`, supported by `database/` and `docs/`.

All data points across the portfolio (projects, experience, skills, candidate profile) and Recruiter OS (jobs, applications, referrals, connections, emails, analytics) query live database records via PostgreSQL (`postgresql://postgres:postgres@127.0.0.1:5432/postgres`) in development or Supabase Cloud in production.

**Key Stats:**
- **17 API Routers**: Complete REST API coverage including autonomous auto-apply
- **33 Service Modules**: Job discovery, referral automation, email intelligence, contact enrichment, document generation, Playwright browser engine, form mapping cache, queue processor, GDrive sync
- **8 Repository Layers**: Clean data access with PostgreSQL/Supabase dual support and deduplicated queries
- **11 Admin Pages**: Full-featured Recruiter OS interface with responsive mobile viewports
- **8 Database Migrations**: Version-controlled schema evolution up through `008_auto_apply_schema.sql`
- **11 Pytest Suites & 28 Playwright E2E Tests**: Comprehensive test coverage across public flows, 11 admin screens, mobile viewports, and API resilience

---

## 📁 Repository Folder Structure

```
Sathyanantham-AI-Studio/
│
├── .claude/                             # Claude Code Configuration
│   └── settings.json                    # Hooks, permissions (beforeRead hook blocks .env files)
│
├── app/                                 # Next.js 15 App Router (Direct Root Level)
│   ├── page.tsx                         # Main Interactive Portfolio & AI Digital Twin Landing
│   ├── layout.tsx                       # Root Layout & Font/Theme Providers
│   ├── loading.tsx                      # Root Suspense loading fallback
│   ├── error.tsx                        # Root React client error boundary
│   ├── not-found.tsx                    # Root branded 404 handler
│   ├── globals.css                      # Global Tailwind CSS Styles
│   ├── api/                             # Next.js API Proxy Routes
│   │   ├── portfolio/                   # DB Portfolio Endpoints (/projects, /experience, /skills)
│   │   └── admin/                       # Admin Proxy Routes (/gdrive-sync/run, /gdrive-sync/upload)
│   └── admin/                           # Recruiter OS & Admin Command Center (11 Pages)
│       ├── page.tsx                     # Admin Landing / Core Telemetry
│       ├── dashboard/page.tsx           # Executive Control Center (10 KPIs & 9-Stage Pipeline)
│       ├── analytics/page.tsx           # Real-Time Telemetry Hub (14-Day Charts, Activity Feed)
│       ├── jobs/page.tsx                # Job Discovery, ATS Radar & 1-Click Staging UI
│       ├── applications/page.tsx        # Application Pipeline Tracker & Automation Batches
│       ├── referrals/page.tsx           # Referral Review & Dispatch Center (Human Gate)
│       ├── connections/page.tsx         # LinkedIn Network Management (731 Contacts, 7 Columns)
│       ├── recruiter-inbox/page.tsx     # Live Visitor Handoff & Recruiter Chat
│       ├── resumes/page.tsx             # Resume Version Manager & GDrive Sync
│       ├── automation/page.tsx          # Workflow Automation & Retention Policies
│       ├── agent/page.tsx               # AI Job Copilot Chatbot
│       └── settings/page.tsx            # Candidate Profile, API Keys & Configuration
│
├── components/                          # UI Component Modules
│   ├── admin/                           # Admin-specific components (BulkActionBar, ProgressModal)
│   ├── ai/                              # AI Twin, chat components
│   ├── canvas/                          # 3D graphics, animations
│   ├── layout/                          # Layout components (headers, sidebars)
│   ├── providers/                       # Context providers
│   ├── sections/                        # Portfolio sections (7 components)
│   │   ├── HeroSection.tsx
│   │   ├── ProjectsSection.tsx
│   │   ├── ExperienceSection.tsx
│   │   ├── SkillsMatrix.tsx
│   │   ├── LiveHandoffSection.tsx
│   │   ├── CoverLetterSection.tsx
│   │   └── TechMarquee.tsx
│   └── ui/                              # Reusable UI primitives (GlobalErrorFallback, NotFound, etc.)
│
├── lib/                                 # Shared Utilities & Configuration
│   ├── api.ts                           # getApiHost() dynamic resolver & resilient fetchApi<T>()
│   ├── supabase.ts                      # Supabase client
│   └── utils.ts                         # Helper functions
│
├── hooks/                               # Custom React Hooks
│   ├── useAITwin.ts
│   ├── useApiError.ts                   # Resilient async state manager with retry callbacks
│   ├── useScrollReveal.ts
│   ├── useReducedMotion.ts
│   └── useLockBodyScroll.ts
│
├── public/                              # Public Static Assets
│   ├── downloads/                       # Tailored Resume PDFs & Screenshots
│   │   ├── Sathyanantham_V_Frontend_Architect_2026.pdf
│   │   ├── apply_screenshots/           # Live browser automation audit screenshots
│   │   └── cover_letters/               # Generated candidate-grounded cover letters
│   └── avatar.jpg
│
├── backend/                             # Python Backend Engine
│   └── python/
│       ├── main.py                      # FastAPI v2.0.0 Entry Point (WebSockets, Routes, Startup)
│       ├── requirements.txt             # Python Dependencies
│       │
│       ├── api/                         # 17 API Routers
│       │   ├── admin.py                 # Admin utilities (/api/admin/*)
│       │   ├── analytics.py             # Live telemetry & metrics (/api/v2/analytics/*)
│       │   ├── applications.py          # Application pipeline (/api/v2/applications/*)
│       │   ├── auto_apply.py            # Autonomous batch auto-apply (/api/v2/applications/*)
│       │   ├── chat.py                  # AI Twin chat (/api/chat/*)
│       │   ├── connections.py           # LinkedIn network (/api/v2/connections/*)
│       │   ├── contact.py               # Contact form (/api/contact)
│       │   ├── control_center.py        # Executive dashboard (/api/v2/control-center/*)
│       │   ├── copilot.py               # AI job copilot (/api/v2/copilot/*)
│       │   ├── data_lifecycle.py        # Retention policies (/api/v2/data-lifecycle/*)
│       │   ├── hardening.py             # Security & validation (/api/v2/hardening/*)
│       │   ├── jobs.py                  # Job listings v1 (/api/jobs/*)
│       │   ├── jobs_v2.py               # Job discovery v2 (/api/v2/jobs/*)
│       │   ├── portfolio.py             # Portfolio data (/api/portfolio/*)
│       │   ├── recruiter_inbox.py       # Live handoff chat (/api/v2/recruiter-inbox/*)
│       │   ├── referrals.py             # Referral management (/api/v2/referrals/*)
│       │   └── resumes.py               # Resume versions (/api/v2/resumes/*)
│       │
│       ├── services/                    # 33 Service Modules
│       │   ├── ai_job_copilot_service.py          # Interactive AI copilot assistant
│       │   ├── ai_providers.py                    # Centralized LLM provider (NVIDIA/Gemini)
│       │   ├── apify_recruiter_service.py         # Apify Google Maps contact scraper
│       │   ├── application_automation_service.py  # Application workflow automation
│       │   ├── application_queue_service.py       # Multi-job auto-apply batch orchestration
│       │   ├── audit_governance_service.py        # Security audit & compliance
│       │   ├── candidate_profile_service.py       # Candidate truth store management
│       │   ├── company_normalization_service.py   # Legal entity & alias normalizer
│       │   ├── cover_letter_service.py            # Candidate-grounded cover letter generator
│       │   ├── email_classification_service.py    # Email intent classification & parsing
│       │   ├── form_mapping_service.py            # LLM semantic form selector mapper
│       │   ├── gdrive_sync_scheduler.py           # Background GDrive sync scheduler
│       │   ├── gdrive_sync_service.py             # Google Drive API integration
│       │   ├── gmail_mcp_client.py                # Multi-attachment SMTP client
│       │   ├── job_deduplication_service.py       # Cross-provider job deduplication
│       │   ├── job_discovery_service.py           # Multi-provider job discovery orchestrator
│       │   ├── job_normalization_service.py       # Job data normalization & enrichment
│       │   ├── job_scoring_service.py             # ATS scoring engine
│       │   ├── kill_switch_service.py             # Emergency automation kill switch
│       │   ├── linkedin_contact_service.py        # LinkedIn network processing
│       │   ├── notifications.py                   # Notification dispatch system
│       │   ├── playwright_automation_service.py   # Headless browser automation & stealth
│       │   ├── portal_mapping_cache_service.py    # Form signature cache with stats
│       │   ├── prompt_security_service.py         # Prompt injection defense
│       │   ├── rag_service.py                     # RAG knowledge base (kb)
│       │   ├── recruiter_automation_service.py    # Recruiter workflow automation
│       │   ├── referral_discovery_service.py      # Job-first ATS ≥90% referral engine
│       │   ├── referral_messaging_service.py      # Personalized outreach copy generator
│       │   ├── referral_ranking_service.py        # Referral priority scoring
│       │   ├── resilience_service.py              # Retry, circuit breaker, fallbacks
│       │   ├── resume_matching_service.py         # Resume-to-job matching algorithms
│       │   ├── retention_service.py               # Data lifecycle management
│       │   ├── website_contacts_enrichment_service.py # Website contact discovery
│       │   └── websocket_service.py               # WebSocket connection manager (ws_manager)
│       │
│       ├── repositories/                # Database Layer Abstractions (8 Repos)
│       │   ├── application_repository.py  # Applications & application_events (PostgreSQL)
│       │   ├── application_v2_repository.py # V2 deduplicated applications repository
│       │   ├── connection_repository.py   # 7-column connections + CSV ingestion
│       │   ├── email_repository.py        # Email storage & classification results
│       │   ├── job_repository.py          # Jobs & job_scores queries
│       │   ├── referral_repository.py     # Referral campaigns with committed transactions
│       │   ├── resume_repository.py       # Resume versions & GDrive sync metadata
│       │   ├── retention_repository.py    # Data lifecycle & retention policies
│       │   └── supabase_repo.py           # Core DB helper (PostgreSQL/Supabase dual support)
│       │
│       └── tests/                       # Automated Test Suites (11 Test Files)
│           ├── test_automated_referral_pipeline.py  # 7-step referral pipeline
│           ├── test_connections_pipeline.py         # Connections & referral flow (5/5)
│           ├── test_gdrive_sync.py                  # Google Drive sync
│           ├── test_jsearch_provider.py             # JSearch API integration
│           ├── test_phase1_pipeline.py              # Job discovery
│           ├── test_phase3_automation.py            # Application automation
│           ├── test_phase4_email_automation.py      # Email classification
│           ├── test_phase5_referral_discovery.py    # Referral discovery
│           ├── test_phase6_control_center.py        # Control center APIs
│           ├── test_phase7_hardening.py             # Security hardening
│           └── test_phase8_copilot.py               # AI copilot service
│
├── database/                            # Database Layer
│   ├── setup_local_db.py                # Automated migration execution script
│   └── migrations/                      # SQL Migrations (8 Files)
│       ├── 001_initial_schema.sql       # Profiles, skills, projects, experience, chat, analytics
│       ├── 002_multi_agent_tables.sql   # Jobs, evaluations, applications, referrals
│       ├── 003_job_automation_schema.sql # V2 multi-agent recruiter OS schema
│       ├── 004_retention_policies.sql   # Data lifecycle management
│       ├── 005_job_discovery_mcp_support.sql # MCP server integration
│       ├── 006_job_discovery_settings_and_matching.sql # Job settings & matching
│       ├── 006_recruiter_inbox_production.sql # Live chat & handoff
│       ├── 007_connections_and_referral_enrichment.sql # 7-column connection schema
│       └── 008_auto_apply_schema.sql    # Autonomous batch apply, mappings, screenshots
│
├── e2e/                                 # Playwright E2E Test Suite (28 Tests)
│   ├── public/public-flows.spec.ts      # Public portfolio tests
│   ├── admin/admin-flows.spec.ts        # Admin authentication & drawer navigation
│   ├── visual/responsive.spec.ts        # Responsive zero-overflow validation (11 screens)
│   ├── api-errors/api-fallback.spec.ts  # API error boundary resilience
│   └── error-handling/error-boundary.spec.ts # Root 404 and error boundaries
│
├── docs/                                # Project Documentation & Assets
│   ├── Connections.csv                  # 731-Row LinkedIn Network Export
│   ├── IMPLEMENTATION_COMPLETE.md       # Master implementation status & architecture
│   ├── auto-apply-architecture.md       # 30-page auto-apply specification
│   └── images/                          # Visual execution & audit screenshots
│       ├── auto_apply_form_filling_sample.png
│       ├── auto_apply_resume_upload_sample.png
│       └── auto_apply_portal_auth_sample.png
│
├── SKILL.md                             # Architectural skill documentation
├── README.md                            # Project overview & setup guide
├── implementation_details.md            # This file - technical implementation details
├── package.json                         # Frontend dependencies (Next.js, React, Playwright)
├── tsconfig.json                        # TypeScript configuration
├── tailwind.config.ts                   # Tailwind CSS configuration
└── next.config.mjs                      # Next.js configuration
```

---

## 🤝 Key Implementation Details

### 1. 100% Dynamic Telemetry & Analytics Hub

- **Endpoint**: `GET /api/v2/analytics/overview` ([backend/python/api/analytics.py](backend/python/api/analytics.py))
- **Zero Static Numbers**: All metrics computed from live database queries
- **Metrics Computed**:
  - **Portfolio Metrics**: `portfolio_views`, `unique_visitors`, `views_growth_percent` (30-day), `resume_downloads`, `conversion_rate_percent`
  - **AI Twin Metrics**: `ai_twin_conversations`, `ai_twin_messages`, `avg_messages_per_conversation`
  - **Job Search Metrics**: `total_jobs_analyzed`, `average_ats_fit`, `high_match_jobs_90_plus`, `active_applications`
  - **Network Metrics**: `active_referral_campaigns`, `total_network_connections`, `total_emails_processed`
  - **Demographics**: `device_breakdown` (Desktop/Mobile %), `top_locations` (city/country aggregates)
  - **Time Series**: `daily_activity` (14-day timeseries: views, chats, job matches)
  - **Live Feed**: `recent_events` (latest 8 events with browser, OS, timestamp)
- **Data Sources**: Aggregates from `visitor_events`, `chat_sessions`, `chat_messages`, `jobs`, `applications`, `referrals`, `connections`, `emails` tables
- **Frontend Integration**: `/admin/dashboard` and `/admin/analytics` consume this endpoint with no fallback values

### 2. Multi-Provider Job Discovery Engine

- **Providers**: JSearch API, Naukri scraper, LinkedIn Jobs, Instahyre
- **Orchestration**: `job_discovery_service.py` coordinates multi-provider queries
- **Deduplication**: `job_deduplication_service.py` identifies duplicates across providers using company name, title, and location fuzzy matching
- **Normalization**: `job_normalization_service.py` standardizes job data format, salary ranges, experience levels
- **ATS Scoring**: `job_scoring_service.py` + `resume_matching_service.py` score each job against candidate profile (0-100 scale)
- **Storage**: Jobs stored in `jobs` table, scores in `job_scores` table with `pg_conn.commit()` on write
- **Query Pattern**: Frontend queries `/api/v2/jobs?min_score=90` to get high-fit jobs without re-running scrapers

### 3. Job-First Referral Discovery & Contact Matching

- **Trigger**: `POST /api/v2/referrals/discover?threshold=90`
- **Source**: Queries local Job DB directly via `job_repository.list_jobs(limit=200)` without external scraper calls
- **Company Normalization**: `company_normalization_service.py` strips suffixes (Inc, LLC, Corp) and resolves aliases
  - Example: `Google LLC` → `Google`, `Figma Inc` → `Figma`
- **1st-Degree Priority**: Queries `connections` table for warm LinkedIn contacts via `connection_repository.match_1st_degree_contact(company)`
- **Apify Fallback**: When no 1st-degree match exists, queries `lukaskrivka/google-maps-with-contact-details`:
  ```python
  search_terms = [f"{company} office {location.split(',')[0]}" for company in companies]
  ```
- **7 Connection Columns**:
  1. `First Name` - Contact given name (or "Talent"/"Hiring")
  2. `Last Name` - Contact family name (or "Acquisition Team")
  3. `URL` - LinkedIn profile or company website
  4. `Email Address` - Verified scraped email
  5. `Company` - Normalized company name
  6. `Position` - Contact title
  7. `Connected On` - Formatted date (e.g., "23 Aug 2026")
- **Parallel Generation**: Uses `asyncio.gather` to concurrently generate:
  - Tailored cover letter via `cover_letter_service.py`
  - Physical PDF resume from `public/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf`
- **Transaction Safety**: Explicit `pg_conn.commit()` in `referral_repository.py` with UUID validation
- **Human Review Gate**: Referrals stored as `READY_FOR_REVIEW` status, displayed on `/admin/referrals`
- **Dispatch**: One-click approval triggers `gmail_mcp_client.send_message()` with both attachments, updates status to `SENT`, sets `follow_up_due_at` to +5 days

### 4. Email Classification & Auto-Response

- **Service**: `email_classification_service.py` uses LLM to classify recruiter emails
- **Categories**: `JOB_OPPORTUNITY`, `INTERVIEW_INVITE`, `REJECTION`, `FOLLOW_UP`, `SPAM`, `OTHER`
- **Extraction**: Pulls company name, position, salary range, location from unstructured email text
- **Storage**: Results saved to `emails` table via `email_repository.py`
- **Auto-Response**: Generates context-aware draft responses for `JOB_OPPORTUNITY` and `INTERVIEW_INVITE` categories
- **Integration**: `/admin/recruiter-inbox` displays classified emails with one-click response options

### 5. Application Pipeline & Automation

- **9-Stage Pipeline**: 
  1. Discovered
  2. Saved
  3. Applied
  4. Screening
  5. Interview
  6. Technical Assessment
  7. Final Round
  8. Offer
  9. Rejected/Archived
- **Repository**: `application_repository.py` with `application_events` for audit trail
- **Automation**: `application_automation_service.py` handles:
  - Auto-status updates based on email classification
  - Follow-up scheduling (3 days, 7 days, 14 days)
  - Stale application detection (>30 days no activity)
- **Control Center**: `/admin/dashboard` displays pipeline distribution via `/api/v2/control-center/pipeline`

### 6. Resume Version Management & GDrive Sync

- **Service**: `gdrive_sync_service.py` + `gdrive_sync_scheduler.py`
- **Storage**: `resume_repository.py` tracks versions, GDrive file IDs, sync status
- **Scheduler**: Background APScheduler job syncs resume versions to Google Drive every 6 hours
- **Version Strategy**: Maintains multiple resume variants (Frontend Engineer, Full-Stack, Architect) as separate PDFs
- **Frontend**: `/admin/resumes` allows upload, version selection, manual GDrive sync trigger

### 7. AI Job Copilot

- **Service**: `ai_job_copilot_service.py`
- **Provider**: Centralized LLM via `ai_providers.py` (NVIDIA NIM or Gemini)
- **Capabilities**:
  - Job search query assistance
  - Resume tailoring suggestions
  - Cover letter drafting
  - Interview preparation
  - Salary negotiation guidance
- **Context**: Accesses candidate profile, active jobs, applications, referrals for grounded responses
- **Interface**: `/admin/agent` chat UI with streaming responses

### 8. Security & Hardening

- **Services**:
  - `prompt_security_service.py` - Defends against prompt injection attacks
  - `audit_governance_service.py` - Logs security events, compliance checks
  - `kill_switch_service.py` - Emergency automation shutdown
  - `resilience_service.py` - Retry logic, circuit breakers, fallbacks
- **API**: `hardening.py` router provides `/api/v2/hardening/*` endpoints for security controls
- **Rate Limiting**: Per-IP rate limits on all public endpoints
- **Input Validation**: Zod schemas + Pydantic models for all API inputs
- **Environment**: `.claude/settings.json` beforeRead hook blocks accidental `.env` file reads

### 9. Autonomous Multi-Job Auto-Apply Engine

- **Components**:
  - `playwright_automation_service.py` (534 lines): Headless Playwright engine with anti-detection stealth arguments, custom viewport geometry, file uploads, CAPTCHA/login-wall detection, and audit screenshot capture.
  - `form_mapping_service.py` (328 lines): LLM-driven semantic DOM parser mapping field selectors to candidate profile fields, backed by 70+ heuristic regex patterns.
  - `portal_mapping_cache_service.py` (297 lines): Persistent database cache (`portal_form_mappings` table) with auto-deprecation upon portal DOM structure drift.
  - `application_queue_service.py` (711 lines): Batch application coordinator with asynchronous `asyncio` loop, portal-specific rate limiting (Greenhouse: 30s, Lever: 20s, Workday: 60s), exponential backoff retries, and status broadcasting.
- **Auto-Apply API Endpoints** (`backend/python/api/auto_apply.py`):
  - `POST /api/v2/applications/bulk-prepare`: Creates batch and queues target applications.
  - `POST /api/v2/applications/auto-apply`: Starts processing queued applications asynchronously.
  - `GET /api/v2/applications/batch/{batch_id}/status`: Polled by UI modal for live batch progress.
  - `POST /api/v2/applications/{app_id}/retry`: Retries failed applications with exponential backoff.
  - `GET /api/v2/applications/{app_id}/screenshot`: Retrieves audit trail screenshot.
  - `DELETE /api/v2/applications/batch/{batch_id}`: Cancels running batch execution.
  - `GET /api/v2/applications/portal-mappings/stats`: Returns cache hit rate and domain reliability metrics.

### 10. Live Execution & Audit Screenshots

The automation pipeline stores full-resolution screenshots during every step of browser execution to ensure safety, auditability, and validation of candidate data entry.

#### A. Automated Field Filling & Verification
Demonstrating live semantic mapping and input population on Instahyre:

![Live Auto-Apply Form Filling Sample](docs/images/auto_apply_form_filling_sample.png)
*Figure 1: Live Playwright automation mapping candidate name, email, and programmatically verifying terms agreement.*

#### B. Document Upload & Resume Parsing
Demonstrating automated PDF resume attachment to a modal application form:

![Live Auto-Apply Resume Upload Sample](docs/images/auto_apply_resume_upload_sample.png)
*Figure 2: Automatic selection and multi-part upload of candidate tailored PDF resume.*

#### C. Authentication & Login Wall Gating
Demonstrating safe detection of portal auth boundaries at hirist.tech:

![Live Auto-Apply Portal Auth Gating Sample](docs/images/auto_apply_portal_auth_sample.png)
*Figure 3: Safe gate detection when credential or OTP authentication is required, marking the status as NEEDS_REVIEW.*

### 11. Selective Discovery Staging & Deduplicated Applications

- **Selective Staging Rule**:
  - **ATS Match Score $\ge 75\%$**: Automatically qualifies as `QUALIFIED` and auto-stages directly into `applications_v2` in `READY_FOR_REVIEW` status, paired with a tailored resume variant and cover letter.
  - **ATS Match Score $< 75\%$**: Retained in `jobs` table in `READY_FOR_REVIEW` without polluting the applications queue, granting discretionary review to the candidate.
- **Interactive 1-Click Staging UI** (`app/admin/jobs/page.tsx` & Radar Modal):
  - Unstaged jobs display an active **Stage** button.
  - Upon staging, the button transitions dynamically to a disabled **Staged** state (`<CheckCircle2 /> Staged`) to prevent duplicate submissions.
- **Deduplication Engine** (`backend/python/repositories/application_v2_repository.py`):
  - Employs PostgreSQL `DISTINCT ON (job_id)` with `evaluated_at DESC` to ensure zero duplicated records.
  - Deprecated legacy all-jobs fallback in `/api/v2/applications` so only staged applications appear.

### 12. Google Drive Spreadsheet & Resume Cloud Sync Engine

- **Service Module**: `backend/python/services/gdrive_sync_service.py`
- **Scheduler**: `backend/python/services/gdrive_sync_scheduler.py`
- **Admin Endpoints**:
  - `POST /api/admin/gdrive-sync/run`: Triggers immediate background synchronization.
  - `POST /api/admin/gdrive-sync/upload`: Direct upload of files to Google Drive.
- **Capabilities**:
  - Automatically exports and uploads formatted daily job tracker spreadsheets (`job_tracker_YYYY-MM-DD.xlsx`).
  - Synchronizes physical PDF resumes directly to configured Google Drive folder (`GOOGLE_DRIVE_FOLDER_ID`).
  - Performs MIME type conversion, credentials validation, and audit logging via `audit_governance_service.py`.

### 13. Resilient UI Architecture & Playwright E2E Suite (28 Tests)

- **Frontend Resilience**:
  - Root special pages: `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`.
  - Reusable UI primitives: `GlobalErrorFallback.tsx`, `NotFound.tsx`, `LoadingSpinner.tsx`, `LoadingFallback.tsx`.
  - Resilient API layer: `lib/api.ts` (`fetchApi<T>()` with timeout and fallback) and `hooks/useApiError.ts`.
- **E2E Test Suite (28 Tests Passing across Desktop & Mobile)**:
  - Validates zero horizontal scroll overflow (`scrollWidth <= clientWidth`) on mobile (`375px`) across public portfolio, login console, and all 11 admin screens (`/admin/dashboard`, `/admin/jobs`, `/admin/applications`, `/admin/recruiter-inbox`, `/admin/connections`, `/admin/referrals`, `/admin/resumes`, `/admin/automation`, `/admin/agent`, `/admin/analytics`, `/admin/settings`).
  - Validates public flows, AI Twin interactive queries, admin passkey auth, drawer navigation, and API error boundaries.

---

## ⚡ Execution & Verification Commands

### Development Servers

```bash
# Backend Server (FastAPI v2.0.0 on Port 8000)
python -m uvicorn backend.python.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend Server (Next.js 15 on Port 3000)
npm run dev

# API Documentation
# http://127.0.0.1:8000/docs (Swagger UI)
# http://127.0.0.1:8000/ (Health check)
```

### Test Suites (11 Files)

```bash
# Connections & Referral Pipeline (5/5 passing)
python -m pytest backend/python/tests/test_connections_pipeline.py -v

# Automated Referral Pipeline (7 steps)
python -m pytest backend/python/tests/test_automated_referral_pipeline.py -v

# Phase-Specific Tests
python -m pytest backend/python/tests/test_phase1_pipeline.py -v       # Job discovery
python -m pytest backend/python/tests/test_phase3_automation.py -v     # Application automation
python -m pytest backend/python/tests/test_phase4_email_automation.py -v # Email classification
python -m pytest backend/python/tests/test_phase5_referral_discovery.py -v # Referral discovery
python -m pytest backend/python/tests/test_phase6_control_center.py -v # Control center
python -m pytest backend/python/tests/test_phase7_hardening.py -v      # Security
python -m pytest backend/python/tests/test_phase8_copilot.py -v        # AI copilot

# Integration Tests
python -m pytest backend/python/tests/test_gdrive_sync.py -v           # GDrive sync
python -m pytest backend/python/tests/test_jsearch_provider.py -v      # JSearch API

# Run all tests
python -m pytest backend/python/tests/ -v
```

### Key API Endpoints

```bash
# Analytics & Telemetry
curl "http://127.0.0.1:8000/api/v2/analytics/overview"

# Job Discovery & Scoring
curl "http://127.0.0.1:8000/api/v2/jobs?min_score=90"
curl "http://127.0.0.1:8000/api/v2/jobs?provider=jsearch&location=Bengaluru"

# Referral Discovery
curl -X POST "http://127.0.0.1:8000/api/v2/referrals/discover?threshold=90"
curl "http://127.0.0.1:8000/api/v2/referrals"

# LinkedIn Network
curl "http://127.0.0.1:8000/api/v2/connections"
curl "http://127.0.0.1:8000/api/v2/connections?degree=1ST_DEGREE"

# Application Pipeline
curl "http://127.0.0.1:8000/api/v2/applications"
curl "http://127.0.0.1:8000/api/v2/applications/{id}/events"

# Control Center
curl "http://127.0.0.1:8000/api/v2/control-center/pipeline"
curl "http://127.0.0.1:8000/api/v2/control-center/dashboard"

# Portfolio Data (Dynamic from DB)
curl "http://127.0.0.1:8000/api/portfolio/projects"
curl "http://127.0.0.1:8000/api/portfolio/experience"
curl "http://127.0.0.1:8000/api/portfolio/skills"
curl "http://127.0.0.1:8000/api/portfolio/profile"

# AI Copilot
curl -X POST "http://127.0.0.1:8000/api/v2/copilot/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Find frontend engineer jobs in Bengaluru"}'
```

### Database Operations

```bash
# Run migrations
python database/setup_local_db.py

# Connect to local PostgreSQL
psql postgresql://postgres:postgres@127.0.0.1:5432/postgres

# Useful queries
SELECT COUNT(*) FROM jobs WHERE ats_score >= 90;
SELECT COUNT(*) FROM connections WHERE degree = '1ST_DEGREE';
SELECT status, COUNT(*) FROM applications GROUP BY status;
SELECT COUNT(*) FROM referrals WHERE status = 'READY_FOR_REVIEW';
```

---

## 🔧 Environment Variables Reference

### Required Variables

```env
# Backend Server
PORT=8000
HOST=127.0.0.1
ENVIRONMENT=development  # or production

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000  # Backend URL

# Database (choose one)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres  # Local
SUPABASE_URL=https://your-project.supabase.co                        # Or Supabase
SUPABASE_SECRET_KEY=your_supabase_secret_key

# LLM Provider (choose one)
NVIDIA_API_KEY=your_nvidia_api_key    # NVIDIA NIM
GEMINI_API_KEY=your_gemini_api_key    # Or Google Gemini

# Job Discovery
JSEARCH_API_KEY=your_jsearch_api_key              # Optional: JSearch provider
APIFY_API_TOKEN=your_apify_api_token              # Required for contact discovery

# Email & Communication
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password        # Gmail app password (not account password)

# Google Drive (for resume sync)
GOOGLE_DRIVE_CREDENTIALS_JSON=/path/to/credentials.json
GOOGLE_DRIVE_FOLDER_ID=your_gdrive_folder_id      # Optional
```

### Optional Variables

```env
# Redis Cache
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60

# Feature Flags
ENABLE_AUTO_REFERRAL=false      # Disable auto-referral discovery
ENABLE_EMAIL_AUTO_RESPONSE=true # Enable email auto-responses
ENABLE_GDRIVE_SYNC=true         # Enable GDrive background sync
```

---

## 📝 Additional Notes

### Security Best Practices

1. **Never commit `.env` files**: `.claude/settings.json` includes a `beforeRead` hook to prevent accidental `.env` exposure
2. **Use app passwords**: Gmail integration requires app-specific password, not account password
3. **API key rotation**: Rotate external service API keys every 90 days
4. **Database access**: Use read-only credentials for analytics queries when possible
5. **CORS configuration**: Update `allow_origins` in `main.py` for production deployment

### Performance Optimization

1. **Database indexing**: All foreign keys and frequently queried fields have indexes
2. **Connection pooling**: PostgreSQL connection pool configured in `supabase_repo.py`
3. **Caching strategy**: Redis cache for expensive LLM responses and job discovery results
4. **Parallel processing**: `asyncio.gather` used for concurrent document generation
5. **Query optimization**: Use `limit` parameters on all list endpoints

### Deployment Considerations

1. **Database migrations**: Run `database/setup_local_db.py` before first deployment
2. **Environment variables**: Set all required env vars in production environment
3. **Static assets**: Next.js automatically optimizes images and fonts
4. **Background jobs**: GDrive sync scheduler starts automatically on FastAPI startup
5. **WebSocket support**: Ensure hosting platform supports WebSocket connections for live chat

### Known Limitations

1. **Multi-provider rate limits**: Each job discovery provider has its own rate limits
2. **Email classification accuracy**: LLM-based classification may require manual review for edge cases
3. **GDrive sync frequency**: Currently set to 6 hours, configurable in `gdrive_sync_scheduler.py`
4. **Connection CSV format**: Must match exact 7-column format for successful ingestion
5. **ATS scoring**: Scoring algorithm optimized for tech roles, may need tuning for other industries
