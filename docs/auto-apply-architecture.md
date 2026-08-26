# AI-Powered Multi-Job Auto-Apply Architecture

## Overview

An autonomous job application system that allows users to select multiple jobs from the discovery pipeline and trigger automated form-filling and submission via Playwright + LLM integration.

---

## Business Requirements

### Primary Flow
1. User reviews discovered jobs in `/admin/jobs`
2. User selects multiple jobs via checkboxes (UI already exists)
3. User clicks "Apply to Selected" button
4. System queues automation tasks per job
5. For each job:
   - Playwright loads application page
   - LLM analyzes form structure (or retrieves cached mapping)
   - System fills form with candidate profile data
   - System submits or flags for manual review
6. Real-time status updates visible on UI
7. User receives completion summary

### Key Constraints
- ✅ **No modifications to existing job discovery functionality**
- ✅ **No mock/stub implementations**
- ✅ **Human review gate for first-time portals**
- ✅ **CAPTCHA/login walls → "Needs Review" status**
- ✅ **Rate limiting to avoid portal bans**
- ✅ **Audit trail with screenshots**

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15 / React 19)                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ /admin/jobs page (existing)                                     │ │
│  │  ├─ Job list with checkboxes (✓ exists)                        │ │
│  │  ├─ BulkActionBar component (✓ exists)                         │ │
│  │  └─ NEW: "Apply to Selected" action                            │ │
│  │                                                                  │ │
│  │ NEW: ApplicationProgressModal                                   │ │
│  │  ├─ Real-time batch progress tracking                          │ │
│  │  ├─ Per-job status indicators                                  │ │
│  │  ├─ Error display with screenshots                             │ │
│  │  └─ Retry/cancel controls                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ▼ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                   Backend API (FastAPI / Python 3.12+)               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ NEW API Routes (/api/v2/applications/)                          │ │
│  │  ├─ POST /bulk-prepare       → Create application batch        │ │
│  │  ├─ POST /auto-apply          → Start automation               │ │
│  │  ├─ GET /batch/:id/status     → Batch progress                 │ │
│  │  ├─ POST /:id/retry           → Retry failed                   │ │
│  │  └─ GET /:id/screenshot       → Error screenshot               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ NEW Services                                                     │ │
│  │  ├─ ApplicationQueueService   → Queue management               │ │
│  │  ├─ PlaywrightAutomationService → Browser automation           │ │
│  │  ├─ FormMappingService        → LLM field mapping              │ │
│  │  └─ PortalMappingCacheService → Mapping cache CRUD             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Playwright Automation Engine                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Browser Session Manager                                          │ │
│  │  ├─ Launch headless browser                                     │ │
│  │  ├─ Navigate to application URL                                 │ │
│  │  ├─ Wait for form load                                          │ │
│  │  ├─ Extract form structure (HTML)                               │ │
│  │  ├─ Fill form fields                                            │ │
│  │  ├─ Upload files (resume, cover letter)                         │ │
│  │  ├─ Take screenshots (success/failure)                          │ │
│  │  ├─ Submit form or flag for review                              │ │
│  │  └─ Cleanup browser session                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   LLM Field Mapping Engine                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Check Portal Mapping Cache                                       │ │
│  │  └─ If cached → Use existing mapping                            │ │
│  │                                                                  │ │
│  │ If NOT cached:                                                   │ │
│  │  ├─ Send form HTML to LLM                                       │ │
│  │  ├─ LLM analyzes structure and field semantics                  │ │
│  │  ├─ LLM generates field mapping JSON                            │ │
│  │  │   {                                                           │ │
│  │  │     "name": "input#applicant-name",                          │ │
│  │  │     "email": "input[type='email']#email",                    │ │
│  │  │     "phone": "input#phone-number",                           │ │
│  │  │     "resume": "input[type='file']#resume-upload",            │ │
│  │  │     ...                                                       │ │
│  │  │   }                                                           │ │
│  │  ├─ Validate mapping                                            │ │
│  │  ├─ For first-time portal → Flag for human review               │ │
│  │  └─ Cache successful mapping                                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Database Layer (PostgreSQL)                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ EXISTING TABLES (✓ No modifications)                            │ │
│  │  ├─ jobs                     → Job listings                     │ │
│  │  ├─ user_profile             → Candidate data                   │ │
│  │  ├─ applications_v2          → Application tracking             │ │
│  │  ├─ application_events       → Event log                        │ │
│  │  └─ audit_logs               → Compliance trail                 │ │
│  │                                                                  │ │
│  │ NEW TABLES                                                       │ │
│  │  ├─ application_batches      → Batch metadata                   │ │
│  │  ├─ portal_form_mappings     → Cached form mappings             │ │
│  │  └─ automation_screenshots   → Screenshot storage               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Table: `application_batches`

