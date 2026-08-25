"""
Batch Repository

Manages application_batches table for bulk job application tracking.
Handles batch creation, status updates, and progress monitoring.
"""

import uuid
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None


def _clean_uuid(val: Any) -> Optional[str]:
    if not val:
        return None
    try:
        return str(uuid.UUID(str(val)))
    except (ValueError, TypeError):
        return None


class BatchRepository:
    """Repository for managing application batches"""

    def __init__(self):
        self.db = db_helper

    def create_batch(
        self,
        user_profile_id: str,
        total_count: int,
        job_ids: Optional[List[str]] = None,
        resume_version_id: Optional[str] = None,
        auto_submit: bool = False,
        rate_limit_seconds: Optional[int] = 30
    ) -> Dict[str, Any]:
        """
        Create a new application batch.

        Args:
            user_profile_id: UUID of the user profile
            total_count: Total number of jobs in batch
            job_ids: List of job UUIDs
            resume_version_id: Optional resume version UUID
            auto_submit: Whether to auto-submit without review
            rate_limit_seconds: Delay between applications

        Returns:
            Created batch record
        """
        batch_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        clean_user_id = _clean_uuid(user_profile_id) or "00000000-0000-0000-0000-000000000001"
        clean_resume_id = _clean_uuid(resume_version_id)
        clean_job_ids = [_clean_uuid(j) for j in (job_ids or []) if _clean_uuid(j)]
        
        metadata = {
            "auto_submit": auto_submit,
            "rate_limit_seconds": rate_limit_seconds or 30
        }

        batch_data = {
            "id": batch_id,
            "user_profile_id": clean_user_id,
            "job_ids": clean_job_ids,
            "total_count": total_count,
            "completed_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "needs_review_count": 0,
            "status": "QUEUED",
            "initiated_by": "MANUAL_ADMIN",
            "resume_version_id": clean_resume_id,
            "rate_limit_seconds": rate_limit_seconds or 30,
            "started_at": now,
            "completed_at": None,
            "metadata": metadata,
            "created_at": now,
            "updated_at": now
        }

        # Primary PostgreSQL insert
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO application_batches
                        (id, user_profile_id, job_ids, total_count, completed_count,
                         success_count, failed_count, needs_review_count, status,
                         initiated_by, resume_version_id, rate_limit_seconds,
                         started_at, completed_at, metadata, created_at, updated_at)
                        VALUES (%s, %s, %s::uuid[], %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *;
                    """, (
                        batch_id, clean_user_id, clean_job_ids, total_count, 0,
                        0, 0, 0, "QUEUED", "MANUAL_ADMIN", clean_resume_id,
                        rate_limit_seconds or 30, now, None, json.dumps(metadata),
                        now, now
                    ))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        return dict(row)
            except Exception as e:
                pg_conn.rollback()
                print(f"[BATCH_REPO] PG insert error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                result = self.db.client.table("application_batches").insert(batch_data).execute()
                if result.data and len(result.data) > 0:
                    return result.data[0]
            except Exception as e:
                print(f"[BATCH_REPO] Supabase insert error: {e}")

        raise Exception("Failed to create batch - database insert failed")

    def get_batch(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """Get batch by ID"""
        # Primary PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM application_batches WHERE id = %s LIMIT 1;", (batch_id,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[BATCH_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                result = self.db.client.table("application_batches").select("*").eq("id", batch_id).limit(1).execute()
                if result.data and len(result.data) > 0:
                    return result.data[0]
            except Exception as e:
                print(f"[BATCH_REPO] Supabase query error: {e}")

        return None

    def update_batch_status(
        self,
        batch_id: str,
        status: str,
        started_at: Optional[str] = None,
        completed_at: Optional[str] = None
    ) -> bool:
        """
        Update batch status.

        Args:
            batch_id: Batch UUID
            status: New status (QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED)
            started_at: ISO timestamp when processing started
            completed_at: ISO timestamp when processing completed

        Returns:
            True if update succeeded
        """
        # Primary PostgreSQL update
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT status FROM application_batches WHERE id = %s;", (batch_id,))
                    row = cur.fetchone()
                    current_db_status = row.get("status") if row else None
                    if current_db_status == "CANCELLED" and status != "CANCELLED":
                        # Do not allow overwriting CANCELLED with other status
                        return True

                    update_data = {"status": status, "updated_at": datetime.utcnow().isoformat()}
                    if started_at:
                        update_data["started_at"] = started_at
                    if completed_at:
                        update_data["completed_at"] = completed_at

                    set_parts = []
                    values = []
                    for key, val in update_data.items():
                        set_parts.append(f"{key} = %s")
                        values.append(val)
                    values.append(batch_id)

                    query = f"UPDATE application_batches SET {', '.join(set_parts)} WHERE id = %s;"
                    cur.execute(query, values)
                    pg_conn.commit()
                    return True
            except Exception as e:
                pg_conn.rollback()
                print(f"[BATCH_REPO] PG update error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                update_data = {"status": status, "updated_at": datetime.utcnow().isoformat()}
                self.db.client.table("application_batches").update(update_data).eq("id", batch_id).execute()
                return True
            except Exception as e:
                print(f"[BATCH_REPO] Supabase update error: {e}")

        return False

    def update_batch_counters(
        self,
        batch_id: str,
        completed_count: int,
        success_count: int,
        failed_count: int,
        needs_review_count: int,
        status: Optional[str] = None,
        completed_at: Optional[str] = None
    ) -> bool:
        """Update batch counts and optional status in database"""
        # Primary PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT status FROM application_batches WHERE id = %s;", (batch_id,))
                    row = cur.fetchone()
                    current_db_status = row.get("status") if row else None

                    # If already CANCELLED, NEVER overwrite status
                    effective_status = "CANCELLED" if current_db_status == "CANCELLED" else status

                    update_data = {
                        "completed_count": completed_count,
                        "success_count": success_count,
                        "failed_count": failed_count,
                        "needs_review_count": needs_review_count,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    if effective_status:
                        update_data["status"] = effective_status
                    if completed_at or effective_status in ["COMPLETED", "CANCELLED"]:
                        update_data["completed_at"] = completed_at or datetime.utcnow().isoformat()

                    set_parts = []
                    values = []
                    for key, val in update_data.items():
                        set_parts.append(f"{key} = %s")
                        values.append(val)
                    values.append(batch_id)

                    query = f"UPDATE application_batches SET {', '.join(set_parts)} WHERE id = %s;"
                    cur.execute(query, values)
                    pg_conn.commit()
                    return True
            except Exception as e:
                pg_conn.rollback()
                print(f"[BATCH_REPO] PG counter update error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                update_data = {
                    "completed_count": completed_count,
                    "success_count": success_count,
                    "failed_count": failed_count,
                    "needs_review_count": needs_review_count,
                    "updated_at": datetime.utcnow().isoformat()
                }
                if status:
                    update_data["status"] = status
                self.db.client.table("application_batches").update(update_data).eq("id", batch_id).execute()
                return True
            except Exception as e:
                print(f"[BATCH_REPO] Supabase counter update error: {e}")

        return False

    def get_batch_applications(self, batch_id: str) -> List[Dict[str, Any]]:
        """
        Get all applications in a batch with job details.

        Returns list of applications with job_id, job_title, company, status, etc.
        """
        # Primary PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT
                            a.id AS application_id,
                            a.job_id,
                            a.status,
                            a.automation_metadata,
                            a.submitted_at,
                            a.created_at,
                            a.updated_at,
                            a.manual_reason,
                            j.title AS job_title,
                            j.company,
                            j.apply_url
                        FROM applications_v2 a
                        LEFT JOIN jobs j ON a.job_id = j.id
                        WHERE a.batch_id = %s
                        ORDER BY a.created_at ASC;
                    """, (batch_id,))
                    rows = cur.fetchall()
                    applications = []
                    for row in rows:
                        meta = row.get("automation_metadata") or {}
                        if isinstance(meta, str):
                            try:
                                meta = json.loads(meta)
                            except Exception:
                                meta = {}
                        applications.append({
                            "application_id": str(row.get("application_id")),
                            "job_id": str(row.get("job_id")),
                            "job_title": row.get("job_title", "Unknown"),
                            "company": row.get("company", "Unknown"),
                            "apply_url": row.get("apply_url"),
                            "status": row.get("status"),
                            "progress_message": meta.get("progress_message") or row.get("manual_reason") or "Queued",
                            "submitted_at": row.get("submitted_at"),
                            "error_message": meta.get("error_message"),
                            "screenshot_url": row.get("screenshot_url"),
                            "automation_metadata": meta
                        })
                    return applications
            except Exception as e:
                print(f"[BATCH_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                result = self.db.client.table("applications_v2").select("""
                    *,
                    jobs:job_id (
                        id,
                        title,
                        company,
                        apply_url
                    )
                """).eq("batch_id", batch_id).order("created_at").execute()

                if result.data:
                    applications = []
                    for app in result.data:
                        job = app.get("jobs") or {}
                        meta = app.get("automation_metadata") or {}
                        applications.append({
                            "application_id": str(app.get("id")),
                            "job_id": str(app.get("job_id")),
                            "job_title": job.get("title", "Unknown"),
                            "company": job.get("company", "Unknown"),
                            "apply_url": job.get("apply_url"),
                            "status": app.get("status"),
                            "progress_message": meta.get("progress_message", "Queued"),
                            "submitted_at": app.get("submitted_at"),
                            "error_message": meta.get("error_message"),
                            "screenshot_url": app.get("screenshot_url"),
                            "automation_metadata": meta
                        })
                    return applications
            except Exception as e:
                print(f"[BATCH_REPO] Supabase query error: {e}")

        return []

    def cancel_batch(self, batch_id: str) -> bool:
        """
        Cancel a batch and mark remaining applications as SKIPPED.

        Args:
            batch_id: Batch UUID

        Returns:
            True if cancellation succeeded
        """
        now = datetime.utcnow().isoformat()

        # Single atomic PostgreSQL transaction
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("""
                        UPDATE application_batches
                        SET status = 'CANCELLED',
                            completed_at = %s,
                            updated_at = %s
                        WHERE id = %s;
                    """, (now, now, batch_id))

                    cur.execute("""
                        UPDATE applications_v2
                        SET status = 'SKIPPED',
                            updated_at = %s
                        WHERE batch_id = %s
                        AND status IN ('QUEUED', 'PROCESSING', 'DRAFT');
                    """, (now, batch_id))

                    pg_conn.commit()
                    return True
            except Exception as e:
                pg_conn.rollback()
                print(f"[BATCH_REPO] PG atomic cancel error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                self.db.client.table("application_batches").update({
                    "status": "CANCELLED",
                    "completed_at": now,
                    "updated_at": now
                }).eq("id", batch_id).execute()

                self.db.client.table("applications_v2").update({
                    "status": "SKIPPED",
                    "updated_at": now
                }).eq("batch_id", batch_id).in_("status", ["QUEUED", "PROCESSING", "DRAFT"]).execute()
                return True
            except Exception as e:
                print(f"[BATCH_REPO] Supabase update error: {e}")

        return False


# Singleton instance
batch_repository = BatchRepository()
