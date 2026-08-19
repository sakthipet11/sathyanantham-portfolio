from fastapi import APIRouter
from backend.python.models.pydantic_models import ContactFormRequest, EventRequest
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.notifications import notify_admin_contact, notify_resume_download

router = APIRouter(prefix="/api", tags=["contact"])

@router.post("/contact")
async def submit_contact(req: ContactFormRequest):
    res = db_helper.insert_contact(
        name=req.name,
        email=req.email,
        message=req.message,
        company=req.company,
        budget=req.budget,
        purpose=req.purpose
    )
    
    await notify_admin_contact(
        name=req.name,
        email=req.email,
        message=req.message,
        company=req.company,
        budget=req.budget,
        purpose=req.purpose
    )
    
    return res

@router.post("/visitor/event")
async def record_event(req: EventRequest):
    res = db_helper.insert_visitor_event(
        session_id=req.session_id,
        event_type=req.event_type,
        details=req.details,
        country=req.country,
        city=req.city,
        browser=req.browser,
        os_name=req.os
    )
    
    if req.event_type == "resume_download":
        geo = f"{req.city or 'Unknown'}, {req.country or 'Unknown'}"
        await notify_resume_download(req.session_id, geo)
        
    return res
