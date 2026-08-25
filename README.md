# Sathyanantham V — Enterprise AI Studio & Autonomous Job Search Copilot

> **Multi-Agent Portfolio, Recruiter OS, and Autonomous AI Job Discovery & Referral Execution Platform**

---

## 🎯 Business Use Case: AI Job Search Copilot

### Problem

Job seekers — especially senior/lead-level professionals — spend hours manually searching multiple portals (Naukri, LinkedIn, Instahyre, etc.), rewriting resumes and cover letters for each role, filling repetitive multi-page application forms, tracking applications in spreadsheets, manually hunting for employee referrals, and responding to recruiter emails. Most listings turn out to be a poor fit only after the effort is already spent, and warm networking leads are left uncontacted.

### Solution

An autonomous AI agent platform that runs the entire job search, referral loop, and auto-application lifecycle on the candidate's behalf:

1. **Multi-Provider Job Discovery**: Discovers relevant openings across JSearch, Naukri, LinkedIn, and Instahyre, with automated deduplication and normalization.
2. **ATS Scoring Engine**: Scores jobs against the candidate profile (ATS ≥ 90%) using advanced resume matching algorithms.
3. **1st-Degree Network Matching**: Matches warm connections from the candidate's 731-row LinkedIn network stored in the local database.
4. **Apify Contact Discovery**: Falls back to Apify Google Maps (`lukaskrivka/google-maps-with-contact-details`) for verified corporate emails and HR contacts when no warm connection exists.
5. **Parallel Document Generation**: Generates tailored PDF resumes (`public/downloads/`) and candidate-grounded cover letters concurrently via `asyncio.gather`.
6. **Autonomous Multi-Job Auto-Apply**: Headless Playwright browser automation + LLM-powered dynamic form mapping (Greenhouse, Lever, Workday, Ashby, custom portals) with rate limiting, retry backoff, and screenshot audit trails.
7. **Email Intelligence**: Automatically classifies incoming recruiter emails and generates AI-powered response drafts.
8. **Application Pipeline**: Tracks applications through a 9-stage pipeline with automated status updates and follow-up scheduling.
9. **Human Review Gate**: Centralized approval gate on `/admin/referrals` before dispatching multi-attachment referral packages via Gmail SMTP with 5-day follow-up tracking.
10. **Resume Version Management**: Multi-version resume system with Google Drive sync for tailored PDFs per job category.
11. **Live Analytics Dashboard**: Real-time telemetry showing portfolio views, AI conversations, job matches, and network activity.
12. **Resilient UI Architecture**: Next.js App Router root special files (`loading.tsx`, `error.tsx`, `not-found.tsx`), branded error fallbacks (`GlobalErrorFallback`), and opt-in API resilience.

---

## 🏗️ System Architecture

The platform operates on a clean, 4-tier decoupled architecture:

```
[ Frontend: Next.js 15 App Router ]  <-- NEXT_PUBLIC_API_URL -->  [ Backend: FastAPI v2.0.0 (Python 3.12 / 3.14) ]
  ├── Public Candidate Portfolio (React 19)                         ├── 17 API Routers
  │   ├── Hero with AI Twin                                         ├── 33 Service Modules
  │   ├── Live Handoff Section                                      ├── 8 Repository Layers
  │   ├── Projects, Experience, Skills                              ├── Autonomous Auto-Apply Engine
  │   ├── Global Error Fallback & Branded 404                       ├── Multi-Provider Job Discovery
  │   └── Opt-in Resilient API Layer (lib/api.ts)                   ├── ATS Scoring & Matching Engine
  │                                                                  ├── Email Classification & Auto-Response
  └── Recruiter / Admin OS (/admin/*)                               ├── 7-Column Connection Management
      ├── /admin/dashboard (Executive Control Center)               ├── Apify Contact Enrichment
      ├── /admin/analytics (Live Telemetry & Charts)                ├── Parallel Document Generation
      ├── /admin/jobs (Discovery, ATS Scoring & Auto-Apply)         ├── Playwright Browser Automation Service
      ├── /admin/applications (Pipeline Tracking)                   ├── Gmail SMTP Client
      ├── /admin/referrals (Review & Dispatch)                      ├── GDrive Resume Sync Scheduler
      ├── /admin/connections (731 LinkedIn Contacts)                ├── RAG Knowledge Base
      ├── /admin/recruiter-inbox (Live Chat)                        ├── WebSocket Presence
      ├── /admin/resumes (Version Manager)                          └── Centralized LLM Provider
      ├── /admin/automation (Retention Policies)                                   │
      ├── /admin/agent (AI Job Copilot)                              [ Database & Cache Layer ]
      └── /admin/settings (Profile & API Keys)                       ├── PostgreSQL (Dev) / Supabase (Prod)
                                                                     ├── 8 Migration Files (Auto-Apply Schema)
                                                                     └── Redis / In-Memory Cache
```

