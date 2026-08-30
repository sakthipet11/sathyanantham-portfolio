# Sathyanantham AI Studio — Autonomous Multi-Agent Architecture Specification

> **Version**: 3.0.0 (Production-Grade Multi-Agent Recruiter OS & Auto-Apply Architecture)  
> **Candidate Profile Target**: Sathyanantham V (Lead Software Engineer & Frontend Architect — 13.5+ Years Experience)  
> **Platform Core**: Next.js 15 App Router with React 19 (Frontend) & FastAPI v2.0.0 Multi-Agent Engine (Backend)  
> **Database Layer**: PostgreSQL Local (`postgresql://postgres:postgres@127.0.0.1:5432/postgres`) / Supabase Cloud (8 Migrations)  
> **Testing & Resilience**: 28 Playwright E2E Tests (100% Pass Rate across Desktop & Mobile) + 11 Pytest Backend Suites  

---

## 🤖 Multi-Agent Ecosystem Overview

The platform coordinates **8 Autonomous AI Agents & Orchestration Services** operating in synergy with Human-in-the-Loop gates to automate job discovery, ATS evaluation, selective staging, document generation, multi-job headless browser auto-apply, warm referral discovery, and cloud synchronization.

```
                                  [ Candidate Truth Store & RAG Knowledge Base ]
                                                        │
                                                        ▼
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│  1. Discovery Agent  │ ───►  │  2. Fit & Staging    │ ───►  │ 3. Document Agent    │
│  (Multi-Provider)    │        │  (ATS ≥ 75% Auto)    │        │  (Resume + Cover Ltr)│
└──────────────────────┘        └──────────────────────┘        └──────────────────────┘
                                                                             │
                                                                             ▼
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│ 6. Recruiter Email   │ ◄───  │ 5. Referral Agent    │ ◄───  │ 4. Auto-Apply Agent  │
│ (Gmail SMTP Attach)  │        │ (1st-Deg + Apify GM) │        │ (Playwright + LLM)   │
└──────────────────────┘        └──────────────────────┘        └──────────────────────┘
           │                                                                 │
           ▼                                                                 ▼
┌──────────────────────┐                                        ┌──────────────────────┐
│ 7. GDrive Sync Agent │                                        │ 8. Handoff & Copilot │
│ (XLSX & Resumes)     │                                        │ (WebSocket & Twin)   │
└──────────────────────┘                                        └──────────────────────┘
```

---

## 📋 Comprehensive Agent Specifications

### 1. Multi-Provider Job Discovery Agent (`JobDiscoveryAgent` & `JobDiscoveryService`)
- **Location**: `backend/python/services/job_discovery_service.py`, `job_deduplication_service.py`, `job_normalization_service.py`
- **Goal**: Ingest live job listings across multi-channel aggregators (JSearch API, Naukri, LinkedIn, Instahyre) with zero duplicate records and minimal rate-limit consumption.
- **Key Capabilities**:
  - Combined multi-provider search pooling target titles (`Lead Software Engineer`, `Frontend Architect`, `Staff UI Engineer`) and locations.
  - Canonical Fingerprinting: Fuzzy deduplication across company name, normalized title, and location.
  - Storage into local `jobs` table with explicit database commits.

### 2. Job Fit Scoring & Selective Staging Agent (`JobScoringAgent` & `JobScoringService`)
- **Location**: `backend/python/services/job_scoring_service.py`, `resume_matching_service.py`, `backend/python/repositories/application_v2_repository.py`
- **Goal**: Score jobs against candidate profile (13.5+ years experience, Next.js/React, TypeScript, Micro Frontends, AI integration) and enforce selective auto-staging.
- **Selective Auto-Staging Policy**:
  - **ATS Match Score $\ge 75\%$**: Automatically qualified as `QUALIFIED` and auto-staged into `applications_v2` in `READY_FOR_REVIEW` status, paired with a tailored resume variant and candidate-grounded cover letter.
  - **ATS Match Score $< 75\%$**: Preserved in `jobs` table in `READY_FOR_REVIEW` without automatic staging into `applications_v2`, reserving discretion for manual human inspection.
- **1-Click Interactive Staging UI** (`app/admin/jobs/page.tsx` & ATS Radar modal):
  - Unstaged jobs display an active **Stage** button.
  - Immediate transition to a disabled **Staged** state (`<CheckCircle2 /> Staged`) once staged, preventing duplicate operations.
  - Deduplicated queries via PostgreSQL `DISTINCT ON (job_id)` with `evaluated_at DESC`.

