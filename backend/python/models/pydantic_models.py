from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

# ============================================================================
# Core Chat & Visitor Models (Existing)
# ============================================================================
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    session_id: Optional[str] = "session-default"

class ContactFormRequest(BaseModel):
    name: str
    email: str
    message: str
    company: Optional[str] = ""
    budget: Optional[str] = ""
    purpose: Optional[str] = ""

class EventRequest(BaseModel):
    session_id: str
    event_type: str
    details: Optional[Dict[str, Any]] = None
    country: Optional[str] = None
    city: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None

class AdminLoginRequest(BaseModel):
    password: str

class CmsUpsertRequest(BaseModel):
    table_name: str
    item: Dict[str, Any]

class CmsDeleteRequest(BaseModel):
    table_name: str
    item_id: int

class PresenceToggleRequest(BaseModel):
    is_online: bool

# ============================================================================
# Phase 1 Domain Models: User Profile & Automation Settings
# ============================================================================
class UserProfileModel(BaseModel):
    id: Optional[str] = None
    full_name: str
    email: str
    phone: str
    location: str
    work_authorization: str
    years_of_experience: float
    notice_period_days: int = 0
    current_salary: Optional[float] = None
    expected_salary_min: Optional[float] = None
    primary_skills: List[str] = []
    secondary_skills: List[str] = []
    experience_history: List[Dict[str, Any]] = []
    education_history: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    portfolio_urls: Dict[str, str] = {}
    answers_to_common_questions: Dict[str, Any] = {}
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    work_authorization: Optional[str] = None
    years_of_experience: Optional[float] = None
    notice_period_days: Optional[int] = None
    current_salary: Optional[float] = None
    expected_salary_min: Optional[float] = None
    primary_skills: Optional[List[str]] = None
    secondary_skills: Optional[List[str]] = None
    experience_history: Optional[List[Dict[str, Any]]] = None
    education_history: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    portfolio_urls: Optional[Dict[str, str]] = None
    answers_to_common_questions: Optional[Dict[str, Any]] = None

class AutomationSettingsModel(BaseModel):
    id: Optional[str] = None
    user_profile_id: Optional[str] = None
    daily_application_limit: int = 10
    min_ats_score_threshold: float = 75.00
    profile_ats_threshold: float = 75.00
    jd_match_threshold: float = 50.00
    auto_apply_enabled: bool = False
    require_human_review_for_apply: bool = True
    require_human_review_for_email: bool = True
    target_titles: List[str] = ["Lead Frontend Architect", "Principal UI Platform Engineer", "Senior UI Developer", "React Developer", "AI Engineer"]
    target_roles: List[str] = ["Senior UI Developer", "React Developer", "Lead Software Engineer", "AI Engineer"]
    target_locations: List[str] = ["Coimbatore", "Bangalore", "Chennai", "India", "Remote"]
    remote_preference: str = "Local + Remote"
    experience_levels: List[str] = ["Senior", "Lead"]
    employment_types: List[str] = ["Full-time", "Contract"]
    job_recency_hours: int = 24
    daily_schedule_time: str = "08:00 AM IST"
    blacklisted_companies: List[str] = []
    blacklisted_keywords: List[str] = []
    is_active: bool = True
    updated_at: Optional[str] = None

class AutomationSettingsUpdate(BaseModel):
    daily_application_limit: Optional[int] = None
    min_ats_score_threshold: Optional[float] = None
    profile_ats_threshold: Optional[float] = None
    jd_match_threshold: Optional[float] = None
    auto_apply_enabled: Optional[bool] = None
    require_human_review_for_apply: Optional[bool] = None
    require_human_review_for_email: Optional[bool] = None
    target_titles: Optional[List[str]] = None
    target_roles: Optional[List[str]] = None
    target_locations: Optional[List[str]] = None
    remote_preference: Optional[str] = None
    experience_levels: Optional[List[str]] = None
    employment_types: Optional[List[str]] = None
    job_recency_hours: Optional[int] = None
    daily_schedule_time: Optional[str] = None
    blacklisted_companies: Optional[List[str]] = None
    blacklisted_keywords: Optional[List[str]] = None
    is_active: Optional[bool] = None
    gdrive_sync_enabled: Optional[bool] = None
    gdrive_sync_schedule_time: Optional[str] = None
    gdrive_sync_frequency: Optional[str] = None
    gdrive_sync_last_run: Optional[str] = None
    gdrive_sync_last_status: Optional[str] = None
    gdrive_sync_last_file: Optional[str] = None
    gdrive_sync_last_jobs_count: Optional[int] = None

