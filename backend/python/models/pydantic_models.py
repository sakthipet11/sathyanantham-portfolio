from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

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

class JobDiscoveryQuery(BaseModel):
    title: str = "Lead Frontend Architect"
    keywords: List[str] = ["React", "TypeScript", "Micro Frontends", "AI"]
    location: Optional[str] = "Remote"

class JobEvaluationRequest(BaseModel):
    job_id: str
    title: str
    company: str
    description: str

class TailorResumeRequest(BaseModel):
    job_description: str
    target_role: str
    candidate_profile: Optional[Dict[str, Any]] = None

class ApplicationSubmitRequest(BaseModel):
    job_id: str
    job_url: str
    custom_resume_url: Optional[str] = None