Tracks bulk application batches for progress monitoring.

```sql
CREATE TABLE application_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profile(id),
    job_ids UUID[] NOT NULL,
    total_count INT NOT NULL,
    completed_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    needs_review_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'QUEUED', 
    -- 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
    initiated_by VARCHAR(50) DEFAULT 'MANUAL_ADMIN',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_batches_status ON application_batches(status);
CREATE INDEX idx_batches_user ON application_batches(user_profile_id);
```

### New Table: `portal_form_mappings`

Persistent cache for LLM-generated form field mappings.

```sql
CREATE TABLE portal_form_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_identifier VARCHAR(255) NOT NULL UNIQUE,
    -- e.g., "greenhouse:acme-corp", "lever:startup-xyz", "workday:bigcorp"
    portal_type VARCHAR(50) NOT NULL,
    -- 'greenhouse', 'lever', 'workday', 'custom'
    form_structure_hash VARCHAR(64) NOT NULL,
    -- SHA256 hash of form HTML (detect changes)
    field_mappings JSONB NOT NULL,
    -- { "name": "input#full-name", "email": "input#email-field", ... }
    validation_status VARCHAR(50) DEFAULT 'UNVALIDATED',
    -- 'UNVALIDATED', 'HUMAN_REVIEWED', 'VALIDATED', 'DEPRECATED'
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_portal_mappings_identifier ON portal_form_mappings(portal_identifier);
CREATE INDEX idx_portal_mappings_type ON portal_form_mappings(portal_type);
CREATE INDEX idx_portal_mappings_validation ON portal_form_mappings(validation_status);
```

### New Table: `automation_screenshots`

Stores screenshots for audit trail and debugging.

```sql
CREATE TABLE automation_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications_v2(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    screenshot_type VARCHAR(50) NOT NULL,
    -- 'PRE_SUBMIT', 'SUCCESS', 'ERROR', 'CAPTCHA', 'FORM_VALIDATION'
    screenshot_url TEXT NOT NULL,
    -- S3/Supabase Storage URL or base64 data URI
    page_url TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_screenshots_application ON automation_screenshots(application_id);
CREATE INDEX idx_screenshots_type ON automation_screenshots(screenshot_type);
```

---

## API Endpoints

### 1. POST `/api/v2/applications/bulk-prepare`

Initialize a bulk application batch.

**Request:**
```json
{
  "job_ids": ["uuid1", "uuid2", "uuid3"],
  "auto_submit": false  // If false, generate drafts for review
}
```

**Response:**
```json
{
  "batch_id": "batch-uuid",
  "total_count": 3,
  "status": "QUEUED",
  "estimated_duration_minutes": 5
}
```

### 2. POST `/api/v2/applications/auto-apply`

Trigger automated application processing.

**Request:**
```json
{
  "batch_id": "batch-uuid",
  "resume_version_id": "resume-uuid",  // Optional: use specific resume
  "rate_limit_seconds": 30  // Delay between applications
}
```

**Response:**
```json
{
  "batch_id": "batch-uuid",
  "status": "PROCESSING",
  "progress_url": "/api/v2/applications/batch/batch-uuid/status"
}
```

### 3. GET `/api/v2/applications/batch/{batch_id}/status`

Get real-time batch progress.