### 3. Document Synthesis Agent (`ResumeAgent` & `CoverLetterService`)
- **Location**: `backend/python/services/cover_letter_service.py` & `candidate_profile_service.py`
- **Goal**: Concurrently generate tailored, candidate-grounded application packages.
- **Key Capabilities**:
  - Parallel generation via `asyncio.gather` pairing tailored PDF resumes (`public/downloads/`) with dynamically drafted cover letters (`public/downloads/cover_letters/`).
  - Strict grounding constraint: Strictly constrained to candidate verified achievements, preventing LLM hallucinations.

### 4. Autonomous Multi-Job Auto-Apply Agent (`ApplicationQueueService` & `PlaywrightAutomationService`)
- **Location**: `backend/python/services/application_queue_service.py`, `playwright_automation_service.py`, `form_mapping_service.py`, `portal_mapping_cache_service.py`
- **Goal**: Execute end-to-end headless browser job applications across top ATS platforms (Greenhouse, Lever, Workday, Ashby, Instahyre, Hirist, Custom) with stealth anti-detection and full screenshot audit trails.
- **Key Capabilities**:
  - **Headless Browser Controller**: Chromium lifecycle management, stealth headers, viewport geometry, file attachment uploads, and dynamic element interaction.
  - **LLM-Powered Semantic Form Mapping**: Converts live DOM input elements into candidate profile keys, backed by 70+ heuristic fallback regex patterns.
  - **Persistent Mapping Cache**: Caches verified form selectors with domain-level reliability tracking in `portal_form_mappings`; auto-deprecates if form HTML structure shifts.
  - **Queue Orchestration & Rate Limiting**: Portal-specific delays (Greenhouse: 30s, Lever: 20s, Workday: 60s) with exponential retry backoff (30s, 60s, 120s).
  - **Gate & Wall Detection**: Detects CAPTCHA, login walls, and multi-factor gates, automatically transitioning the application to `NEEDS_REVIEW` and capturing audit screenshots.

### 5. Automated Referral Discovery & Warm Network Agent (`ReferralDiscoveryService`)
- **Location**: `backend/python/services/referral_discovery_service.py`, `connection_repository.py`, `apify_recruiter_service.py`
- **Goal**: Maximize interview conversion by routing ATS $\ge 90\%$ opportunities through warm 1st-degree LinkedIn connections and corporate recruiter contacts.
- **Job-First Workflow Rules**:
  1. **Direct DB Ingestion**: Queries local high-fit jobs (`ATS >= 90`) directly from `job_repository` without scraper calls.
  2. **Entity Normalization**: Strips legal entity suffixes via `company_normalization_service.py` (`Google LLC` $\to$ `Google`).
  3. **1st-Degree LinkedIn Matching**: Searches candidate's 731-row LinkedIn network ingested from `docs/Connections.csv` into the `connections` table.
  4. **Apify Google Maps Fallback**: For companies lacking direct 1st-degree contacts, dynamically queries Apify actor `lukaskrivka/google-maps-with-contact-details` for verified HR and office emails.
  5. **Standard 7-Column Persistence**: Formats all contacts across `First Name`, `Last Name`, `URL`, `Email Address`, `Company`, `Position`, and `Connected On`.
  6. **Parallel Document Synthesis**: Calls `asyncio.gather` for simultaneous tailored cover letter creation and physical resume selection.
  7. **Human Review Gate**: Displays candidate referrals on `/admin/referrals` awaiting 1-click approval.

### 6. Recruiter Email Outreach Agent (`EmailAgent` & `GmailMCPClient`)
- **Location**: `backend/python/services/gmail_mcp_client.py` & `backend/python/services/email_classification_service.py`
- **Goal**: Dispatch approved outreach messages with dual MIME attachments and track follow-up cadences.
- **Key Capabilities**:
  - Dual physical attachment dispatch (Tailored PDF Resume + Custom Cover Letter) via authenticated Gmail SMTP (`smtp.gmail.com:465`).
  - Automated 5-day follow-up tracking with status progression (`READY_FOR_REVIEW` $\to$ `SENT` $\to$ `FOLLOW_UP_DUE`).
  - Inbound email classification (`JOB_OPPORTUNITY`, `INTERVIEW_INVITE`, `REJECTION`, `FOLLOW_UP`, `SPAM`) with context-aware auto-response drafts.

