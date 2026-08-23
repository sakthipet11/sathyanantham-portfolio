# Sathyanantham AI Studio — Autonomous Multi-Agent Architecture Specification

> **Version**: 2.6.0 (Production-Grade)  
> **Candidate Profile Target**: Sathyanantham V (Lead Frontend Architect / Principal UI Platform Engineer — 13.5+ Years Experience)  
> **Platform Core**: Next.js 15 App Router (Frontend) & FastAPI Multi-Agent Engine (Backend)  
> **Database Layer**: Local PostgreSQL (`postgresql://postgres:postgres@127.0.0.1:5432/postgres`) / Supabase Cloud

---

## 🤖 Multi-Agent Ecosystem Overview

The platform coordinates **6 Autonomous AI Agents** working in unison with Human-in-the-Loop gates to automate discovery, evaluation, document generation, outreach, and referral execution.

```
                                  [ Candidate Truth Store & Knowledge Base ]
                                                       │
                                                       ▼
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│  1. Discovery Agent  │ ───►  │  2. Fit Score Agent  │ ───►  │ 3. Application Agent │
│  (MCP / JSearch)     │        │   (Dynamic ATS ≥ 90) │        │  (Tailoring Engine)  │
└──────────────────────┘        └──────────────────────┘        └──────────────────────┘
                                                                            │
                                                                            ▼
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│ 6. Handoff Chat Agent│        │ 5. Referral Exec     │ ◄───  │ 4. Recruiter Email   │
│ (Visitor Live Sync)  │        │ (1st-Deg + Apify GM) │        │ (MIME Multi-Attach)  │
└──────────────────────┘        └──────────────────────┘        └──────────────────────┘
```

---

## 📋 Agent Specifications

### 1. Job Discovery Agent (`JobDiscoveryAgent`)
- **Location**: `backend/python/agents/job_discovery_agent/` & `backend/python/mcp/job_discovery/`
- **Goal**: Fetch real-time job listings across platforms via OpenWeb Ninja / Google for Jobs with zero duplicate records and minimal rate-limit consumption.
- **Key Capabilities**:
  - Combined single-request search pooling target roles and locations (`unique_queries[:3]`).
  - SHA256 Canonical Fingerprinting (`company:title:location`).
  - Delta synchronization for newly posted jobs.

### 2. Job Fit Scoring Agent (`JobScoringAgent`)
- **Location**: `backend/python/agents/job_scoring_agent/` & `backend/python/services/job_scoring_service.py`
- **Goal**: Evaluate job listings against candidate credentials (13.5+ years experience, Lead Frontend Architect, Micro Frontends, Module Federation, Next.js/React, TypeScript).
- **Scoring Engine**:
  - Dynamic weighted formula: Skills Match (40%), Experience Alignment (35%), Title Relevance (25%).
  - Zero key overlap guarantee between `matched_skills` and `gap_skills`.
  - Disqualification threshold: Discards low-fit roles (< 75%); identifies high-fit qualified targets (ATS $\ge$ 90).

### 3. Tailored Application Agent (`ResumeAgent` & `CoverLetterService`)
- **Location**: `backend/python/agents/resume_agent/` & `backend/python/services/cover_letter_service.py`
- **Goal**: Produce customized, factual application materials per qualified job opportunity.
- **Key Capabilities**:
  - Custom Cover Letter Generation grounded strictly in candidate verified achievements.
  - Markdown and PDF artifact generation stored in `public/downloads/cover_letters/`.
  - Matched resume pairing based on job requirements (e.g. Lead Frontend Architect vs UI Platform Engineer).

### 4. Recruiter Email Agent (`EmailAgent` & `GmailMCPClient`)
- **Location**: `backend/python/agents/email_agent/` & `backend/python/services/gmail_mcp_client.py`
- **Goal**: Draft and dispatch personalized outreach emails with dual MIME attachments.
- **Key Capabilities**:
  - Multi-attachment MIME assembly (Tailored Resume PDF + Tailored Cover Letter).
  - Outbound transmission over authenticated Gmail SMTP (`smtp.gmail.com:465`).
  - Live preview drawer in Recruiter OS before external dispatch.