**Response:**
```json
{
  "batch_id": "batch-uuid",
  "status": "PROCESSING",
  "total_count": 3,
  "completed_count": 1,
  "success_count": 1,
  "failed_count": 0,
  "needs_review_count": 0,
  "applications": [
    {
      "job_id": "uuid1",
      "job_title": "Senior React Developer",
      "company": "Acme Corp",
      "status": "SUBMITTED",
      "submitted_at": "2026-08-25T01:15:00Z",
      "screenshot_url": "/screenshots/uuid1-success.png"
    },
    {
      "job_id": "uuid2",
      "job_title": "Lead Frontend Architect",
      "company": "Tech Startup",
      "status": "PROCESSING",
      "progress_message": "Filling form fields..."
    },
    {
      "job_id": "uuid3",
      "job_title": "UI Platform Engineer",
      "company": "BigCorp",
      "status": "QUEUED",
      "progress_message": "Waiting in queue..."
    }
  ]
}
```

### 4. POST `/api/v2/applications/{application_id}/retry`

Retry a failed application.

**Request:**
```json
{
  "use_manual_mode": false  // If true, opens browser for human intervention
}
```

### 5. GET `/api/v2/applications/{application_id}/screenshot`

Retrieve error screenshot.

**Response:** Image file (PNG/JPEG) or JSON with base64 data.

---

## Service Layer Architecture

### 1. ApplicationQueueService

Manages the application queue and orchestrates batch processing.

**Responsibilities:**
- Add jobs to queue
- Prioritize queue (high-score jobs first)
- Dispatch jobs to automation service
- Track progress and update batch status
- Handle retries for failed applications
- Rate limiting across portals
- Queue persistence

**Key Methods:**
```python
class ApplicationQueueService:
    async def create_batch(job_ids: List[str]) -> str
    async def start_batch_processing(batch_id: str) -> None
    async def get_batch_status(batch_id: str) -> Dict
    async def cancel_batch(batch_id: str) -> None
    async def retry_application(app_id: str) -> None
```

### 2. PlaywrightAutomationService

Core browser automation engine.

**Responsibilities:**
- Launch and manage browser instances
- Navigate to application URLs
- Extract form structure
- Fill form fields with data
- Upload files (resume, cover letter)
- Handle multi-page forms
- Detect CAPTCHAs and login walls
- Take screenshots at key stages
- Submit forms or flag for review
- Clean up browser sessions

**Key Methods:**
```python
class PlaywrightAutomationService:
    async def initialize_browser() -> Browser
    async def navigate_to_job(url: str) -> Page
    async def extract_form_structure(page: Page) -> Dict
    async def fill_form(page: Page, mapping: Dict, data: Dict) -> bool
    async def upload_resume(page: Page, file_path: str) -> bool
    async def take_screenshot(page: Page, type: str) -> str
    async def submit_form(page: Page) -> bool
    async def detect_captcha(page: Page) -> bool
    async def cleanup_browser(browser: Browser) -> None
```

### 3. FormMappingService

LLM-powered field mapping engine.

**Responsibilities:**
- Analyze form HTML structure
- Generate field mappings via LLM
- Validate mappings before use
- Cache successful mappings
- Detect portal changes (hash comparison)
- Flag new portals for human review

**Key Methods:**
```python
class FormMappingService:
    async def get_or_create_mapping(
        portal_id: str, 
        form_html: str
    ) -> Dict
    
    async def generate_mapping_via_llm(
        form_html: str, 
        candidate_fields: List[str]
    ) -> Dict
    
    async def validate_mapping(
        page: Page, 
        mapping: Dict
    ) -> bool
    
    async def cache_mapping(
        portal_id: str, 
        mapping: Dict
    ) -> None
    
    async def invalidate_mapping(portal_id: str) -> None
```

### 4. PortalMappingCacheService

CRUD operations for cached mappings.

**Responsibilities:**
- Store/retrieve portal mappings
- Track success/failure rates
- Manage validation status
- Detect form structure changes
- Provide analytics on portal reliability

