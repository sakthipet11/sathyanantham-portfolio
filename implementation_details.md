# Enterprise Architectural Blueprint & Implementation Details

## Overview

This repository is structured as a clean, production-grade **Multi-Agent Portfolio & Recruiter Operating System** platform. Next.js 15 App Router (`app/`, `components/`, `lib/`, `hooks/`, `public/`) lives directly at the root of the workspace without any wrapping `frontend/` or `src/` subfolders. The Python AI Multi-Agent engine lives in `backend/python/`, supported by `database/` and `infrastructure/`.

All data points across the portfolio (enterprise projects, work experience, technical skills, candidate profile) and Recruiter OS (job listings, evaluations, applications, recruiter emails, referrals, connections, analytics telemetry) query live database records via local PostgreSQL (`postgresql://postgres:postgres@127.0.0.1:5432/postgres`) or Supabase Cloud.

---

## 📁 Repository Folder Structure

```
Sathyanantham-AI-Studio/
│
├── app/                                 # Next.js 15 App Router (Direct Root Level)
│   ├── page.tsx                         # Main Interactive Portfolio & AI Digital Twin Landing
│   ├── layout.tsx                       # Root Layout & Font/Theme Providers
│   ├── globals.css                      # Global Tailwind CSS Styles
│   ├── api/                             # Next.js API Proxy Routes
│   │   ├── portfolio/                   # DB Portfolio Endpoints (/projects, /experience, /skills)
│   │   └── admin/                       # Admin Proxy Routes (/gdrive-sync, etc.)
│   └── admin/                           # Recruiter OS & Admin Command Center
│       ├── page.tsx                     # Core Telemetry & Live Visitor Handoff Console
│       ├── dashboard/                   # 100% Dynamic Executive Control Center (10 KPIs & 9-Stage Pipeline)
│       ├── analytics/                   # Real-Time Telemetry Hub (Views, AI Chats, 14-Day Charts, Feed)
│       ├── jobs/                        # Job Discovery & Match Evaluation Engine
│       ├── applications/                # Application Pipeline & Auto-Tracker
│       ├── resumes/                     # Resume Customizer & Version Manager
│       ├── referrals/                   # Candidate Referral & Outreach Network (Human Review Gate)
│       ├── connections/                 # 731-Row LinkedIn Network Ingestion & Management (7 Columns)
│       ├── recruiter-inbox/             # Live Handoff Visitor & Recruiter Chat
│       ├── automation/                  # Multi-Agent Workflow Trigger Control
│       ├── agent/                       # Autonomous AI Job Copilot Chatbot
│       └── settings/                    # API Keys, Supabase & Candidate Truth Store
│
├── components/                          # UI Component Modules (admin, ai, canvas, layout, providers, sections, ui)
│   └── sections/                        # Dynamic DB Portfolio Sections (ProjectsSection, ExperienceSection, SkillsMatrix)
│
├── lib/                                 # Shared Utilities, Constants, Store, Supabase Client (getApiHost, fetchWithTimeout)
├── hooks/                               # Custom React Hooks (useAITwin, useScrollReveal, useReducedMotion, useLockBodyScroll)
├── public/                              # Public Static Assets, Resume PDFs & Generated Cover Letters
│   └── downloads/                       # Tailored Resume PDFs (Sathyanantham_V_Frontend_Architect_2026.pdf)
│
├── backend/                             # Python Backend Engine
│   └── python/
│       ├── main.py                      # FastAPI Entry Point (WebSockets, Routes, Startup CSV Ingest)
│       ├── requirements.txt             # Python Dependencies
│       │
│       ├── api/                         # FastAPI Router Endpoints
│       │   ├── analytics.py             # 100% Dynamic Portfolio & Telemetry API (/api/v2/analytics/overview)
│       │   ├── control_center.py        # Executive Control Center & Dynamic Pipeline (/api/v2/control-center/*)
│       │   ├── connections.py           # Connections CRUD & Sync APIs (/api/v2/connections/*)
│       │   ├── referrals.py             # Referral Network Outreach & Review APIs (/api/v2/referrals/*)
│       │   ├── jobs_v2.py               # Job Discovery, ATS Scoring & Pipeline APIs (/api/v2/jobs/*)
│       │   ├── applications.py          # Application Pipeline Management APIs (/api/v2/applications/*)
│       │   ├── recruiter_inbox.py       # Visitor & Recruiter Live Handoff Chat APIs (/api/v2/recruiter-inbox/*)
│       │   ├── resumes.py               # Resume Versioning APIs (/api/v2/resumes/*)
│       │   ├── copilot.py               # AI Copilot Multi-Agent Chat APIs (/api/v2/copilot/*)
│       │   ├── portfolio.py             # DB Portfolio APIs (/projects, /experience, /skills, /profile)
│       │   ├── admin.py                 # Auth, Presence, CMS APIs (/api/admin/*)
│       │   └── hardening.py             # Security, Rate Limiting & Validation APIs
│       │
│       ├── services/                    # Core Business Services
│       │   ├── apify_recruiter_service.py       # Apify Google Maps Contact Discovery Scraper
│       │   ├── referral_discovery_service.py    # Job-First ATS ≥ 90% Referral Discovery Engine
│       │   ├── company_normalization_service.py # Legal entity & alias normalizer
│       │   ├── cover_letter_service.py          # Candidate grounded cover letter generator
│       │   ├── referral_messaging_service.py    # Personalized outreach copy generator
│       │   ├── gmail_mcp_client.py              # Multi-attachment MIME SMTP transmission
│       │   ├── ai_job_copilot_service.py        # Interactive AI Copilot assistant
│       │   └── ai_providers.py                  # Centralized LLM Provider (NVIDIA / Gemini)
│       │
│       ├── repositories/                # Database Layer Abstractions (Supabase + PostgreSQL Direct)
│       │   ├── connection_repository.py # 7-Column Connection Table Persistence & CSV Ingestion
│       │   ├── referral_repository.py   # PostgreSQL `referrals` queries with committed transactions & UUIDs
│       │   ├── job_repository.py        # PostgreSQL `jobs` & `job_scores` queries
│       │   ├── application_repository.py# PostgreSQL `applications` & `application_events` queries
│       │   ├── email_repository.py      # PostgreSQL `emails` queries
│       │   └── supabase_repo.py         # Core Supabase & PostgreSQL helper
│       │
│       └── tests/                       # Automated Test Suites
│           ├── test_connections_pipeline.py    # 5/5 Full Connections & Referral Test Suite
│           └── test_automated_referral_pipeline.py # 7-Step referral pipeline tests
│
├── database/                            # Database Layer (PostgreSQL / Supabase)
│   ├── setup_local_db.py                # Automated Database Migration & Seeding Execution Script
│   └── migrations/                      # SQL Migrations
│       ├── 001_initial_schema.sql       # Profiles, skills, projects, experience, chat, analytics
│       ├── 002_multi_agent_tables.sql   # Job listings, evaluations, applications, referrals
│       ├── 003_job_automation_schema.sql # V2 Multi-Agent Recruiter OS schema
│       └── 007_connections_and_referral_enrichment.sql # Connections table & 7-column schema
│
└── docs/                                # Project Documentation & Reference Data
    └── Connections.csv                  # 731-Row LinkedIn Network Export
```