### 5. Automated Referral Discovery & Execution Agent (`ReferralDiscoveryService`)
- **Location**: `backend/python/services/referral_discovery_service.py`, `backend/python/repositories/connection_repository.py`, & `backend/python/services/apify_recruiter_service.py`
- **Goal**: Identify warm corporate connections for ATS $\ge$ 90 jobs, enrich contact details, generate grounded materials, and manage follow-ups.
- **Job-First Workflow Rules**:
  1. **Job DB Query**: Queries local Job DB directly (`job_repository.list_jobs(limit=200)` / `/api/v2/jobs?min_score=90`) without triggering redundant external scrapers.
  2. **Company Entity Normalization**: Resolves legal aliases via `company_normalization_service.py` (e.g. `Google LLC` $\rightarrow$ `Google`, `Figma Inc` $\rightarrow$ `Figma`).
  3. **1st-Degree LinkedIn Match**: Prioritizes 1st-degree warm contacts ingested from `docs/Connections.csv` (731 rows) into the `connections` table.
  4. **Apify Google Maps Discovery**: For companies missing 1st-degree contacts, dynamically queries Apify actor `lukaskrivka/google-maps-with-contact-details` using search terms:
     `search_terms = [f"{company} office {location.split(',')[0]}" for company in companies]`
  5. **7-Column Connection Mapping**: Formats and auto-persists contacts across `First Name`, `Last Name`, `URL`, `Email Address`, `Company`, `Position`, and `Connected On`.
  6. **Parallel Material Generation**: Uses `asyncio.gather` for concurrent drafting of tailored cover letters and customized resume attachments (`public/downloads/`).
  7. **Human Review Gate & SMTP Dispatch**: Stages records in `READY_FOR_REVIEW`, allowing 1-click SMTP dispatch with physical PDF attachments and 5-day follow-up tracking.

### 6. Recruiter Live Handoff Agent (`RecruiterInboxAgent`)
- **Location**: `backend/python/agents/recruiter_inbox_agent/` & `backend/python/api/recruiter_inbox.py`
- **Goal**: Handle live visitor questions, conduct AI candidate screenings, and hand off warm recruiter leads to the candidate.
- **Key Capabilities**:
  - Dual WebSocket presence sync between public portfolio visitor and `/admin/recruiter-inbox`.
  - Grounded RAG knowledge retrieval answering questions about candidate architecture experience.

---

## 🔒 Safety, Guardrails & Human-in-the-Loop

1. **No Cold Blasts**: Automated discovery prepares drafts in `READY_FOR_REVIEW`. No emails or referral requests are dispatched without explicit admin approval (`/api/v2/referrals/{id}/send`).
2. **Grounding Constraint**: Cover letters and messages are strictly constrained to candidate verified facts (13.5+ years experience, Lead Frontend Architect, React, Next.js, Micro Frontends). LLMs are forbidden from hallucinating past employers or metrics.
3. **Multi-Attachment Guarantee**: Every sent referral email attaches both the specific tailored resume PDF and the generated tailored cover letter.
4. **Follow-Up Cadence**: Follow-ups are tracked on a 5-day cycle with dedicated nudge actions.

---

## 🧪 Verification & Operational Commands

```bash
# Run Complete Connections & Referral Pipeline Test Suite
python -m pytest backend/python/tests/test_connections_pipeline.py -v

# Run Automated Referral Pipeline Test Suite
python -m pytest backend/python/tests/test_automated_referral_pipeline.py -v

# Start FastAPI Multi-Agent Engine
python -m uvicorn backend.python.main:app --host 127.0.0.1 --port 8000 --reload

# Start Next.js 15 Recruiter OS Frontend
npm run dev
```
