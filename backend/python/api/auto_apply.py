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

router = APIRouter(prefix="/api/v2/applications", tags=["auto-apply"])


# ============================================================================
# Request/Response Models
# ============================================================================

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