**Key Methods:**
```python
class PortalMappingCacheService:
    async def get_cached_mapping(portal_id: str) -> Optional[Dict]
    async def save_mapping(portal_id: str, mapping: Dict) -> None
    async def update_success_count(portal_id: str) -> None
    async def update_failure_count(portal_id: str) -> None
    async def mark_as_validated(portal_id: str) -> None
    async def check_form_changed(portal_id: str, current_hash: str) -> bool
```

---

## State Machine: Application Status Flow

```
DRAFT
  ↓
QUEUED (added to batch)
  ↓
PROCESSING (Playwright automation running)
  ↓
  ├─→ SUBMITTED (success, confirmation captured)
  ├─→ FAILED (automation error, screenshot captured)
  ├─→ NEEDS_REVIEW (CAPTCHA, login wall, new portal)
  └─→ MANUAL_REQUIRED (complex form, unsupported portal)
```

### Status Definitions

- **DRAFT**: Application prepared but not queued
- **QUEUED**: Added to batch, waiting for processing
- **PROCESSING**: Playwright automation in progress
- **SUBMITTED**: Successfully submitted, confirmation captured
- **FAILED**: Automation error (network, timeout, selector mismatch)
- **NEEDS_REVIEW**: Human intervention required (CAPTCHA, login, first-time portal)
- **MANUAL_REQUIRED**: Portal not supported by automation

---

## Error Handling Strategy

### 1. Portal Detection Failures

**Issue**: Can't determine portal type (Greenhouse, Lever, etc.)

**Resolution**:
- Default to "custom" portal type
- Trigger LLM mapping generation
- Flag as "first-time portal" → NEEDS_REVIEW

### 2. Form Structure Changes

**Issue**: Cached mapping fails due to portal UI update

**Detection**:
- Compare form HTML hash with cached hash
- Field selector validation before filling

**Resolution**:
- Invalidate old mapping
- Generate new mapping via LLM
- Flag for human review on first submission

### 3. CAPTCHA / Login Walls

**Detection**:
- Check for CAPTCHA iframe/images
- Check for login forms (email/password fields)

**Resolution**:
- Take screenshot
- Mark status as NEEDS_REVIEW
- Notify user with screenshot and URL

### 4. Network Timeouts

**Resolution**:
- Retry up to 3 times with exponential backoff
- If still failing, mark as FAILED
- Store error details and screenshot

### 5. Selector Mismatches

**Issue**: Generated mapping doesn't match actual form

**Resolution**:
- Log detailed error
- Take screenshot
- Invalidate mapping
- Mark as NEEDS_REVIEW

---

## Rate Limiting Strategy

### Portal-Level Rate Limits

```python
RATE_LIMITS = {
    "greenhouse": {
        "requests_per_minute": 2,
        "delay_seconds": 30
    },
    "lever": {
        "requests_per_minute": 3,
        "delay_seconds": 20
    },
    "workday": {
        "requests_per_minute": 1,
        "delay_seconds": 60
    },
    "custom": {
        "requests_per_minute": 2,
        "delay_seconds": 30
    }
}
```

### Implementation
- Track last request timestamp per portal type
- Enforce minimum delay between requests
- Use distributed lock for concurrent workers (future)
- Randomize delays slightly to avoid detection

---

## Security Considerations

### 1. Terms of Service Compliance

- Rate limiting to avoid bans
- Human review gate for first-time portals
- Clear audit trail of all submissions
- User control via approval workflows

### 2. Data Privacy

- No storing of portal credentials
- Candidate data encrypted in transit
- Screenshots stored securely (S3/Supabase)
- GDPR-compliant data retention

### 3. Error Handling

- No sensitive data in error logs
- Screenshot redaction of personal info
- Secure cleanup of temporary files

---

## LLM Prompt Engineering

### Form Analysis Prompt

