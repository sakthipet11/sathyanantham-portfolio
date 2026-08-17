---
name: portfolio-architect
description: Comprehensive architecture skill for operating and expanding Sathyanantham V's Multi-Agent Portfolio & Recruiter OS platform.
---

# Portfolio Architect Skill

This skill provides complete instructions, component specifications, and operational workflows for managing Sathyanantham V's AI-Powered Digital Twin & Multi-Agent Recruiter Automation system.

## 🎯 Architecture Overview

The system is built on a clean 4-layer architecture without wrapper folders:

1. **Frontend App (`app/`, `components/`, `lib/`, `hooks/`, `public/`)**: Next.js 15 App Router located directly at root level providing public interactive portfolio views and an Admin OS console (`/admin/dashboard`, `/admin/jobs`, `/admin/applications`, `/admin/resumes`, `/admin/referrals`, `/admin/recruiter-inbox`, `/admin/automation`, `/admin/analytics`, `/admin/settings`).
2. **Backend Engine (`backend/python/`)**: FastAPI server housing 6 autonomous AI agents (`job_discovery_agent`, `job_scoring_agent`, `resume_agent`, `application_agent`, `email_agent`, `referral_agent`), OpenRouter AI streaming, RAG knowledge retrieval, and WebSocket visitor handoff.
3. **Database Layer (`database/`)**: Supabase PostgreSQL schemas and migrations (`migrations/001_initial_schema.sql`, `migrations/002_multi_agent_tables.sql`) storing visitor analytics, chat logs, job listings, and agent execution logs.
4. **Infrastructure & MCP Layer (`infrastructure/` & `backend/python/mcp/`)**: Model Context Protocol servers (`browserbase`, `google_drive`, `gmail`, `postgres`), Cloud Scheduler cron configs, and Docker deployment manifests.

## 🤖 Agent Roles & Tool Capabilities

### 1. `job_discovery_agent`
- **Goal**: Scan engineering portals and LinkedIn for Lead Frontend Architect & Micro Frontend roles.
- **API Endpoint**: `POST /api/jobs/discover`

### 2. `job_scoring_agent`
- **Goal**: Match job descriptions against candidate profile (13+ years React, TypeScript, Micro Frontends).
- **API Endpoint**: `POST /api/jobs/evaluate`

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

## 🚀 Execution & Triggering Workflows

To execute the full end-to-end multi-agent pipeline:
```bash
# Call the workflow trigger endpoint
curl -X POST "http://localhost:8000/api/jobs/workflow/run?target_role=Lead%20Frontend%20Architect"
```

## 📜 Key Configuration & Files

- **Backend Entrypoint**: [main.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/main.py)
- **Supabase Helper**: [supabase_repo.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/repositories/supabase_repo.py)
- **RAG Knowledge Engine**: [rag_service.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/services/rag_service.py)
- **Multi-Agent Workflow**: [multi_agent_workflow.py](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/backend/python/workflows/multi_agent_workflow.py)
- **Admin OS Dashboard**: [page.tsx](file:///e:/Projects/Own%20projects/protofolio/Sathyanantham-AI-Studio/app/admin/dashboard/page.tsx)
