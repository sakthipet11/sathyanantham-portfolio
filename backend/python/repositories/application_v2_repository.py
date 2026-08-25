"""
Application V2 Repository

Manages applications_v2 table for auto-apply system.
Handles application creation, status updates, and progress tracking.
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


class ApplicationV2Repository:
    """Repository for managing applications_v2 table"""

    def __init__(self):
        self.db = db_helper

    def create_application(
        self,
        job_id: str,
        user_profile_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        resume_version_id: Optional[str] = None,
        portal_mapping_id: Optional[str] = None,
        submission_method: str = "playwright_browser"
    ) -> Dict[str, Any]:
        """
        Create a new application record.

        Args:
            job_id: UUID of the job
            user_profile_id: UUID of the user profile
            batch_id: Optional batch UUID
            resume_version_id: Optional resume version UUID
            portal_mapping_id: Optional portal mapping UUID
            submission_method: Automation method

        Returns:
            Created application record
        """
        app_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        clean_job_id = _clean_uuid(job_id)
        if not clean_job_id:
            raise ValueError(f"Invalid job UUID: {job_id}")

        clean_batch_id = _clean_uuid(batch_id)
        clean_resume_id = _clean_uuid(resume_version_id)
        clean_portal_id = _clean_uuid(portal_mapping_id)
        clean_user_id = _clean_uuid(user_profile_id) or "00000000-0000-0000-0000-000000000001"

        idempotency_key = f"app_{clean_job_id}_{clean_batch_id or uuid.uuid4().hex[:8]}"

        automation_metadata = {
            "user_profile_id": clean_user_id,
            "progress_message": "Waiting in queue...",
            "error_message": None
        }

        app_data = {
            "id": app_id,
            "job_id": clean_job_id,
            "resume_version_id": clean_resume_id,
            "status": "QUEUED",
            "form_payload": {},
            "submission_method": submission_method,
            "external_confirmation_id": None,
            "screenshot_url": None,
            "manual_reason": None,
            "human_reviewer_notes": None,
            "submitted_at": None,
            "idempotency_key": idempotency_key,
            "created_at": now,
            "updated_at": now,
            "batch_id": clean_batch_id,
            "portal_mapping_id": clean_portal_id,
            "automation_metadata": automation_metadata
        }

        # Primary PostgreSQL insert
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO applications_v2
                        (id, job_id, resume_version_id, status, form_payload,
                         submission_method, external_confirmation_id, screenshot_url,
                         manual_reason, human_reviewer_notes, submitted_at,
                         idempotency_key, created_at, updated_at, batch_id,
                         portal_mapping_id, automation_metadata)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *;
                    """, (
                        app_id, clean_job_id, clean_resume_id, "QUEUED", json.dumps({}),
                        submission_method, None, None,
                        None, None, None,
                        idempotency_key, now, now, clean_batch_id,
                        clean_portal_id, json.dumps(automation_metadata)
                    ))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        return dict(row)
            except Exception as e:
                pg_conn.rollback()
                print(f"[APP_V2_REPO] PG insert error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                result = self.db.client.table("applications_v2").insert(app_data).execute()
                if result.data and len(result.data) > 0:
                    return result.data[0]
            except Exception as e:
                print(f"[APP_V2_REPO] Supabase insert error: {e}")

        raise Exception("Failed to create application - database insert failed")

    def update_application(
        self,
        app_id: str,
        status: Optional[str] = None,
        progress_message: Optional[str] = None,
        submitted_at: Optional[str] = None,
        error_message: Optional[str] = None,
        screenshot_url: Optional[str] = None,
        automation_metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Update application status and metadata.

        Args:
            app_id: Application UUID
            status: New status (QUEUED, PROCESSING, SUBMITTED, FAILED, etc.)
            progress_message: Progress message
            submitted_at: ISO timestamp when submitted
            error_message: Error message if failed
            screenshot_url: Screenshot URL or base64 data
            automation_metadata: JSON metadata

        Returns:
            True if update succeeded
        """
        now = datetime.utcnow().isoformat()
        clean_app_id = _clean_uuid(app_id)
        if not clean_app_id:
            return False

        current_app = self.get_application(clean_app_id) or {}
        current_meta = current_app.get("automation_metadata") or {}
        if isinstance(current_meta, str):
            try:
                current_meta = json.loads(current_meta)
            except Exception:
                current_meta = {}

        if automation_metadata:
            current_meta.update(automation_metadata)
        if progress_message is not None:
            current_meta["progress_message"] = progress_message
        if error_message is not None:
            current_meta["error_message"] = error_message

        update_data = {
            "updated_at": now,
            "automation_metadata": current_meta
        }

        if status is not None:
            update_data["status"] = status
        if submitted_at is not None:
            update_data["submitted_at"] = submitted_at
        if error_message is not None:
            update_data["manual_reason"] = error_message
        if screenshot_url is not None:
            update_data["screenshot_url"] = screenshot_url

        # Try Supabase first
        # Primary PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    set_parts = []
                    values = []
                    for key, val in update_data.items():
                        set_parts.append(f"{key} = %s")
                        if key in ["automation_metadata", "form_payload"] and val is not None:
                            values.append(json.dumps(val))
                        else:
                            values.append(val)
                    values.append(clean_app_id)

                    query = f"UPDATE applications_v2 SET {', '.join(set_parts)} WHERE id = %s;"
                    cur.execute(query, values)
                    pg_conn.commit()
                    return True
            except Exception as e:
                pg_conn.rollback()
                print(f"[APP_V2_REPO] PG update error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                self.db.client.table("applications_v2").update(update_data).eq("id", clean_app_id).execute()
                return True
            except Exception as e:
                print(f"[APP_V2_REPO] Supabase update error: {e}")

        return False

    def get_application(self, app_id: str) -> Optional[Dict[str, Any]]:
        """Get application by ID"""
        clean_app_id = _clean_uuid(app_id)
        if not clean_app_id:
            return None

        # Primary PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM applications_v2 WHERE id = %s LIMIT 1;", (clean_app_id,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[APP_V2_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                result = self.db.client.table("applications_v2").select("*").eq("id", clean_app_id).limit(1).execute()
                if result.data and len(result.data) > 0:
                    return result.data[0]
            except Exception as e:
                print(f"[APP_V2_REPO] Supabase query error: {e}")

        return None

    def get_application_by_job_id(self, job_id: str, batch_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get application by job_id, optionally filtered by batch_id"""
        clean_job_id = _clean_uuid(job_id)
        clean_batch_id = _clean_uuid(batch_id)
        if not clean_job_id:
            return None

        # Primary PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if clean_batch_id:
                        cur.execute(
                            "SELECT * FROM applications_v2 WHERE job_id = %s AND batch_id = %s LIMIT 1;",
                            (clean_job_id, clean_batch_id)
                        )
                    else:
                        cur.execute("SELECT * FROM applications_v2 WHERE job_id = %s LIMIT 1;", (clean_job_id,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[APP_V2_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                query = self.db.client.table("applications_v2").select("*").eq("job_id", clean_job_id)
                if clean_batch_id:
                    query = query.eq("batch_id", clean_batch_id)
                result = query.limit(1).execute()
                if result.data and len(result.data) > 0:
                    return result.data[0]
            except Exception as e:
                print(f"[APP_V2_REPO] Supabase query error: {e}")

        return None

    def get_batch_applications(self, batch_id: str) -> List[Dict[str, Any]]:
        """Get all applications in a batch"""
        clean_batch_id = _clean_uuid(batch_id)
        if not clean_batch_id:
            return []

        # Primary PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "SELECT * FROM applications_v2 WHERE batch_id = %s ORDER BY created_at;",
                        (clean_batch_id,)
                    )
                    rows = cur.fetchall()
                    return [dict(row) for row in rows]
            except Exception as e:
                print(f"[APP_V2_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                result = self.db.client.table("applications_v2").select("*").eq(
                    "batch_id", clean_batch_id
                ).order("created_at").execute()
                if result.data:
                    return result.data
            except Exception as e:
                print(f"[APP_V2_REPO] Supabase query error: {e}")

        return []

    def get_queued_applications(self, batch_id: str) -> List[Dict[str, Any]]:
        """Get all QUEUED applications in a batch for processing"""
        clean_batch_id = _clean_uuid(batch_id)
        if not clean_batch_id:
            return []

        # Primary PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM applications_v2
                        WHERE batch_id = %s AND status = 'QUEUED'
                        ORDER BY created_at;
                    """, (clean_batch_id,))
                    rows = cur.fetchall()
                    return [dict(row) for row in rows]
            except Exception as e:
                print(f"[APP_V2_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                result = self.db.client.table("applications_v2").select("*").eq(
                    "batch_id", clean_batch_id
                ).eq("status", "QUEUED").order("created_at").execute()
                if result.data:
                    return result.data
            except Exception as e:
                print(f"[APP_V2_REPO] Supabase query error: {e}")

        return []


# Singleton instance
application_v2_repository = ApplicationV2Repository()