---

## 🤖 Autonomous Multi-Job Auto-Apply Engine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. User Selection (/admin/jobs)                                             │
│    └─ Select multiple target jobs → Click "Apply to Selected"               │
│                        ▼                                                     │
│ 2. Batch Creation (/api/v2/applications/bulk-prepare)                       │
│    └─ application_queue_service creates batch in PostgreSQL/Supabase         │
│                        ▼                                                     │
│ 3. Automated Execution Loop (/api/v2/applications/auto-apply)                │
│    ├─ Playwright opens application URL                                       │
│    ├─ Form structure checked against portal_mapping_cache_service            │
│    ├─ If new form: form_mapping_service (LLM) generates semantic selectors   │
│    ├─ Playwright fills fields & uploads tailored PDF resume                  │
│    ├─ CAPTCHA / Login Wall Check:                                            │
│    │    ├─ Detected → Status "NEEDS_REVIEW" + Screenshot Capture             │
│    │    └─ Clean → Form submitted (or staged for human review)              │
│    └─ Rate limit backoff (Greenhouse: 30s, Lever: 20s, Workday: 60s)         │
│                        ▼                                                     │
│ 4. Real-time Monitoring (/api/v2/applications/batch/{id}/status)            │
│    └─ Progress percentage, per-job statuses, and audit screenshot viewer     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 7-Column Connection Table Schema

Every contact discovered or ingested is formatted and persisted across the 7 standard Connection columns:

| Column | Field Name | Description / Source |
|---|---|---|
| **1. First Name** | `first_name` | Contact given name (or `"Talent"` / `"Hiring"`) |
| **2. Last Name** | `last_name` | Contact family name (or `"Acquisition Team"`) |
| **3. URL** | `linkedin_url` | Verified LinkedIn profile/company URL or website |
| **4. Email Address** | `email` | Verified scraped HR email or domain contact |
| **5. Company** | `company` | Normalized target company name |
| **6. Position** | `position` | Contact title (e.g. `"Talent Acquisition & Hiring Team"`) |
| **7. Connected On** | `connected_on` | Formatted date string (e.g. `23 Aug 2026`) |

- **Degree Tag**: `1ST_DEGREE` or `Recruiter`
- **Source Attribute**: `LINKEDIN_CSV` or `APIFY_MAPS_DISCOVERY`

---

## 🤝 Job-First Automated Referral Execution Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Job Discovery (Multi-Provider)                                           │
│    ├─ JSearch API                                                            │
│    ├─ Naukri Scraper                                                         │
│    ├─ LinkedIn Jobs                                                          │
│    └─ Instahyre                                                              │
│                        ▼                                                     │
│ 2. Deduplication & Normalization                                             │
│    └─ job_normalization_service + job_deduplication_service                 │
│                        ▼                                                     │
│ 3. ATS Scoring (≥ 90% Match)                                                 │
│    └─ resume_matching_service (candidate profile grounding)                 │
│                        ▼                                                     │
│ 4. Company Normalization                                                     │
│    └─ company_normalization_service (strips Inc/LLC/Corp, resolves aliases) │
│                        ▼                                                     │
│ 5. 1st-Degree LinkedIn Match (Priority)                                     │
│    └─ connection_repository.match_1st_degree_contact(company)               │
│                        │                                                     │
│                  ┌─────┴─────┐                                               │
│                  │           │                                               │
│             [Match Found]  [No Match]                                        │
│                  │           │                                               │
│                  │           ▼                                               │
│                  │     Apify Google Maps HR Discovery                        │
│                  │     (lukaskrivka/google-maps-with-contact-details)        │
│                  │           │                                               │
│                  └─────┬─────┘                                               │
│                        ▼                                                     │
│ 6. Parallel Document Generation                                              │
│    └─ asyncio.gather(cover_letter_service, resume_matching_service)          │
│                        ▼                                                     │
│ 7. Staging & Human Review Gate                                               │
│    └─ /admin/referrals (Status: READY_FOR_REVIEW)                            │
│                        ▼                                                     │
│ 8. 1-Click SMTP Dispatch                                                     │
│    └─ gmail_mcp_client (Status: SENT, Follow-up: +5 days)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing & Quality Assurance

