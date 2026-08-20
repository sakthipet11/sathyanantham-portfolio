# Sathyanantham V — Enterprise AI Studio & Autonomous Job Search Copilot

> **Multi-Agent Portfolio, Recruiter OS, and Autonomous AI Job Discovery Platform**

---

## 🎯 Business Use Case: AI Job Search Copilot

### Problem

Job seekers — especially senior/lead-level professionals — spend hours manually searching multiple portals (Naukri, LinkedIn, Instahyre, etc.), rewriting resumes and cover letters for each role, and tracking applications in spreadsheets. Most listings turn out to be a poor fit only after the effort is already spent, and relevant postings get missed simply because no one checked that day.

### Solution

An autonomous AI agent that runs the entire job search loop on the user's behalf: discovers relevant openings across multiple platforms, scores them against the user's profile, generates a tailored resume and cover letter on demand, and — with explicit user confirmation — sends the application directly to the recruiter/HR contact. Everything is tracked automatically so nothing falls through the cracks.

### Target Users

- **Active Job Seekers**: Professionals looking to reclaim hours per week spent on repetitive job searches and resume tailoring.
- **Passive Candidates**: Professionals who want to be notified only when a high-relevance match (≥75% ATS match) appears.
- **Recruiters & Staffing Agencies** *(Future Extension)*: Self-serve candidate-matching tool and candidate-facing agent layer on top of existing ATS systems.

### Core Value Proposition

- ⚡ **Turns a multi-hour weekly chore into a single conversational request**
- 🎯 **Tailored Applications**: Every application is rewritten per job to match specific requirements, dramatically boosting recruiter callback rates.
- 🕒 **Automated Daily Discovery**: Background cronjob scheduler automatically catches new postings daily at configured times (e.g. 08:00 AM IST).
- 👁️ **Full Visibility**: Every match, score breakdown, application state, and recruiter reply is logged and searchable on the Recruiter OS dashboard.
- 🔒 **Human-in-the-Loop Control**: Explicit user confirmation is required before any application or email is dispatched externally.
- 📉 **Rate-Limit Optimization**: Combines target roles & locations into **1 single HTTP request** per discovery run to conserve OpenWeb Ninja API quota.

### Key Capabilities

1. **Job Discovery** — Natural-language search across job platforms via JSearch / Google for Jobs API with saved user preferences (target roles, locations, remote/hybrid, job recency, CTC band).
2. **Fit Scoring & Candidate Truth Evaluation** — Dynamic ATS engine ranking listings against candidate experience (Skills %, Experience %, Title %) with zero key overlap between matched skills and gaps.
3. **Tailored Application Generation** — Resume + cover letter rewritten per job, downloadable instantly.
4. **Application Sending** — Drafts outreach emails to HR/recruiters, previews them, and sends only after explicit user confirmation.
5. **Referral Discovery** — Surfaces 1st-degree connections at target companies to boost referral response odds.
6. **Recruiter Inbox** — Centralizes inbound recruiter messages so replies aren't scattered across email/LinkedIn.
7. **Application Tracking** — Dashboard of every job touched, match score HUD, status, and candidate evaluation metrics.

### Business Impact

- **Time Saved**: Hours per week reclaimed from manual search and document tailoring.
- **Quality**: Tailored application materials consistently outperform generic resume blasts in response rate.
- **Coverage**: Automated background discovery catches newly posted opportunities immediately.
- **Control**: Speed with total oversight through human-in-the-loop approval before sending outreach.

### Future Extension

Could be productized as a SaaS offering for job seekers or licensed to staffing agencies and enterprise HR teams as a self-serve candidate-matching layer on top of ATS platforms (Greenhouse, Lever, Workday).

---

## 🏗️ System Architecture

The platform operates on a clean, 4-tier decoupled architecture:

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

### Stack Components

- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend Engine**: FastAPI (Python 3.12+), OpenRouter / Gemini LLM evaluation, RAG Knowledge Retrieval, WebSocket Live Handoff.
- **Job Discovery MCP Server**: Model Context Protocol (MCP) server executing live job search via OpenWeb Ninja (`https://api.openwebninja.com/jsearch/search-v2`), SHA256 canonical deduplication, and rate limiting.
- **Database**: Dual-engine persistence supporting local PostgreSQL for development and Supabase Cloud for production.

---

## 🛠️ Development & Local Setup Guide

### Prerequisites

- Node.js `v18+` or `v20+`
- Python `3.10+` (Python 3.12 recommended)
- `pip` & virtual environment tools

### 1. Environment Configuration

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development

# Frontend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# OpenWeb Ninja / JSearch API Credentials
JSEARCH_API_KEY=your_openwebninja_api_key_here
JSEARCH_BASE_URL=https://api.openwebninja.com/jsearch/search-v2

# Database Connection (Supabase / Local Postgres)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres

# OpenRouter / Gemini LLM Key
OPENROUTER_API_KEY=your_openrouter_api_key
```

---

### 2. Running the Backend Server (FastAPI)

```bash
# Navigate to project directory
cd Sathyanantham-AI-Studio

# Install Python dependencies
pip install -r backend/python/requirements.txt

# Run FastAPI backend with Uvicorn
python backend/python/main.py
```

The backend server will start on `http://localhost:8000`.

---

### 3. Running the Frontend Application (Next.js 15)

```bash
# Install npm dependencies
npm install

# Start Next.js development server
npm run dev
```

Open `http://localhost:3000` in your browser to view the application:
- **Public Portfolio**: `http://localhost:3000`
- **Recruiter OS Dashboard**: `http://localhost:3000/admin/jobs`

---

### 4. Executing Automated Test Suites

```bash
# Run JSearch Provider & MCP Discovery Unit Tests
python -m pytest backend/python/tests/test_jsearch_provider.py backend/python/mcp/job_discovery/tests/ -v
```

---

## 🔌 10 Standard MCP Tools Reference

The Job Discovery MCP Server exposes 10 standard tools for AI agent interaction:

| MCP Tool | Description |
| :--- | :--- |
| `search_jobs(query, location, remote_only, limit)` | Executes rate-limit efficient single-call search combining roles and target locations across live job boards. |
| `get_job(source, source_job_id)` | Fetches details for a single job posting by ID. |
| `get_jobs(job_ids)` | Batch fetch by source:job_id pairs. |
| `get_new_jobs(since, limit)` | Delta sync for newly indexed postings. |
| `search_jobs_for_profile(profile, limit)` | Queries matching jobs based on candidate tech stack. |
| `get_provider_status()` | Real-time health, latency, error count, and circuit breaker status. |
| `refresh_job(source, source_job_id)` | Re-fetches a job to verify listing availability. |
| `save_job(job)` | Database persistence interface (managed by `job_repository.py`). |
| `health_check()` | Verifies MCP server health and active provider status. |
| `search_companies(query, limit)` | Discovers hiring companies across active feeds. |

---

## 👨‍💻 About Sathyanantham V

Frontend Architect and Lead Software Engineer with **13+ years** designing and scaling enterprise UI platforms, Micro Frontend ecosystems (Module Federation), and AI-assisted engineering workflows across Retail, Digital Commerce, Banking, and Order Management.

- 📧 **Email**: [v.sathyanantham@gmail.com](mailto:v.sathyanantham@gmail.com)
- 💼 **LinkedIn**: [linkedin.com/in/sathyanantham-v-646b911b](https://linkedin.com/in/sathyanantham-v-646b911b)
- 🌐 **Portfolio**: [sathyanantham-portfolio-tv.vercel.app](https://sathyanantham-portfolio-tv.vercel.app/)

---

<p align="center"><i>Sathyanantham V — Enterprise AI Studio & Autonomous Recruiter OS</i></p>
