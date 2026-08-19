from typing import Callable, Any, Optional, Dict, List
import asyncio
import time
import random
import uuid
from datetime import datetime, timezone
import traceback
from backend.python.repositories.supabase_repo import db_helper

class DeadLetterQueueService:
    """
    Dead-Letter Queue (DLQ) registry for capturing persistently failed operations.
    Allows administrators to inspect stack traces, analyze root causes, and manually re-execute.
    """

    def __init__(self):
        self.db = db_helper
        self._in_memory_dlq: Dict[str, Dict[str, Any]] = {}
        self._seed_sample_dlq_items()

    def _seed_sample_dlq_items(self):
        sample = {
            "id": "dlq-samp-01",
            "task_type": "APPLICATION_SUBMISSION",
            "service_name": "ApplicationAutomationService",
            "payload": {
                "application_id": "app-figma-01",
                "company": "Figma",
                "portal_url": "https://careers.figma.com/apply/123"
            },
            "error_message": "TimeoutException: Timed out waiting for Cloudflare Turnstile token completion after 45000ms",
            "stack_trace": "Traceback (most recent call last):\n  File 'application_automation_service.py', line 124, in execute_browser_submission\n    raise TimeoutException('Turnstile token completion timeout')",
            "retry_count": 3,
            "status": "UNRESOLVED",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self._in_memory_dlq[sample["id"]] = sample

    def route_to_dlq(
        self,
        task_type: str,
        service_name: str,
        payload: Dict[str, Any],
        error: Exception,
        retry_count: int = 3
    ) -> Dict[str, Any]:
        item_id = f"dlq-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        dlq_record = {
            "id": item_id,
            "task_type": task_type,
            "service_name": service_name,
            "payload": payload,
            "error_message": str(error),
            "stack_trace": traceback.format_exc(),
            "retry_count": retry_count,
            "status": "UNRESOLVED",
            "created_at": now
        }

        if self.db.client:
            try:
                self.db.client.table("dead_letter_queue").insert(dlq_record).execute()
            except Exception as e:
                print(f"[DLQ] Failed to save to Supabase: {e}")

        self._in_memory_dlq[item_id] = dlq_record
        print(f"[DLQ] Task {task_type} routed to Dead-Letter Queue (ID: {item_id}) after {retry_count} failed attempts.")
        return dlq_record

    def list_dlq_items(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.db.client:
            try:
                q = self.db.client.table("dead_letter_queue").select("*")
                if status and status != "ALL":
                    q = q.eq("status", status)
                res = q.order("created_at", desc=True).limit(100).execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                print(f"[DLQ] Error querying Supabase: {e}")

        items = list(self._in_memory_dlq.values())
        if status and status != "ALL":
            items = [i for i in items if i.get("status") == status]
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return items

    def resolve_dlq_item(self, item_id: str, resolution_notes: str = "Resolved by admin") -> Optional[Dict[str, Any]]:
        item = self._in_memory_dlq.get(item_id)
        if not item:
            return None

        now = datetime.now(timezone.utc).isoformat()
        item["status"] = "RESOLVED"
        item["resolved_at"] = now
        item["resolution_notes"] = resolution_notes

        if self.db.client:
            try:
                self.db.client.table("dead_letter_queue").update({
                    "status": "RESOLVED",
                    "resolved_at": now,
                    "resolution_notes": resolution_notes
                }).eq("id", item_id).execute()
            except Exception as e:
                print(f"[DLQ] Error updating Supabase: {e}")

        return item

dlq_service = DeadLetterQueueService()

async def retry_with_backoff(
    coro_fn: Callable[[], Any],
    max_retries: int = 3,
    initial_delay: float = 0.5,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    task_name: str = "Operation",
    dlq_payload: Optional[Dict[str, Any]] = None
) -> Any:
    """
    Executes an async operation with exponential backoff, jitter, and automatic DLQ routing on exhaustion.
    """
    delay = initial_delay
    last_error: Optional[Exception] = None

    for attempt in range(1, max_retries + 1):
        try:
            return await coro_fn()
        except Exception as e:
            last_error = e
            if attempt == max_retries:
                print(f"[RESILIENCE] {task_name} exhausted {max_retries} attempts. Routing to DLQ. Error: {e}")
                if dlq_payload is not None:
                    dlq_service.route_to_dlq(
                        task_type=task_name,
                        service_name="ResilienceRetryRunner",
                        payload=dlq_payload,
                        error=e,
                        retry_count=attempt
                    )
                raise e

            sleep_time = delay * (1 + (random.random() * 0.2 if jitter else 0))
            print(f"[RESILIENCE] {task_name} attempt {attempt}/{max_retries} failed ({e}). Retrying in {sleep_time:.2f}s...")
            await asyncio.sleep(sleep_time)
            delay *= backoff_factor

    if last_error:
        raise last_error
