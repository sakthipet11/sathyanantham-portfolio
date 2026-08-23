# Sathyanantham V — Enterprise AI Studio & Autonomous Job Search Copilot

> **Multi-Agent Portfolio, Recruiter OS, and Autonomous AI Job Discovery & Referral Execution Platform**

---

## 🎯 Business Use Case: AI Job Search Copilot

### Problem

Job seekers — especially senior/lead-level professionals — spend hours manually searching multiple portals (Naukri, LinkedIn, Instahyre, etc.), rewriting resumes and cover letters for each role, tracking applications in spreadsheets, manually hunting for employee referrals, and responding to recruiter emails. Most listings turn out to be a poor fit only after the effort is already spent, and warm networking leads are left uncontacted.

### Solution

An autonomous AI agent platform that runs the entire job search and referral loop on the candidate's behalf:

1. **Multi-Provider Job Discovery**: Discovers relevant openings across JSearch, Naukri, LinkedIn, and Instahyre, with automated deduplication and normalization.
2. **ATS Scoring Engine**: Scores jobs against the candidate profile (ATS ≥ 90%) using advanced resume matching algorithms.
3. **1st-Degree Network Matching**: Matches warm connections from the candidate's 731-row LinkedIn network stored in the local database.
4. **Apify Contact Discovery**: Falls back to Apify Google Maps (`lukaskrivka/google-maps-with-contact-details`) for verified corporate emails and HR contacts when no warm connection exists.
5. **Parallel Document Generation**: Generates tailored PDF resumes (`public/downloads/`) and candidate-grounded cover letters concurrently via `asyncio.gather`.
6. **Email Intelligence**: Automatically classifies incoming recruiter emails and generates AI-powered response drafts.
7. **Application Pipeline**: Tracks applications through a 9-stage pipeline with automated status updates and follow-up scheduling.
8. **Human Review Gate**: Centralized approval gate on `/admin/referrals` before dispatching multi-attachment referral packages via Gmail SMTP with 5-day follow-up tracking.
9. **Resume Version Management**: Multi-version resume system with Google Drive sync for tailored PDFs per job category.
10. **Live Analytics Dashboard**: Real-time telemetry showing portfolio views, AI conversations, job matches, and network activity.

---

## 🏗️ System Architecture

The platform operates on a clean, 4-tier decoupled architecture:

