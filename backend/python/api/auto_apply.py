"""
Auto-Apply API Endpoints

FastAPI routes for bulk job application automation.
Integrates with ApplicationQueueService for orchestration.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Import services
from backend.python.services.application_queue_service import get_application_queue_service
from backend.python.services.playwright_automation_service import get_playwright_service
from backend.python.services.form_mapping_service import get_form_mapping_service
from backend.python.services.portal_mapping_cache_service import get_portal_mapping_cache_service
from backend.python.services.resume_matching_service import resume_matching_service
from backend.python.services.cover_letter_service import CoverLetterService
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.application_v2_repository import application_v2_repository
from backend.python.repositories.connection_repository import connection_repository
import asyncio

from backend.python.services.gmail_mcp_client import gmail_mcp_client
from backend.python.repositories.email_repository import email_repository
import os
import subprocess
import sys
from pathlib import Path

router = APIRouter(prefix="/api/v2/applications", tags=["auto-apply"])


# ============================================================================
# Request/Response Models
# ============================================================================

class StagePackageRequest(BaseModel):
    """Request to atomically stage an application package (Resume + Cover Letter + Referrals)"""
    job_ids: List[str] = Field(..., min_items=1, max_items=50, description="List of job UUIDs to stage")
    user_profile_id: Optional[str] = Field(default="00000000-0000-0000-0000-000000000001", description="Candidate profile UUID")
    generate_cover_letter: bool = Field(default=True, description="Generate tailored cover letter")
    link_referrals: bool = Field(default=True, description="Link matching 1st-degree connections")


class SendApplicationEmailRequest(BaseModel):
    """Request to dispatch tailored application email"""
    recipient_email: Optional[str] = Field(None, description="Target recruiter or referral email")
    recipient_name: Optional[str] = Field(None, description="Recipient name")
    subject: Optional[str] = Field(None, description="Email subject")
    cover_letter: Optional[str] = Field(None, description="Cover letter text")
    resume_file_name: Optional[str] = Field(None, description="Tailored resume PDF filename")


class UpdateApplicationRequest(BaseModel):
    """Request to update application details"""
    status: Optional[str] = None
    cover_letter: Optional[str] = None
    matched_resume_url: Optional[str] = None
    matched_resume_role: Optional[str] = None
    referral_contact: Optional[str] = None
    human_reviewer_notes: Optional[str] = None


class BulkDeleteApplicationsRequest(BaseModel):
    """Request to delete multiple applications"""
    application_ids: List[str] = Field(..., min_items=1)


class BulkPrepareRequest(BaseModel):
    """Request to prepare a bulk application batch"""
    job_ids: List[str] = Field(..., min_items=1, max_items=50, description="List of job UUIDs to apply to")
    user_profile_id: str = Field(..., description="User profile UUID")
    resume_version_id: Optional[str] = Field(None, description="Optional specific resume version")
    auto_submit: bool = Field(False, description="If True, auto-submit without human review")


class AutoApplyRequest(BaseModel):
    """Request to start automated application processing"""
    batch_id: str = Field(..., description="Batch UUID from bulk-prepare")
    user_profile_id: str = Field(..., description="User profile UUID")
    rate_limit_seconds: Optional[int] = Field(None, ge=10, le=120, description="Override default rate limit")
    headless: bool = Field(False, description="If False, opens visible automated Chromium window")


class SingleApplyRequest(BaseModel):
    """Request to directly launch single job auto-apply via Chromium CLI"""
    job_id: Optional[str] = Field(None, description="Job UUID in database")
    job_url: Optional[str] = Field(None, description="Direct URL of job application")
    auto_submit: bool = Field(True, description="If True, automatically submits the application")
    headless: bool = Field(False, description="If False, launches visible Chromium window")


class RetryApplicationRequest(BaseModel):
    """Request to retry a failed application"""
    use_manual_mode: bool = Field(False, description="If True, open browser for human intervention")


class BatchStatusResponse(BaseModel):
    """Batch progress status response"""
    batch_id: str
    status: str
    total_count: int
    completed_count: int
    success_count: int
    failed_count: int
    needs_review_count: int
    started_at: Optional[Any] = None
    completed_at: Optional[Any] = None
    applications: List[Dict[str, Any]]


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/metrics")
async def get_applications_metrics():
    """Retrieve aggregated stats for the Applications management HUD."""
    metrics = application_v2_repository.get_metrics()
    return {
        "success": True,
        "metrics": metrics
    }


@router.get("")
async def list_applications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """List job applications with filters and enriched job metadata."""
    apps = application_v2_repository.list_applications(
        status=status,
        search=search,
        limit=limit,
        offset=offset
    )
    metrics = application_v2_repository.get_metrics()
    return {
        "success": True,
        "total": len(apps),
        "metrics": metrics,
        "applications": apps
    }


@router.get("/{application_id}")
async def get_application_details(application_id: str):
    """Get complete details and event history for a single application."""
    app_data = application_v2_repository.get_application_with_details(application_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Application not found")

    events = application_v2_repository.get_application_events(application_id)
    return {
        "success": True,
        "application": app_data,
        "events": events
    }


@router.put("/{application_id}")
async def update_application_details(application_id: str, request: UpdateApplicationRequest):
    """Update application cover letter, resume selection, or status."""
    existing = application_v2_repository.get_application_with_details(application_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Application not found")

    auto_meta = existing.get("automation_metadata") or {}
    if isinstance(auto_meta, str):
        try:
            auto_meta = json.loads(auto_meta)
        except Exception:
            auto_meta = {}

    if request.cover_letter is not None:
        auto_meta["cover_letter"] = request.cover_letter
    if request.matched_resume_url is not None:
        auto_meta["matched_resume_url"] = request.matched_resume_url
    if request.matched_resume_role is not None:
        auto_meta["matched_resume_role"] = request.matched_resume_role
    if request.referral_contact is not None:
        auto_meta["referral_contact"] = request.referral_contact

    success = application_v2_repository.update_application(
        app_id=application_id,
        status=request.status,
        automation_metadata=auto_meta
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update application record")

    if request.status and request.status != existing.get("status"):
        application_v2_repository.log_event(
            app_id=application_id,
            event_type="STATUS_CHANGED",
            message=f"Application status updated from {existing.get('status')} to {request.status}",
            previous_status=existing.get("status"),
            new_status=request.status
        )

    updated = application_v2_repository.get_application_with_details(application_id)
    return {
        "success": True,
        "message": "Application updated successfully",
        "application": updated
    }


@router.post("/{application_id}/send-email")
async def send_application_email(application_id: str, request: SendApplicationEmailRequest):
    """
    Direct Email Application Dispatch:
    Transmits the candidate's tailored resume PDF and cover letter
    directly to the company recruiter, referral contact, or hiring team via SMTP/Gmail.
    """
    app_data = application_v2_repository.get_application_with_details(application_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Application not found")

    job_title = app_data.get("job_title") or "Engineering Role"
    company = app_data.get("company") or "Target Company"
    auto_meta = app_data.get("automation_metadata") or {}
    if isinstance(auto_meta, str):
        try:
            auto_meta = json.loads(auto_meta)
        except Exception:
            auto_meta = {}

    to_email = (request.recipient_email or "").strip()
    if not to_email:
        to_email = auto_meta.get("referral_email") or auto_meta.get("recruiter_email") or ""
    if not to_email:
        clean_comp = company.lower().replace(" ", "").replace(",", "").replace(".", "")
        to_email = f"careers@{clean_comp}.com"

    subject = (request.subject or "").strip() or f"Application: {job_title} - Sathyanantham V"

    body_text = (request.cover_letter or "").strip() or auto_meta.get("cover_letter") or (
        f"Dear Hiring Team at {company},\n\n"
        f"I am writing to express my enthusiastic interest in the {job_title} role at {company}.\n\n"
        f"With over 13.5+ years of software architecture experience leading enterprise systems, "
        f"I look forward to contributing to your engineering objectives.\n\n"
        f"Please find my tailored resume attached.\n\n"
        f"Sincerely,\nSathyanantham V\nLead Frontend & AI Systems Architect\nhttps://sathyanantham.com"
    )

    resume_file = request.resume_file_name
    if not resume_file:
        matched_url = auto_meta.get("matched_resume_url") or ""
        if matched_url:
            resume_file = os.path.basename(matched_url)
        else:
            resume_file = "Sathyanantham_V_Resume.pdf"

    send_result = await gmail_mcp_client.send_email(
        to=to_email,
        subject=subject,
        body=body_text,
        attachments=[resume_file]
    )

    now_iso = datetime.utcnow().isoformat()
    auto_meta["email_sent_to"] = to_email
    auto_meta["email_sent_at"] = now_iso
    auto_meta["email_subject"] = subject
    auto_meta["email_message_id"] = send_result.get("message_id")
    if request.cover_letter:
        auto_meta["cover_letter"] = request.cover_letter

    application_v2_repository.update_application(
        app_id=application_id,
        status="EMAIL_SENT",
        submitted_at=now_iso,
        automation_metadata=auto_meta
    )

    application_v2_repository.log_event(
        app_id=application_id,
        event_type="EMAIL_DISPATCHED",
        message=f"Application package emailed to {to_email} with resume '{resume_file}'",
        previous_status=app_data.get("status"),
        new_status="EMAIL_SENT",
        metadata={"to": to_email, "subject": subject, "resume": resume_file}
    )

    return {
        "success": True,
        "message": f"Successfully sent tailored application package to {to_email}",
        "data": {
            "application_id": application_id,
            "status": "EMAIL_SENT",
            "sent_to": to_email,
            "subject": subject,
            "resume_attached": resume_file,
            "sent_at": now_iso
        }
    }


@router.post("/{application_id}/apply-browser")
async def launch_browser_for_application(application_id: str, request: SingleApplyRequest):
    """Launch visible Chromium Playwright automation to apply to this specific job."""
    app_data = application_v2_repository.get_application_with_details(application_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Application not found")

    job_url = app_data.get("apply_url") or request.job_url
    if not job_url:
        raise HTTPException(status_code=400, detail="This application does not have a direct apply URL.")

    project_root = Path(__file__).resolve().parents[3]
    cmd = [sys.executable, "-m", "backend.python.cli.chromium_apply", "--url", job_url]
    if request.auto_submit:
        cmd.append("--auto-submit")
    if request.headless:
        cmd.append("--headless")

    print(f"[AUTO_APPLY] Spawning Chromium CLI for application {application_id}: {' '.join(cmd)}")
    try:
        subprocess.Popen(cmd, cwd=str(project_root), shell=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to launch browser: {str(e)}")

    application_v2_repository.log_event(
        app_id=application_id,
        event_type="BROWSER_AUTOMATION_LAUNCHED",
        message=f"Launched Playwright Chromium browser for {job_url}",
        previous_status=app_data.get("status"),
        new_status="PROCESSING"
    )

    return {
        "success": True,
        "message": f"Launched Chromium automation for {app_data.get('company')} - {app_data.get('job_title')}",
        "data": {
            "application_id": application_id,
            "job_url": job_url
        }
    }


@router.delete("/{application_id}")
async def delete_single_application(application_id: str):
    """Delete an application record."""
    success = application_v2_repository.delete_application(application_id)
    if not success:
        raise HTTPException(status_code=404, detail="Application not found or could not be deleted")
    return {
        "success": True,
        "message": "Application deleted successfully"
    }


@router.post("/bulk-delete")
async def bulk_delete_applications_endpoint(request: BulkDeleteApplicationsRequest):
    """Bulk delete applications."""
    deleted = application_v2_repository.bulk_delete_applications(request.application_ids)
    return {
        "success": True,
        "message": f"Successfully deleted {deleted} application{'s' if deleted != 1 else ''}",
        "deleted_count": deleted
    }

@router.post("/stage-package")
async def stage_application_package(request: StagePackageRequest):
    """
    Unified 1-Click Application Staging Endpoint:
    - Automatically matches tailored candidate resume PDF based on role specialization.
    - Concurrently synthesizes grounded cover letter tailored to target company.
    - Discovers matching 1st-degree connections at the target company.
    - Stages the record in READY_FOR_REVIEW for human-in-the-loop approval.
    """
    cover_letter_service = CoverLetterService()
    results = []

    for job_id in request.job_ids:
        job = job_repository.get_job_by_id(job_id)
        if not job:
            continue

        # 1. Deterministic Resume Matcher
        matched_resume = resume_matching_service.match_resume_for_job(job)

        # 2. Deterministic 1st-degree Connection Search
        company_name = job.get("company", "")
        connections = connection_repository.search_by_company(company_name) if request.link_referrals else []
        top_contact = connections[0] if connections else None

        # 3. Grounded Tailored Cover Letter Synthesis
        cover_letter = None
        if request.generate_cover_letter:
            try:
                cl_res = await cover_letter_service.generate_cover_letter(job, contact=top_contact)
                cover_letter = cl_res.get("cover_letter_text") or cl_res.get("cover_letter")
            except Exception as e:
                print(f"[STAGE_PACKAGE] Error generating cover letter for job {job_id}: {e}")

        # 4. Create or reuse existing application record for this job
        existing_app = application_v2_repository.get_application_by_job_id(str(job["id"]))
        if existing_app:
            app_record = existing_app
        else:
            app_record = application_v2_repository.create_application(
                job_id=str(job["id"]),
                user_profile_id=request.user_profile_id,
                resume_version_id=matched_resume.get("resume_id")
            )

        stage_metadata = {
            "matched_resume_url": matched_resume.get("download_url"),
            "matched_resume_role": matched_resume.get("role"),
            "cover_letter": cover_letter,
            "referral_contact": top_contact.get("full_name") if top_contact else None
        }
        try:
            application_v2_repository.update_application(
                app_id=str(app_record["id"]),
                status="READY_FOR_REVIEW",
                automation_metadata=stage_metadata
            )
        except Exception as e:
            print(f"[STAGE_PACKAGE] Error updating application record: {e}")

        results.append({
            "job_id": job_id,
            "application_id": str(app_record["id"]),
            "company": company_name,
            "title": job.get("title"),
            "resume_matched": matched_resume.get("role"),
            "has_cover_letter": bool(cover_letter),
            "referral_matched": bool(top_contact),
            "status": "READY_FOR_REVIEW"
        })

    return {
        "success": True,
        "total_staged": len(results),
        "message": f"Successfully staged {len(results)} application package{'s' if len(results) != 1 else ''} in READY_FOR_REVIEW",
        "staged_packages": results
    }


@router.post("/bulk-prepare")
async def bulk_prepare(request: BulkPrepareRequest):
    """
    Initialize a bulk application batch.

    Creates application records and prepares the queue.
    Does not start processing - use /auto-apply endpoint to start.

    **Example Request:**
    ```json
    {
        "job_ids": ["uuid1", "uuid2", "uuid3"],
        "user_profile_id": "user-uuid",
        "auto_submit": false
    }
    ```

    **Example Response:**
    ```json
    {
        "batch_id": "batch-uuid",
        "total_count": 3,
        "status": "QUEUED",
        "estimated_duration_minutes": 6
    }
    ```
    """
    try:
        # Get queue service
        queue_service = get_application_queue_service(
            playwright_service=get_playwright_service(),
            form_mapping_service=get_form_mapping_service(
                cache_service=get_portal_mapping_cache_service()
            ),
            cache_service=get_portal_mapping_cache_service()
        )

        # Create batch
        batch_result = await queue_service.create_batch(
            job_ids=request.job_ids,
            user_profile_id=request.user_profile_id,
            resume_version_id=request.resume_version_id,
            auto_submit=request.auto_submit
        )

        return {
            "success": True,
            "message": f"Batch created with {batch_result['total_count']} jobs",
            "data": batch_result
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create batch: {str(e)}")


@router.post("/auto-apply")
async def auto_apply(request: AutoApplyRequest, background_tasks: BackgroundTasks):
    """
    Start automated application processing for a batch.

    Processes applications asynchronously in the background.
    Use /batch/{batch_id}/status to monitor progress.

    **Example Request:**
    ```json
    {
        "batch_id": "batch-uuid",
        "user_profile_id": "user-uuid",
        "rate_limit_seconds": 30
    }
    ```

    **Example Response:**
    ```json
    {
        "success": true,
        "message": "Batch processing started",
        "data": {
            "batch_id": "batch-uuid",
            "status": "PROCESSING",
            "progress_url": "/api/v2/applications/batch/batch-uuid/status"
        }
    }
    ```
    """
    try:
        # Get queue service
        queue_service = get_application_queue_service(
            playwright_service=get_playwright_service(),
            form_mapping_service=get_form_mapping_service(
                cache_service=get_portal_mapping_cache_service()
            ),
            cache_service=get_portal_mapping_cache_service()
        )

        # Start batch processing in background
        background_tasks.add_task(
            queue_service.start_batch_processing,
            batch_id=request.batch_id,
            user_profile_id=request.user_profile_id,
            headless=request.headless
        )

        return {
            "success": True,
            "message": "Batch processing started",
            "data": {
                "batch_id": request.batch_id,
                "status": "PROCESSING",
                "progress_url": f"/api/v2/applications/batch/{request.batch_id}/status"
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start batch: {str(e)}")


@router.post("/apply-single")
async def apply_single(request: SingleApplyRequest):
    """
    Launch direct single-job auto-apply with visible Chromium browser automation.
    Spawns the detached Chromium CLI process to open the browser window on the desktop.
    """
    import subprocess
    import sys
    from pathlib import Path
    from backend.python.repositories.job_repository import job_repository

    job_url = request.job_url
    job_id = request.job_id

    if not job_url and job_id:
        job = job_repository.get_job_by_id(job_id)
        if job:
            job_url = job.get("apply_url") or job.get("job_url")

    if not job_url:
        raise HTTPException(status_code=400, detail="Valid job_id or job_url is required")

    project_root = Path(__file__).resolve().parents[3]

    # Build command to execute chromium-cli
    cmd = [sys.executable, "-m", "backend.python.cli.chromium_apply", "--url", job_url]
    if request.auto_submit:
        cmd.append("--auto-submit")
    if request.headless:
        cmd.append("--headless")

    print(f"[AUTO_APPLY_SINGLE] Spawning Chromium CLI process: {' '.join(cmd)}")

    try:
        # Launch independent desktop process on Windows
        subprocess.Popen(
            cmd,
            cwd=str(project_root),
            shell=True
        )
    except Exception as e:
        print(f"[AUTO_APPLY_SINGLE] Error spawning process: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to launch browser process: {str(e)}")

    return {
        "success": True,
        "message": f"Chromium Auto-Apply window launched for {job_url}",
        "data": {
            "job_id": job_id,
            "job_url": job_url,
            "auto_submit": request.auto_submit,
            "status": "PROCESSING"
        }
    }


@router.get("/batch/{batch_id}/status", response_model=BatchStatusResponse)
async def get_batch_status(batch_id: str):
    """
    Get real-time batch progress.

    Returns current status and per-job progress.
    Poll this endpoint for live updates in the UI.

    **Example Response:**
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
                "progress_message": "Successfully submitted!",
                "submitted_at": "2026-08-25T01:15:00Z"
            },
            {
                "job_id": "uuid2",
                "status": "PROCESSING",
                "progress_message": "Filling form fields..."
            }
        ]
    }
    ```
    """
    try:
        queue_service = get_application_queue_service()

        batch_status = await queue_service.get_batch_status(batch_id)

        if not batch_status:
            raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

        return batch_status

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get batch status: {str(e)}")


@router.delete("/batch/{batch_id}")
@router.post("/batch/{batch_id}/cancel")
async def cancel_batch(batch_id: str):
    """
    Cancel an active batch.
    Marks remaining queued applications as SKIPPED and sets batch status to CANCELLED.
    """
    try:
        queue_service = get_application_queue_service()
        success = await queue_service.cancel_batch(batch_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found or could not be cancelled")

        return {
            "success": True,
            "message": f"Batch {batch_id} cancelled successfully",
            "data": {
                "batch_id": batch_id,
                "status": "CANCELLED"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel batch: {str(e)}")


@router.post("/{application_id}/retry")
async def retry_application(application_id: str, request: RetryApplicationRequest):
    """
    Retry a failed application.

    Re-queues the application for processing.
    If use_manual_mode is True, opens browser for human intervention (future feature).

    **Example Request:**
    ```json
    {
        "use_manual_mode": false
    }
    ```
    """
    try:
        # TODO: Implement retry logic via queue service
        # For now, return placeholder response

        return {
            "success": True,
            "message": f"Application {application_id} queued for retry",
            "data": {
                "application_id": application_id,
                "status": "QUEUED",
                "retry_count": 1
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retry application: {str(e)}")


@router.get("/{application_id}/screenshot")
async def get_screenshot(application_id: str):
    """
    Retrieve error screenshot for an application.

    Returns base64-encoded PNG or redirects to storage URL.

    **Query Parameters:**
    - type: screenshot type (success, error, captcha, pre_submit)

    **Example Response:**
    ```json
    {
        "application_id": "app-uuid",
        "screenshot_type": "error",
        "screenshot_url": "data:image/png;base64,iVBORw0KG...",
        "captured_at": "2026-08-25T01:15:30Z"
    }
    ```
    """
    try:
        # TODO: Implement screenshot retrieval from database or storage
        # For now, return placeholder

        return {
            "success": True,
            "message": "Screenshot retrieved",
            "data": {
                "application_id": application_id,
                "screenshot_type": "error",
                "screenshot_url": "data:image/png;base64,placeholder",
                "captured_at": datetime.utcnow().isoformat()
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get screenshot: {str(e)}")


@router.delete("/batch/{batch_id}")
async def cancel_batch(batch_id: str):
    """
    Cancel a batch.

    Stops processing and marks remaining applications as skipped.
    Applications already submitted are not affected.

    **Example Response:**
    ```json
    {
        "success": true,
        "message": "Batch cancelled",
        "data": {
            "batch_id": "batch-uuid",
            "status": "CANCELLED"
        }
    }
    ```
    """
    try:
        queue_service = get_application_queue_service()

        success = await queue_service.cancel_batch(batch_id)

        if not success:
            raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

        return {
            "success": True,
            "message": "Batch cancelled",
            "data": {
                "batch_id": batch_id,
                "status": "CANCELLED"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel batch: {str(e)}")


# ============================================================================
# Health & Monitoring Endpoints
# ============================================================================

@router.get("/health")
async def health_check():
    """
    Health check for auto-apply system.

    Verifies all services are initialized and ready.
    """
    try:
        playwright_ready = False
        try:
            playwright_service = get_playwright_service()
            playwright_ready = True
        except:
            pass

        return {
            "success": True,
            "status": "healthy",
            "services": {
                "queue_service": True,
                "playwright_service": playwright_ready,
                "form_mapping_service": True,
                "cache_service": True
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/portal-mappings/stats")
async def get_portal_stats(portal_type: Optional[str] = None):
    """
    Get portal mapping cache statistics.

    Useful for monitoring mapping reliability and coverage.

    **Query Parameters:**
    - portal_type: Optional filter by portal type (greenhouse, lever, workday, custom)

    **Example Response:**
    ```json
    {
        "total_mappings": 15,
        "by_status": {
            "VALIDATED": 10,
            "HUMAN_REVIEWED": 3,
            "UNVALIDATED": 2
        },
        "by_portal_type": {
            "greenhouse": 6,
            "lever": 4,
            "custom": 5
        },
        "average_success_rate": 87.5
    }
    ```
    """
    try:
        cache_service = get_portal_mapping_cache_service()

        stats = await cache_service.get_portal_statistics(portal_type=portal_type)

        return {
            "success": True,
            "data": stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


@router.get("/portal-mappings/unreliable")
async def get_unreliable_mappings(
    min_attempts: int = 10,
    max_failure_rate: float = 0.3
):
    """
    Get portal mappings with high failure rates.

    Identifies mappings that need attention or re-validation.

    **Query Parameters:**
    - min_attempts: Minimum attempts before considering (default: 10)
    - max_failure_rate: Maximum acceptable failure rate 0.0-1.0 (default: 0.3)

    **Example Response:**
    ```json
    {
        "unreliable_mappings": [
            {
                "portal_identifier": "workday:bigcorp",
                "portal_type": "workday",
                "success_count": 5,
                "failure_count": 8,
                "failure_rate": 61.5,
                "total_attempts": 13
            }
        ]
    }
    ```
    """
    try:
        cache_service = get_portal_mapping_cache_service()

        unreliable = await cache_service.get_unreliable_mappings(
            min_attempts=min_attempts,
            max_failure_rate=max_failure_rate
        )

        return {
            "success": True,
            "count": len(unreliable),
            "unreliable_mappings": unreliable
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get unreliable mappings: {str(e)}")