---

## 🤝 Key Implementation Details

### 1. 100% Dynamic Telemetry & Analytics Hub
- **Endpoint**: `GET /api/v2/analytics/overview` (in [backend/python/api/analytics.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/api/analytics.py)).
- **Metrics Computed**:
  - `portfolio_views` & `unique_visitors` from `visitor_events`.
  - `views_growth_percent` (30-day calculation vs total views).
  - `resume_downloads` & `conversion_rate_percent`.
  - `ai_twin_conversations`, `ai_twin_messages`, and `avg_messages_per_conversation` from `chat_sessions` & `chat_messages`.
  - `total_jobs_analyzed`, `average_ats_fit`, and `high_match_jobs_90_plus` from `jobs`.
  - `active_referral_campaigns` & `total_network_connections` from `referrals` and `connections`.
  - `device_breakdown` (Desktop vs Mobile percentage).
  - `top_locations` from `visitor_events.city` / `visitor_events.country`.
  - `daily_activity` (14-day timeseries of views, chats, and job matches).
  - `recent_events` (Live telemetry feed with browser, OS, and timestamps).
- **Zero Static Numbers**: No hardcoded fallbacks in `/admin/dashboard` or `/admin/analytics`.

### 2. Job-First Referral Ingestion & Contact Matching
- **Source**: Directly queries local Job DB (`job_repository.list_jobs(limit=200)` / `/api/v2/jobs?min_score=90`) without re-running external scrapers.
- **1st-Degree Priority**: Resolves warm connections from `connections` table via `company_normalization_service`.
- **Apify Contact Discovery**: For companies missing warm connections, queries `lukaskrivka/google-maps-with-contact-details` using search terms:
  ```python
  search_terms = [f"{company} office {location.split(',')[0]}" for company in companies]
  ```
- **7 Connection Columns**:
  1. `First Name`
  2. `Last Name`
  3. `URL`
  4. `Email Address`
  5. `Company`
  6. `Position`
  7. `Connected On`
- **Parallel Material Generation**: Concurrently drafts cover letters and attaches tailored PDF resume (`Sathyanantham_V_Frontend_Architect_2026.pdf`) using `asyncio.gather`.
- **Committed Transactions**: Explicit `pg_conn.commit()` and UUID validation in `referral_repository.py`.

---

## ⚡ Execution & Verification Commands

```bash
# 1. Run Complete Connections & Referral Pipeline Test Suite (100% Pass)
python -m pytest backend/python/tests/test_connections_pipeline.py -v

# 2. Start FastAPI Backend Engine (Port 8000)
python -m uvicorn backend.python.main:app --host 127.0.0.1 --port 8000 --reload

# 3. Start Next.js 15 Frontend (Port 3000)
npm run dev
```