```
[ Frontend: Next.js 15 App Router ]  <-- NEXT_PUBLIC_API_URL -->  [ Backend: FastAPI v2.0.0 (Python 3.12 / 3.14) ]
  ├── Public Candidate Portfolio (React 19)                         ├── 16 API Routers
  │   ├── Hero with AI Twin                                         ├── 29 Service Modules
  │   ├── Live Handoff Section                                      ├── 8 Repository Layers
  │   ├── Projects, Experience, Skills                              ├── Multi-Provider Job Discovery
  │   └── Dynamic DB-Driven Content                                 ├── ATS Scoring & Matching Engine
  │                                                                  ├── Email Classification & Auto-Response
  └── Recruiter / Admin OS (/admin/*)                               ├── 7-Column Connection Management
      ├── /admin/dashboard (Executive Control Center)               ├── Apify Contact Enrichment
      ├── /admin/analytics (Live Telemetry & Charts)                ├── Parallel Document Generation
      ├── /admin/jobs (Discovery & ATS Scoring)                     ├── Gmail SMTP Client
      ├── /admin/applications (Pipeline Tracking)                   ├── GDrive Resume Sync Scheduler
      ├── /admin/referrals (Review & Dispatch)                      ├── RAG Knowledge Base
      ├── /admin/connections (731 LinkedIn Contacts)                ├── WebSocket Presence
      ├── /admin/recruiter-inbox (Live Chat)                        └── Centralized LLM Provider
      ├── /admin/resumes (Version Manager)                                         │
      ├── /admin/automation (Retention Policies)                     [ Database & Cache Layer ]
      ├── /admin/agent (AI Job Copilot)                              ├── PostgreSQL (Dev) / Supabase (Prod)
      └── /admin/settings (Profile & API Keys)                       ├── 8 Migration Files
                                                                      └── Redis / In-Memory Cache
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
│            Match Found    No Match                                           │
│                  │             │                                             │
│                  ▼             ▼                                             │
│        Use LinkedIn    6. Apify Contact Discovery                            │
│         Connection        └─ apify_recruiter_service                         │
│                              (Google Maps HR contacts)                       │
│                        ▼                                                     │
│ 7. Parallel Document Generation (asyncio.gather)                             │
│    ├─ cover_letter_service (candidate-grounded)                             │
│    └─ Physical PDF Resume (public/downloads/*.pdf)                          │
│                        ▼                                                     │
│ 8. Human Review Gate (/admin/referrals)                                     │
│    └─ Status: READY_FOR_REVIEW                                              │
│                        ▼                                                     │
│ 9. Gmail SMTP Multi-Attachment Dispatch                                     │
│    ├─ gmail_mcp_client.send_message()                                       │
│    ├─ Attachments: [resume.pdf, cover_letter.pdf]                           │
│    └─ Follow-up: 5-day nudge tracker                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Job-First Query**: Queries local Job DB (`job_repository.list_jobs`) without running redundant external scrapers.
2. **Company Entity Normalization**: Strips corporate suffixes and resolves parent aliases (e.g., `Google LLC` → `Google`).
3. **1st-Degree Match Priority**: Queries `connections` table for warm contacts from ingested 731-row `docs/Connections.csv`.
4. **Apify Contact Discovery**: For companies missing contacts, uses `lukaskrivka/google-maps-with-contact-details` with search terms: `{company} office {location}`.
5. **Parallel Package Generation**: Concurrently generates cover letters and pairs physical PDF resumes using `asyncio.gather`.
6. **Human Review Gate**: Stored as `READY_FOR_REVIEW` on `/admin/referrals` for inspection and 1-click execution.
7. **SMTP Multi-Attachment Dispatch**: Delivers email with both attachments via Gmail SMTP and initializes 5-day follow-up tracking.

---

## 🛠️ Development & Local Setup Guide

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.12 or 3.14
- **PostgreSQL** 14+ (local) or Supabase account
- **Google Drive API** credentials (for resume sync)
- **Apify API** token (for contact discovery)
- **NVIDIA NIM** or **Gemini** API key (for LLM services)

### 1. Environment Configuration (`.env`)

```env
# Server Configuration
PORT=8000
HOST=127.0.0.1
ENVIRONMENT=development

# Frontend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Database Connection (Supabase / Local Postgres)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key

# Apify Scraper Token
APIFY_API_TOKEN=your_apify_api_token_here

# Centralized LLM Provider (NVIDIA NIM / Gemini)
NVIDIA_API_KEY=your_nvidia_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Gmail SMTP Outbound Dispatch
GMAIL_USER=v.sathyanantham@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password

# Google Drive API (Resume Sync)
GOOGLE_DRIVE_CREDENTIALS_JSON=path_to_credentials.json
GOOGLE_DRIVE_FOLDER_ID=your_gdrive_folder_id
```

---

### 2. Database Setup

```bash
# Run migrations to set up database schema
python database/setup_local_db.py

# Migrations include:
# - 001_initial_schema.sql (profiles, projects, experience, skills, chat, analytics)
# - 002_multi_agent_tables.sql (jobs, evaluations, applications, referrals)
# - 003_job_automation_schema.sql (V2 multi-agent recruiter OS)
# - 004_retention_policies.sql (data lifecycle management)
# - 005_job_discovery_mcp_support.sql (MCP server integration)
# - 006_recruiter_inbox_production.sql (live chat & handoff)
# - 007_connections_and_referral_enrichment.sql (7-column connection schema)
```

---

### 3. Install Dependencies

```bash
# Backend dependencies
cd backend/python
pip install -r requirements.txt

