from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from backend.python.repositories.resume_repository import resume_repository
from backend.python.services.audit_governance_service import audit_governance_service

router = APIRouter(prefix="/api/v2/resumes", tags=["resumes_v2"])

class BulkDeleteResumesRequest(BaseModel):
    ids: List[str]

@router.get("")
def list_resumes():
    """Returns all tailored resume & cover letter versions."""
    resumes = resume_repository.list_resumes()
    return {"status": "success", "count": len(resumes), "resumes": resumes}

@router.get("/{resume_id}")
def get_resume(resume_id: str):
    """Fetches details for a specific resume version."""
    res = resume_repository.get_resume_by_id(resume_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Resume record {resume_id} not found")
    return {"status": "success", "resume": res}

@router.get("/{resume_id}/download")
def download_resume(resume_id: str):
    """Streams the PDF file associated with a resume record."""
    import os
    from fastapi.responses import FileResponse

    res = resume_repository.get_resume_by_id(resume_id)
    file_name = res.get("name") if res else "Sathyanantham_V_Resume.pdf"
    
    # Try public/downloads or public/resume.pdf
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    pdf_path = os.path.join(repo_root, "public", "downloads", file_name)
    
    if not os.path.exists(pdf_path):
        pdf_path = os.path.join(repo_root, "public", "resume.pdf")

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Resume PDF file not found on disk.")

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=file_name
    )

@router.post("/bulk-delete")
def bulk_delete_resumes(req: BulkDeleteResumesRequest):
    """Hard-deletes multiple resume records."""
    if len(req.ids) > 500:
        raise HTTPException(status_code=400, detail="Bulk delete batch size exceeds limit of 500 IDs.")
    
    deleted_count = resume_repository.delete_bulk(req.ids, actor="ADMIN_HUMAN", action="BULK_MANUAL_DELETE")
    audit_governance_service.log_event(
        actor="ADMIN_HUMAN",
        ai_agent="ResumeAgent",
        action="BULK_RESUMES_DELETED",
        tool="ResumeRepository",
        result=f"Deleted {deleted_count} resume records.",
        status="SUCCESS"
    )
    return {
        "status": "success",
        "pipeline": "resumes",
        "requested_count": len(req.ids),
        "deleted_count": deleted_count
    }

@router.delete("/{resume_id}")
def delete_resume(resume_id: str):
    """Hard-deletes a single resume version record."""
    deleted = resume_repository.delete_by_id(resume_id, actor="ADMIN_HUMAN", action="MANUAL_DELETE")
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Resume {resume_id} not found or already deleted.")
    
    audit_governance_service.log_event(
        actor="ADMIN_HUMAN",
        ai_agent="ResumeAgent",
        action="RESUME_DELETED",
        tool="ResumeRepository",
        result=f"Deleted resume record {resume_id}.",
        status="SUCCESS"
    )
    return {"status": "success", "message": f"Resume {resume_id} deleted.", "deleted": True}
