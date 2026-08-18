---
name: portfolio-architect
description: Comprehensive architecture skill for operating and expanding Sathyanantham V's Multi-Agent Portfolio & Recruiter OS platform.
---

# Portfolio Architect Skill

This skill provides complete instructions, component specifications, database data flows, and operational workflows for managing Sathyanantham V's AI-Powered Digital Twin & Multi-Agent Recruiter Automation system.

## 🎯 Architecture Overview

The system is built on a clean 4-layer architecture without wrapper folders:

1. **Frontend App (`app/`, `components/`, `lib/`, `hooks/`, `public/`)**: Next.js 15 App Router located directly at root level providing public interactive portfolio views (`ProjectsSection`, `ExperienceSection`, `SkillsMatrix` dynamically fetching from DB) and an Admin OS console (`/admin/dashboard`, `/admin/jobs`, `/admin/applications`, `/admin/resumes`, `/admin/referrals`, `/admin/recruiter-inbox`, `/admin/automation`, `/admin/analytics`, `/admin/settings`).
2. **Backend Engine (`backend/python/`)**: FastAPI server housing 6 autonomous AI agents (`job_discovery_agent`, `job_scoring_agent`, `resume_agent`, `application_agent`, `email_agent`, `referral_agent`), OpenRouter AI streaming, RAG knowledge retrieval, and WebSocket visitor handoff.
3. **Database Layer (`database/`)**: PostgreSQL & Supabase database tables (`migrations/001_initial_schema.sql`, `migrations/002_multi_agent_tables.sql`, `migrations/003_job_automation_schema.sql`) and seed files (`seeds/001_seed_portfolio_data.sql`, `seeds/002_seed_jobs_and_agents.sql`, `seeds/003_user_profile_seed.sql`) storing 6 enterprise projects, 3 experience milestones, 30 skills, candidate profiles, job listings, ATS match scores, applications, and recruiter emails.
4. **Infrastructure & MCP Layer (`infrastructure/` & `backend/python/mcp/`)**: Model Context Protocol servers (`browserbase`, `google_drive`, `gmail`, `postgres`), Cloud Scheduler cron configs, and Docker deployment manifests.

## 🗄️ Database & Repository Data Flow

All components use live PostgreSQL database connections (`postgresql://postgres:postgres@127.0.0.1:5432/postgres`) via `psycopg2` direct queries when running locally or Supabase Cloud when deployed:

- **Portfolio Content API**: GET `/api/portfolio/projects`, GET `/api/portfolio/experience`, GET `/api/portfolio/skills`, GET `/api/portfolio/profile`
- **Job Discovery & Matching API**: GET `/api/v2/jobs`, GET `/api/v2/jobs/metrics`, POST `/api/v2/jobs/{job_id}/score`
- **Application Pipeline API**: GET `/api/v2/applications`, POST `/api/v2/applications/{app_id}/status`
- **Referral Network API**: GET `/api/v2/referrals`, POST `/api/v2/referrals/{ref_id}/status`

## 🤖 Agent Roles & Tool Capabilities

### 1. `job_discovery_agent`
- **Goal**: Scan engineering portals and LinkedIn for Lead Frontend Architect & Micro Frontend roles.
- **API Endpoint**: `POST /api/automation/jobs/discover`

### 2. `job_scoring_agent`
- **Goal**: Match job descriptions against candidate profile (13+ years React, TypeScript, Micro Frontends).
- **API Endpoint**: `POST /api/v2/jobs/{job_id}/score`

### 3. `resume_agent`
- **Goal**: Tailor custom PDF and LaTeX resumes based on target role keywords.
- **API Endpoint**: `POST /api/jobs/tailor-resume`

### 4. `application_agent`
- **Goal**: Automate application submission via `mcp_browserbase`.
- **API Endpoint**: `POST /api/jobs/apply`

### 5. `email_agent`
- **Goal**: Draft and send recruiter outreach & follow-up emails via `mcp_gmail`.

### 6. `referral_agent`
- **Goal**: Find target company employees and craft connection requests.

## 🚀 Execution & Operational Workflows

### Setup & Seed Database
```bash
python database/setup_local_db.py
```

### Run Frontend & Backend Dev Servers
```bash
# Terminal 1: Next.js App
npm run dev

# Terminal 2: FastAPI Backend
python -m uvicorn backend.python.main:app --host 0.0.0.0 --port 8000 --reload
```

### Execute Multi-Agent Automation Pipeline
```bash
curl -X POST "http://localhost:8000/api/automation/jobs/discover" -H "Content-Type: application/json" -d '{"target_role": "Lead Frontend Architect"}'
```

## 📜 Key Configuration & Repository Files

- **Backend Entrypoint**: [main.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/main.py)
- **Portfolio API Router**: [portfolio.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/api/portfolio.py)
- **Supabase & Postgres Repository**: [supabase_repo.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/repositories/supabase_repo.py)
- **Job Repository**: [job_repository.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/repositories/job_repository.py)
- **Application Repository**: [application_repository.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/repositories/application_repository.py)
- **Dynamic Projects Section**: [ProjectsSection.tsx](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/components/sections/ProjectsSection.tsx)
- **Dynamic Experience Section**: [ExperienceSection.tsx](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/components/sections/ExperienceSection.tsx)
- **Dynamic Skills Matrix**: [SkillsMatrix.tsx](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/components/sections/SkillsMatrix.tsx)