```bash
# Playwright E2E Test Suite (Desktop Chrome, Mobile Chrome, Mobile Safari)
npm run test:e2e        # Run all headless E2E tests
npm run test:e2e:ui     # Open interactive Playwright UI runner
npm run test:e2e:report # View HTML execution report

# Full Connections & Referral Pipeline Tests
python -m pytest backend/python/tests/test_connections_pipeline.py -v

# Automated Referral Pipeline Tests
python -m pytest backend/python/tests/test_automated_referral_pipeline.py -v

# Phase-Specific Tests
python -m pytest backend/python/tests/test_phase1_pipeline.py -v       # Job discovery
python -m pytest backend/python/tests/test_phase3_automation.py -v     # Application automation
python -m pytest backend/python/tests/test_phase4_email_automation.py -v # Email classification
python -m pytest backend/python/tests/test_phase5_referral_discovery.py -v # Referral discovery
python -m pytest backend/python/tests/test_phase6_control_center.py -v # Control center
python -m pytest backend/python/tests/test_phase7_hardening.py -v      # Security hardening
python -m pytest backend/python/tests/test_phase8_copilot.py -v        # AI copilot

# Google Drive Sync Tests
python -m pytest backend/python/tests/test_gdrive_sync.py -v

# JSearch Provider Tests
python -m pytest backend/python/tests/test_jsearch_provider.py -v
```

---

## 👨‍💻 About Sathyanantham V

Frontend Architect and Lead Software Engineer with **13.5+ years** designing and scaling enterprise UI platforms, Micro Frontend ecosystems (Module Federation), and AI-assisted engineering workflows across Retail, Digital Commerce, Banking, and Order Management.

### Core Expertise
- **Frontend Architecture**: React 19, Next.js 15, TypeScript, Micro Frontends (Module Federation), UI Resiliency
- **AI & Automation**: Multi-Agent Systems, Playwright Form Automation, RAG, LLM Integration, Autonomous Workflows
- **Cloud & Infrastructure**: Vercel, AWS, Supabase, PostgreSQL, Redis
- **Full-Stack Development**: FastAPI, Python, Node.js, WebSocket, REST APIs
- **Design Systems**: Tailwind CSS, Framer Motion, Glassmorphism UI, Accessibility (WCAG)

### Contact
- 📧 **Email**: [v.sathyanantham@gmail.com](mailto:v.sathyanantham@gmail.com)
- 💼 **LinkedIn**: [linkedin.com/in/sathyanantham-v-646b911b](https://linkedin.com/in/sathyanantham-v-646b911b)
- 🌐 **Portfolio**: [sathyanantham-portfolio-tv.vercel.app](https://sathyanantham-portfolio-tv.vercel.app/)
- 📍 **Location**: Bengaluru, India
- 🎯 **Open to**: Lead Frontend Engineer, Frontend Architect, Senior Full-Stack Engineer roles

---

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0, Framer Motion, Lenis Smooth Scroll
- **UI & Error Handling**: Custom component library, Lucide Icons, `GlobalErrorFallback`, `NotFound`, `LoadingSpinner`, `LoadingFallback`
- **Testing**: Playwright E2E (`@playwright/test`) with Desktop and Mobile devices
- **State & Data Fetching**: Zustand, TanStack Query, `useApiError` custom hook, `fetchApi` resilient client
- **Forms**: React Hook Form + Zod validation

### Backend
- **Framework**: FastAPI v2.0.0 (Python 3.12/3.14)
- **API**: 17 REST routers, WebSocket support
- **Services**: 33 service modules, 8 repository layers
- **AI/LLM**: NVIDIA NIM, Google Gemini, centralized LLM provider, LLM Form Mapping
- **Browser Automation**: Playwright Python (`playwright>=1.40.0`, `playwright-stealth`)
- **Task Queue**: Application Queue Service with portal rate limits, background schedulers, asyncio
- **Email**: Gmail SMTP client with multi-attachment support

### Database & Storage
- **Database**: PostgreSQL (local), Supabase (production)
- **Migrations**: 8 SQL migration files (including `008_auto_apply_schema.sql`)
- **Storage**: Google Drive API (resume sync), screenshot audit store
- **Cache**: Redis / in-memory TTL cache, Portal Mapping Cache

---

## 📊 Project Metrics

- **11 Admin Pages**: Dashboard, Analytics, Jobs, Applications, Referrals, Connections, Recruiter Inbox, Resumes, Automation, Agent, Settings
- **17 API Routers**: Comprehensive REST API coverage
- **33 Service Modules**: Modular, maintainable business logic
- **8 Repository Layers**: Clean data access abstraction
- **8 Database Migrations**: Version-controlled schema evolution
- **11+ Test Suites**: Automated testing across backend pipelines and frontend Playwright E2E
- **731 LinkedIn Connections**: Pre-ingested network for warm referrals
- **7-Column Connection Schema**: Standardized contact data format
- **9-Stage Application Pipeline**: Complete job search lifecycle tracking

---

<p align="center"><i>Sathyanantham V — Enterprise AI Studio & Autonomous Recruiter OS</i></p>