### 7. Google Drive Cloud Sync Agent (`GDriveSyncService` & `GDriveSyncScheduler`)
- **Location**: `backend/python/services/gdrive_sync_service.py`, `gdrive_sync_scheduler.py`, `app/api/admin/gdrive-sync/`
- **Goal**: Maintain real-time cloud synchronization between the local environment and Google Drive.
- **Key Capabilities**:
  - Automatically converts and syncs daily job tracker spreadsheets (`job_tracker_YYYY-MM-DD.xlsx`) directly to the target Google Drive directory (`GOOGLE_DRIVE_FOLDER_ID`).
  - Syncs version-controlled physical resume variants to cloud storage.
  - Background scheduler executing on FastAPI startup with manual 1-click sync endpoints (`/api/admin/gdrive-sync/run`, `/upload`).

### 8. Recruiter Live Handoff & AI Copilot Agent (`RecruiterInboxAgent` & `AIJobCopilotService`)
- **Location**: `backend/python/services/ai_job_copilot_service.py`, `websocket_service.py`, `backend/python/api/recruiter_inbox.py`
- **Goal**: Engage live portfolio visitors, answer technical architecture questions via RAG, and provide an interactive AI assistant for the candidate.
- **Key Capabilities**:
  - Dual WebSocket presence sync connecting portfolio visitor inquiries to the `/admin/recruiter-inbox` console.
  - Grounded RAG knowledge retrieval answering questions about candidate achievements, system design, and frontend architecture.
  - Interactive Copilot chat (`/admin/agent`) for ad-hoc market analysis, interview preparation, and salary negotiation strategy.

---

## 📸 Live Application Execution & Audit Screenshots

The multi-agent system captures viewport screenshots during automated browser runs, ensuring complete safety and verification for candidate applications:

### 1. Live Form Autofill & Policy Validation
![Live Auto-Apply Form Filling Sample](docs/images/auto_apply_form_filling_sample.png)
*Figure 1: Headless Playwright engine executing semantic field mapping, populating candidate credentials, and validating terms on live portal.*

### 2. Resume PDF Attachment & Parsing
![Live Auto-Apply Resume Upload Sample](docs/images/auto_apply_resume_upload_sample.png)
*Figure 2: Automatic selection and multi-part upload of candidate tailored PDF resume with live parsing feedback.*

### 3. Portal Auth Wall & Review Gating
![Live Auto-Apply Portal Auth Gating Sample](docs/images/auto_apply_portal_auth_sample.png)
*Figure 3: Safe gate detection when credential or OTP authentication is required, transitioning the application to NEEDS_REVIEW.*

---

## 🔄 Autonomous Multi-Job Auto-Apply Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User (/admin/jobs)
    participant UI as Bulk Action Bar & Progress Modal
    participant API as AutoApply API (/api/v2/applications)
    participant Queue as ApplicationQueueService
    participant Cache as PortalMappingCacheService
    participant LLM as FormMappingService (LLM)
    participant Browser as PlaywrightAutomationService
    participant DB as PostgreSQL / Supabase (008 Migration)

    Admin->>UI: Select multiple jobs & click "Apply to Selected"
    UI->>API: POST /bulk-prepare { job_ids: [...] }
    API->>DB: Create application_batches record & batch_applications
    API-->>UI: Return batch_id & initial QUEUED status
    UI->>API: POST /auto-apply { batch_id }
    API->>Queue: process_batch(batch_id) (Background Async Task)

    loop For each job in batch
        Queue->>Browser: navigate_to_job(application_url)
        Browser-->>Queue: Page DOM & form structure HTML
        Queue->>Cache: get_portal_mapping(domain, form_signature)
        alt Mapping Found in Cache
            Cache-->>Queue: Cached field selectors
        else Mapping Not Cached
            Queue->>LLM: analyze_form_and_map_fields(form_html, candidate_profile)
            LLM-->>Queue: Semantic field mappings JSON
            Queue->>Cache: save_portal_mapping(domain, mapping)
        end

        Queue->>Browser: fill_form(mapping, profile, resume_path)
        alt CAPTCHA or Login Wall Detected
            Browser-->>Queue: Flagged: NEEDS_REVIEW + Audit Screenshot
            Queue->>DB: Update application status="NEEDS_REVIEW"
        else Form Filled Successfully
            Browser->>Browser: submit_form() (or human review gate)
            Browser-->>Queue: Confirmation screenshot & URL
            Queue->>DB: Update application status="SUBMITTED"
        end

        Queue->>DB: Update batch counters (processed, succeeded, failed)
        UI->>API: GET /batch/{batch_id}/status (Polling/Live update)
        API-->>UI: Real-time progress percentage & per-job status
    end
