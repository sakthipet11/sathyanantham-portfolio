# Enterprise Architectural Blueprint & Refactored Repository Structure

## Overview

This repository is structured as a clean, production-grade **Multi-Agent Portfolio & Recruiter Operating System** platform. Next.js 15 App Router (`app/`, `components/`, `lib/`, `hooks/`, `public/`) lives directly at the root of the workspace without any wrapping `frontend/` or `src/` subfolders. The Python AI Multi-Agent engine lives in `backend/python/`, supported by `database/` and `infrastructure/`.

---

## 📁 Clean Repository Folder Structure

```
Sathyanantham-AI-Studio/
│
├── app/                                 # Next.js 15 App Router (Direct Root Level)
│   ├── page.tsx                         # Main Interactive Portfolio & AI Digital Twin Landing
│   ├── layout.tsx                       # Root Layout & Font/Theme Providers
│   ├── globals.css                      # Global Tailwind CSS Styles
│   └── admin/                           # Recruiter OS & Admin Command Center
│       ├── page.tsx                     # Core Telemetry & Live Visitor Handoff Console
│       ├── dashboard/                   # Executive Multi-Agent Control Center
│       ├── jobs/                        # Job Discovery & Match Evaluation Engine
│       ├── applications/                # Application Pipeline & Auto-Tracker
│       ├── resumes/                     # Resume Customizer & Version Manager
│       ├── referrals/                   # Candidate Referral & Outreach Network
│       ├── recruiter-inbox/             # Live Handoff Visitor & Recruiter Chat
│       ├── automation/                  # Multi-Agent Workflow Trigger Control
│       ├── analytics/                   # Deep Visitor & Portfolio Analytics
│       └── settings/                    # API Keys, Supabase & MCP Server Configs
│
├── components/                          # UI Component Modules (ai, canvas, layout, providers, sections, ui)
├── lib/                                 # Shared Utilities, Constants, Store, Supabase Client
├── hooks/                               # Custom React Hooks (useAITwin, useScrollReveal, useReducedMotion)
├── public/                              # Public Static Assets & Images
│
├── backend/                             # Python Backend Engine
│   └── python/
│       ├── main.py                      # FastAPI Entry Point (WebSockets, Routes, MCP)
│       ├── requirements.txt             # Python Dependencies
│       │
│       ├── api/                         # FastAPI Router Endpoints
│       │   ├── admin.py                 # Auth, Analytics, Presence, CMS APIs
│       │   ├── chat.py                  # Visitor Chat Streaming & Knowledge Base Search
│       │   ├── contact.py               # Contact Submissions & Event Logging
│       │   └── jobs.py                  # Job Discovery, Scoring & Workflow Execution APIs
│       │
│       ├── agents/                      # Autonomous AI Agents
│       │   ├── job_discovery_agent/     # Scans platforms for target roles
│       │   ├── job_scoring_agent/       # Evaluates candidate profile match scores
│       │   ├── resume_agent/            # Tailors custom PDF & LaTeX resumes
│       │   ├── application_agent/       # Automates application submissions
│       │   ├── email_agent/             # Handles recruiter email outreach & follow-ups
│       │   └── referral_agent/          # Identifies contacts & drafts referral requests
│       │
│       ├── services/                    # Core Business Services
│       │   ├── ai_providers.py          # OpenRouter streaming LLM integration
│       │   ├── rag_service.py           # Document vector retrieval & knowledge base
│       │   ├── notifications.py         # Resend & email alert services
│       │   └── websocket_service.py     # Real-time WebSocket connection manager
│       │
│       ├── repositories/                # Database Layer Abstractions
│       │   └── supabase_repo.py         # Supabase client helper & ORM queries
│       │
│       ├── workflows/                   # Multi-Agent Orchestrations
│       │   └── multi_agent_workflow.py  # End-to-end pipeline orchestrator
│       │
│       ├── mcp/                         # Model Context Protocol Servers
│       │   ├── browserbase/             # Browser automation MCP server
│       │   ├── google_drive/            # Resume & doc storage MCP server
│       │   ├── gmail/                   # Recruiter outreach MCP server
│       │   └── postgres/                # Vector DB MCP server
│       │
│       └── models/                      # Pydantic Data Models
│           └── pydantic_models.py       # Request/Response schemas
│
├── database/                            # Database Layer
│   ├── migrations/                      # SQL Migrations
│   │   ├── 001_initial_schema.sql       # Profiles, skills, projects, chat, analytics
│   │   └── 002_multi_agent_tables.sql   # Job listings, evaluations, applications, referrals
│   │
│   └── seeds/                           # SQL Seed Data
│       ├── 001_seed_portfolio_data.sql  # Sathyanantham V profile, experience & skills
│       └── 002_seed_jobs_and_agents.sql # Seed job listings & agent defaults
│
└── infrastructure/                      # Infrastructure & Deployment
    ├── cloud-scheduler/
    │   └── cron_jobs.yaml               # Cron jobs for automated job scans & email sync
    ├── pubsub/
    │   └── topics.yaml                  # Pub/Sub topic definitions for agent events
    └── deployment/
        ├── Dockerfile.backend           # Docker container for FastAPI backend
        └── docker-compose.yml           # Container orchestration config
```

---

## ⚡ Local Setup & Execution Guide

### 1. Frontend Next.js App Setup (Root Level)
```bash
# Run Next.js Development Server directly from workspace root
npm run dev
```
- **Public Portfolio**: [http://localhost:3000](http://localhost:3000)
- **Admin OS Console**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Executive Admin OS Dashboard**: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)

### 2. Backend Python FastAPI Setup
```bash
# Activate Python Virtual Environment
.venv\Scripts\activate

# Install Backend Dependencies
pip install -r backend/python/requirements.txt

# Start FastAPI API Server
python -m uvicorn backend.python.main:app --host 0.0.0.0 --port 8000 --reload
```
- **API Root**: [http://localhost:8000](http://localhost:8000)
- **Swagger Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛠️ Verification Commands

- **Type-Check Frontend**: `npm run type-check`
- **Verify Python Compilation**: `python -m py_compile backend/python/main.py`
- **Run Multi-Agent Pipeline Test**: `python -c "from backend.python.workflows.multi_agent_workflow import multi_agent_workflow; print(multi_agent_workflow.run_end_to_end_pipeline())"`
