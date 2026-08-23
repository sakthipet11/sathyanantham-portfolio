# Sathyanantham V — Enterprise AI Studio & Autonomous Job Search Copilot

> **Multi-Agent Portfolio, Recruiter OS, and Autonomous AI Job Discovery & Referral Execution Platform**

---

## 🎯 Business Use Case: AI Job Search Copilot

### Problem

Job seekers — especially senior/lead-level professionals — spend hours manually searching multiple portals (Naukri, LinkedIn, Instahyre, etc.), rewriting resumes and cover letters for each role, tracking applications in spreadsheets, and manually hunting for employee referrals. Most listings turn out to be a poor fit only after the effort is already spent, and warm networking leads are left uncontacted.

### Solution

An autonomous AI agent platform that runs the entire job search and referral loop on the candidate's behalf:
1. Discovers relevant openings across platforms and scores them against the candidate profile (ATS $\ge$ 90%).
2. Matches warm 1st-degree connections from the candidate's 731-row LinkedIn network.
3. Automatically falls back to Apify Google Maps Contact Discovery (`lukaskrivka/google-maps-with-contact-details`) for verified corporate emails and HR contacts.
4. Generates tailored PDF resumes (`public/downloads/`) and candidate-grounded cover letters in parallel via `asyncio.gather`.
5. Provides a centralized Human-in-the-Loop approval gate before dispatching applications or multi-attachment referral packages directly via Gmail SMTP.

---

## 🏗️ System Architecture

The platform operates on a clean, 4-tier decoupled architecture:

```
[ Frontend: Next.js 15 App Router ]  <-- NEXT_PUBLIC_API_URL -->  [ Backend: FastAPI (Python 3.12 / 3.14) ]
  ├── Public Candidate Portfolio (React 19)                         ├── 6 Autonomous AI Agents
  └── Recruiter / Admin OS (/admin/*)                               ├── Job Discovery Engine
      ├── /admin/dashboard (100% Dynamic 10 KPIs)                   ├── 7-Column Connection Table Persistence
      ├── /admin/analytics (Live Telemetry & 14-Day Trends)         ├── Apify Google Maps Contact Scraper
      ├── /admin/referrals (Job-First ATS ≥ 90% Flow)               ├── Parallel Document Generation (asyncio.gather)
      ├── /admin/connections (731 LinkedIn Contacts)                └── Live Handoff & Visitor Telemetry
      └── /admin/agent (AI Job Copilot Chatbot)                                    │
                                                                       [ Database & Cache Layer ]
                                                                        ├── PostgreSQL (Local) / Supabase (Prod)
                                                                        └── Redis / In-Memory TTL Cache
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
[ ATS ≥ 90 Local Job DB ] ──► [ Company Normalization ] ──► [ 1st-Degree LinkedIn Match ]
                                                                       │
                                              (If missing contact)     ▼
[ 5-Day Follow-Up Nudge ] ◄── [ Multi-Attach SMTP Dispatch ] ◄── [ Apify Google Maps Discovery ]
                                              │
                                              ▼
                              [ Parallel Cover Letter & Resume PDF Generation ]
                                              │
                                              ▼
                                   [ Admin Review Gate ]
```

1. **Job-First Query**: Queries local Job DB directly (`job_repository.list_jobs` / `/api/v2/jobs?min_score=90`) without running redundant external scrapers.
2. **Company Entity Normalization**: Strips corporate suffixes (`Inc`, `LLC`, `Corp`) and resolves parent aliases via `company_normalization_service.py` (e.g. `Google LLC` $\rightarrow$ `Google`, `Figma Inc` $\rightarrow$ `Figma`).
3. **1st-Degree Match Priority**: Queries `connections` table for 1st-degree contacts from the ingested 731-row `docs/Connections.csv`.
4. **Apify Contact Discovery**: For companies missing contacts, queries Apify actor `lukaskrivka/google-maps-with-contact-details` using search terms:
   `search_terms = [f"{company} office {location.split(',')[0]}" for company in companies]`
5. **Parallel Package Generation**: Concurrently generates tailored cover letters and pairs them with candidate physical PDF resumes (`public/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf`) using `asyncio.gather`.
6. **Human Review Gate**: Stored in `READY_FOR_REVIEW` on the `/admin/referrals` dashboard for admin inspection and 1-click execution.
7. **SMTP Multi-Attachment Dispatch**: Delivers email with both attachments (resume PDF + cover letter) via Gmail SMTP and initializes a 5-day follow-up nudge tracker.

---

## 🛠️ Development & Local Setup Guide

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
```

---

### 2. Running the Backend Server (FastAPI)

```bash
# Start FastAPI backend server with Uvicorn
python -m uvicorn backend.python.main:app --host 127.0.0.1 --port 8000 --reload
```
- **Swagger Interactive API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3. Running the Frontend Application (Next.js 15)

```bash
# Start Next.js development server
npm run dev
```

Open in your browser:
- **Interactive Portfolio**: [http://localhost:3000](http://localhost:3000)
- **Command Center Dashboard**: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)
- **Live Telemetry & Analytics Hub**: [http://localhost:3000/admin/analytics](http://localhost:3000/admin/analytics)
- **Referral Review Center**: [http://localhost:3000/admin/referrals](http://localhost:3000/admin/referrals)
- **Connections Ingestion Hub**: [http://localhost:3000/admin/connections](http://localhost:3000/admin/connections)
- **AI Job Copilot Chatbot**: [http://localhost:3000/admin/agent](http://localhost:3000/admin/agent)

---

### 4. Executing Automated Test Suites

```bash
# Run Full Connections & Referral Test Suite (5/5 Passing)
python -m pytest backend/python/tests/test_connections_pipeline.py -v

# Run Automated Referral Pipeline Test Suite
python -m pytest backend/python/tests/test_automated_referral_pipeline.py -v
```

---

## 👨‍💻 About Sathyanantham V

Frontend Architect and Lead Software Engineer with **13.5+ years** designing and scaling enterprise UI platforms, Micro Frontend ecosystems (Module Federation), and AI-assisted engineering workflows across Retail, Digital Commerce, Banking, and Order Management.

- 📧 **Email**: [v.sathyanantham@gmail.com](mailto:v.sathyanantham@gmail.com)
- 💼 **LinkedIn**: [linkedin.com/in/sathyanantham-v-646b911b](https://linkedin.com/in/sathyanantham-v-646b911b)
- 🌐 **Portfolio**: [sathyanantham-portfolio-tv.vercel.app](https://sathyanantham-portfolio-tv.vercel.app/)

---

<p align="center"><i>Sathyanantham V — Enterprise AI Studio & Autonomous Recruiter OS</i></p>