```
You are an expert at analyzing HTML forms and mapping fields to structured data.

Given the following HTML form structure from a job application page:

<HTML>
{form_html}
</HTML>

And the following candidate data fields that need to be mapped:
{candidate_fields}

Generate a JSON mapping that identifies the CSS selectors for each field.

Output format:
{
  "name": "input#applicant-name",
  "email": "input[type='email']#email",
  "phone": "input#phone-number",
  "resume": "input[type='file']#resume-upload",
  "cover_letter": "textarea#cover-letter",
  "linkedin": "input#linkedin-profile",
  "years_experience": "input#experience-years",
  "current_company": "input#current-employer",
  ...
}

Rules:
1. Use specific CSS selectors (ID > class > attribute)
2. Only map fields that exist in the HTML
3. Mark required fields with "_required: true" suffix
4. If a field is not found, omit it from the mapping
5. Identify multi-step forms if present

Return ONLY the JSON mapping, no explanation.
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
✅ Database schema (new tables)
✅ Repository layer for new tables
✅ Basic API endpoints skeleton

### Phase 2: Playwright Core (Week 1-2)
✅ Playwright automation service
✅ Browser lifecycle management
✅ Form extraction and screenshot capture
✅ Basic form filling (no LLM yet)

### Phase 3: LLM Integration (Week 2)
✅ Form mapping service with LLM
✅ Portal mapping cache implementation
✅ Mapping validation logic

### Phase 4: Queue System (Week 2-3)
✅ Application queue service
✅ Batch processing logic
✅ Rate limiting implementation
✅ Retry mechanism

### Phase 5: Frontend Integration (Week 3)
✅ Bulk-apply UI components
✅ Progress tracking modal
✅ Real-time status updates
✅ Error display with screenshots

### Phase 6: Testing & Hardening (Week 3-4)
✅ E2E testing with real portals
✅ Error handling validation
✅ Security audit
✅ Performance optimization

---

## Success Metrics

### Automation Success Rate
- **Target**: ≥70% successful submissions without manual intervention
- **Measure**: (SUBMITTED / TOTAL) * 100

### Time Savings
- **Baseline**: 5-10 minutes per manual application
- **Target**: 1-2 minutes per automated application
- **Measure**: Average time from queue to submission

### User Experience
- **Target**: Clear status visibility, <2 second UI updates
- **Measure**: WebSocket latency, UI responsiveness

### Portal Coverage
- **Phase 1**: Greenhouse, Lever (most common ATS)
- **Phase 2**: Workday, custom portals
- **Target**: 80% of discovered jobs supported

---

## Risk Mitigation

### Risk: Portal Bans
**Mitigation**: Conservative rate limits, human review gates, clear user agent

### Risk: LLM Mapping Errors
**Mitigation**: Validation before submission, human review for first-time portals, mapping cache

### Risk: Legal/ToS Violations
**Mitigation**: Transparency with users, rate limiting, audit trail, terms acceptance

### Risk: Data Privacy Breach
**Mitigation**: Encryption, secure storage, no credential caching, GDPR compliance

---

## Future Enhancements

1. **Machine Learning**: Train custom model on successful mappings
2. **Browser Profiles**: Reuse cookies/sessions to avoid re-logins
3. **Headless Detection Bypass**: Stealth plugins for advanced portals
4. **Multi-Provider**: Support for LinkedIn Easy Apply, Indeed Quick Apply
5. **Analytics Dashboard**: Portal success rates, error trends
6. **Webhook Notifications**: Real-time alerts on Slack/Email
7. **A/B Testing**: Test different form-filling strategies
8. **Distributed Queue**: Scale to multiple workers with Redis/RabbitMQ

---

## Appendix: Technology Stack

### Core
- **Browser Automation**: Playwright (Python)
- **LLM**: Anthropic Claude (via existing centralized provider)
- **Queue**: In-memory (Phase 1) → Redis (Future)
- **Storage**: PostgreSQL (metadata), Supabase Storage (screenshots)

### Dependencies
```txt
playwright>=1.40.0
playwright-stealth>=0.1.0  # Anti-bot detection
```

### Environment Variables
```env
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT_MS=30000
AUTO_APPLY_RATE_LIMIT_SECONDS=30
AUTO_APPLY_MAX_RETRIES=3
AUTO_APPLY_SCREENSHOT_STORAGE=supabase  # or 's3', 'local'
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-25  
**Author**: AI Solution Architect  
**Status**: ✅ Ready for Implementation