```

---

## 🤝 Job-First Automated Referral Execution Engine

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin OS / Automated Scheduler
    participant RefService as ReferralDiscoveryService
    participant Norm as CompanyNormalizationService
    participant ConnRepo as ConnectionRepository (7 Columns)
    participant Apify as ApifyRecruiterService (Google Maps)
    participant CL as CoverLetterService (asyncio.gather)
    participant Repo as ReferralRepository (PostgreSQL Committed)
    participant Gmail as GmailMCPClient (SMTP)

    Admin->>RefService: Trigger Referral Discovery (ATS >= 90)
    RefService->>RefService: Fetch jobs from local DB (limit=200)
    
    loop For each High-Fit Job
        RefService->>Norm: normalize_company(job.company)
        Norm-->>RefService: Normalized Company Name

        RefService->>ConnRepo: match_1st_degree_contact(company)
        alt 1st-Degree Match Found (731 LinkedIn Contacts)
            ConnRepo-->>RefService: Verified Warm Contact
        else No Direct Match
            RefService->>Apify: search_company_hr_contact(company, location)
            Apify-->>RefService: Scraped Office / HR Email & Details
            RefService->>ConnRepo: Persist 7-Column Scraped Contact
        end

        RefService->>CL: asyncio.gather(generate_cover_letter(), select_tailored_pdf())
        CL-->>RefService: Tailored Cover Letter + PDF Resume Path

        RefService->>Repo: Create Referral (READY_FOR_REVIEW, UUID, committed)
    end

    Admin->>Repo: Approve Referral on /admin/referrals
    Repo->>Gmail: send_message(to, subject, body, attachments=[PDF, TXT])
    Gmail-->>Repo: Message Sent
    Repo->>Repo: Update status="SENT", follow_up_due_at=NOW() + 5 days
```

---

## 🔒 Safety Guardrails & Human-in-the-Loop Governance

1. **Selective Auto-Staging Gate**: Jobs with ATS match score $\ge 75\%$ are automatically staged into `applications_v2` in `READY_FOR_REVIEW` status. Low-fit jobs ($< 75\%$) are never blindly auto-applied; they remain in `jobs` for discretionary review.
2. **Review Wall Protection**: When Playwright detects CAPTCHAs, bot challenges, or login screens, the automation immediately flags the application as `NEEDS_REVIEW`, saves an audit screenshot, and pauses submission.
3. **No Unsolicited Cold Blasting**: Automated referral discovery prepares packages in `READY_FOR_REVIEW`. No outbound emails are dispatched without explicit admin approval.
4. **Candidate Grounding Guarantee**: All generated cover letters and outreach copies are strictly anchored to verified facts (13.5+ years experience, Lead Frontend Architect, React, Next.js, Micro Frontends). LLMs are forbidden from hallucinating past roles.
5. **Dual Attachment Guarantee**: Outbound emails attach both the tailored PDF resume variant and candidate cover letter.
6. **Polite Portal Rate Limiting**: Exponential backoff (30s, 60s, 120s) and vendor delays ensure anti-detection compliance.

---

## 🧪 Verification & Operational Commands

```bash
# 1. Start Python FastAPI Multi-Agent Engine (Port 8000)
python -m uvicorn backend.python.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Start Next.js 15 Recruiter OS Frontend (Port 3000)
npm run dev

# 3. Run Complete Backend Pytest Suites (11 Suites)
python -m pytest backend/python/tests/ -v

# 4. Run Full Playwright E2E Test Suite (28 Tests Passing across Desktop & Mobile)
npm run test:e2e

# 5. Run Targeted Connections & Referral Pipeline Tests
python -m pytest backend/python/tests/test_connections_pipeline.py -v
python -m pytest backend/python/tests/test_automated_referral_pipeline.py -v

# 6. Test Single-Job Headless Auto-Apply via CLI
python backend/python/services/application_queue_service.py --test-single <job_id>

# 7. Trigger Manual Google Drive Cloud Sync
curl -X POST http://localhost:3000/api/admin/gdrive-sync/run
```