# ============================================================================
# Job Discovery, ATS Scoring & Pipeline Models
# ============================================================================
class JobDiscoveryQuery(BaseModel):
    title: str = "Lead Frontend Architect"
    keywords: List[str] = ["React", "TypeScript", "Micro Frontends", "AI"]
    location: Optional[str] = "Remote"

class JDSearchRequest(BaseModel):
    jd_text: str
    target_role: Optional[str] = None
    custom_threshold: Optional[float] = None
    limit: Optional[int] = 30

class JobModel(BaseModel):
    id: Optional[str] = None
    source_id: Optional[str] = None
    external_job_id: Optional[str] = None
    title: str
    company: str
    location: Optional[str] = "Remote"
    location_type: Optional[str] = "Remote"
    employment_type: Optional[str] = "Full-time"
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = "USD"
    description_raw: str
    requirements_clean: Optional[str] = None
    tech_stack: List[str] = []
    apply_url: str
    portal_type: Optional[str] = "custom"
    status: str = "DISCOVERED"
    match_type: Optional[str] = "PROFILE_MATCH"
    reference_jd_summary: Optional[str] = None
    match_score: Optional[float] = None
    published_time: Optional[str] = None
    idempotency_key: str
    discovered_at: Optional[str] = None
    updated_at: Optional[str] = None

class JobEvaluationRequest(BaseModel):
    job_id: str
    title: str
    company: str
    description: str

class JobScoreModel(BaseModel):
    id: Optional[str] = None
    job_id: str
    overall_score: float
    skills_match_score: float
    experience_match_score: float
    seniority_match_score: float
    missing_skills: List[str] = []
    matching_skills: List[str] = []
    evaluation_summary: str
    score_breakdown: Dict[str, Any] = {}
    llm_model_used: str = "configured-llm"
    evaluated_at: Optional[str] = None

class TailorResumeRequest(BaseModel):
    job_id: Optional[str] = None
    job_description: str
    target_role: str
    candidate_profile: Optional[Dict[str, Any]] = None

class ResumeVersionModel(BaseModel):
    id: Optional[str] = None
    job_id: Optional[str] = None
    version_name: str
    latex_source: str
    pdf_url: str
    google_drive_file_id: Optional[str] = None
    tailored_keywords: List[str] = []
    changes_summary: Optional[str] = None
    status: str = "GENERATED"
    idempotency_key: str
    created_at: Optional[str] = None

class ApplicationSubmitRequest(BaseModel):
    job_id: str
    job_url: str
    custom_resume_url: Optional[str] = None

class ApplicationApprovalRequest(BaseModel):
    application_id: str
    approved: bool
    notes: Optional[str] = None

class ApplicationPrepareRequest(BaseModel):
    job_id: str
    resume_version_id: Optional[str] = None

class ApplicationModel(BaseModel):
    id: Optional[str] = None
    job_id: str
    resume_version_id: Optional[str] = None
    status: str = "DRAFT"
    form_payload: Dict[str, Any] = {}
    submission_method: str = "mcp_browserbase"
    external_confirmation_id: Optional[str] = None
    screenshot_url: Optional[str] = None
    manual_reason: Optional[str] = None
    human_reviewer_notes: Optional[str] = None
    submitted_at: Optional[str] = None
    idempotency_key: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class RecruiterModel(BaseModel):
    id: Optional[str] = None
    company: str
    name: str
    email: str
    linkedin_url: Optional[str] = None
    role_title: Optional[str] = None
    relationship_stage: str = "DISCOVERED"

class ReferralModel(BaseModel):
    id: Optional[str] = None
    job_id: Optional[str] = None
    company: str
    contact_name: str
    contact_email: Optional[str] = None
    contact_linkedin: Optional[str] = None
    connection_degree: str = "Cold"
    status: str = "DISCOVERED"

class EmailMessageModel(BaseModel):
    id: Optional[str] = None
    job_id: Optional[str] = None
    recruiter_id: Optional[str] = None
    gmail_message_id: Optional[str] = None
    gmail_thread_id: Optional[str] = None
    direction: str
    sender: str
    recipient: str
    subject: str
    body_text: str
    body_html: Optional[str] = None
    ai_classification: Optional[str] = None
    ai_extracted_details: Dict[str, Any] = {}
    requires_action: bool = False
    action_status: str = "PENDING"

class AuditLogEntry(BaseModel):
    id: Optional[str] = None
    actor_type: str # 'SYSTEM_AGENT', 'ADMIN_HUMAN', 'MCP_TOOL'
    actor_id: str
    action: str
    entity_type: str
    entity_id: str
    ip_address: Optional[str] = None
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    justification_rationale: Optional[str] = None
    timestamp: Optional[str] = None