# Frontend dependencies
cd ../..
npm install
```

---

### 4. Running the Backend Server (FastAPI)

```bash
# Start FastAPI backend server with Uvicorn (Port 8000)
python -m uvicorn backend.python.main:app --host 127.0.0.1 --port 8000 --reload
```

**Access Points:**
- **Interactive API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Analytics Overview**: [http://127.0.0.1:8000/api/v2/analytics/overview](http://127.0.0.1:8000/api/v2/analytics/overview)

---

### 5. Running the Frontend Application (Next.js 15)

```bash
# Start Next.js development server (Port 3000)
npm run dev
```

**Frontend Pages:**
- **Portfolio**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)
- **Analytics Hub**: [http://localhost:3000/admin/analytics](http://localhost:3000/admin/analytics)
- **Job Discovery**: [http://localhost:3000/admin/jobs](http://localhost:3000/admin/jobs)
- **Applications**: [http://localhost:3000/admin/applications](http://localhost:3000/admin/applications)
- **Referrals**: [http://localhost:3000/admin/referrals](http://localhost:3000/admin/referrals)
- **Connections**: [http://localhost:3000/admin/connections](http://localhost:3000/admin/connections)
- **Recruiter Inbox**: [http://localhost:3000/admin/recruiter-inbox](http://localhost:3000/admin/recruiter-inbox)
- **Resume Manager**: [http://localhost:3000/admin/resumes](http://localhost:3000/admin/resumes)
- **AI Copilot**: [http://localhost:3000/admin/agent](http://localhost:3000/admin/agent)
- **Settings**: [http://localhost:3000/admin/settings](http://localhost:3000/admin/settings)

---

### 6. Executing Automated Test Suites

```bash
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
- **Frontend Architecture**: React 19, Next.js 15, TypeScript, Micro Frontends (Module Federation)
- **AI & Automation**: Multi-Agent Systems, RAG, LLM Integration, Autonomous Workflows
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
- **UI Components**: Custom component library, Lucide Icons
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation

### Backend
- **Framework**: FastAPI v2.0.0 (Python 3.12/3.14)
- **API**: 16 REST routers, WebSocket support
- **Services**: 29 service modules, 8 repository layers
- **AI/LLM**: NVIDIA NIM, Google Gemini, centralized LLM provider
- **Task Queue**: Background schedulers, asyncio
- **Email**: Gmail SMTP client with multi-attachment support

### Database & Storage
- **Database**: PostgreSQL (local), Supabase (production)
- **Migrations**: 8 SQL migration files
- **Storage**: Google Drive API (resume sync)
- **Cache**: Redis / in-memory TTL cache

### AI & Automation
- **Job Discovery**: JSearch API, Naukri scraper, LinkedIn, Instahyre
- **Matching**: ATS scoring engine, resume matching algorithms
- **Contact Discovery**: Apify Google Maps contact scraper
- **Email Intelligence**: Classification, auto-response generation
- **Document Generation**: Async parallel cover letter + resume generation
- **RAG**: Knowledge base ingestion and retrieval

### Infrastructure & DevOps
- **Hosting**: Vercel (frontend), self-hosted/cloud (backend)
- **CI/CD**: Git-based deployment pipeline
- **Monitoring**: Live telemetry, analytics dashboard
- **Testing**: pytest (11 test suites), 100% coverage on critical paths

---

## 📊 Project Metrics

- **11 Admin Pages**: Dashboard, Analytics, Jobs, Applications, Referrals, Connections, Recruiter Inbox, Resumes, Automation, Agent, Settings
- **16 API Routers**: Comprehensive REST API coverage
- **29 Service Modules**: Modular, maintainable business logic
- **8 Repository Layers**: Clean data access abstraction
- **8 Database Migrations**: Version-controlled schema evolution
- **11 Test Suites**: Automated testing across all critical paths
- **731 LinkedIn Connections**: Pre-ingested network for warm referrals
- **7-Column Connection Schema**: Standardized contact data format
- **9-Stage Application Pipeline**: Complete job search lifecycle tracking

---

<p align="center"><i>Sathyanantham V — Enterprise AI Studio & Autonomous Recruiter OS</i></p>
