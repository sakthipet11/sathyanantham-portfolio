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

    def list_applications(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List applications enriched with job details and ATS scores."""
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    query = """
                        SELECT 
                            a.id, a.job_id, a.resume_version_id, a.status, a.form_payload,
                            a.submission_method, a.external_confirmation_id, a.screenshot_url,
                            a.manual_reason, a.human_reviewer_notes, a.submitted_at,
                            a.idempotency_key, a.created_at, a.updated_at, a.batch_id,
                            a.portal_mapping_id, a.automation_metadata,
                            j.title AS job_title, j.company, j.location, j.apply_url,
                            j.description_raw, j.tech_stack,
                            s.overall_score AS match_score,
                            r.version_name AS resume_version_name, r.role AS resume_role, r.download_url AS resume_download_url
                        FROM applications_v2 a
                        LEFT JOIN jobs j ON a.job_id = j.id
                        LEFT JOIN (
                            SELECT DISTINCT ON (job_id) job_id, overall_score 
                            FROM job_scores 
                            ORDER BY job_id, evaluated_at DESC
                        ) s ON a.job_id = s.job_id
                        LEFT JOIN resume_versions r ON a.resume_version_id = r.id
                    """
                    conds = []
                    params = []

                    if status and status != "ALL":
                        conds.append("a.status = %s")
                        params.append(status)

                    if search:
                        conds.append("(j.title ILIKE %s OR j.company ILIKE %s OR j.location ILIKE %s OR a.status ILIKE %s)")
                        s_param = f"%{search}%"
                        params.extend([s_param, s_param, s_param, s_param])

                    if conds:
                        query += " WHERE " + " AND ".join(conds)

                    query += " ORDER BY a.updated_at DESC LIMIT %s OFFSET %s;"
                    params.extend([limit, offset])

                    cur.execute(query, tuple(params))
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
            except Exception as e:
                print(f"[APP_V2_REPO] List applications query error: {e}")
            finally:
                pg_conn.close()

        # Fallback Supabase
        if self.db.client:
            try:
                sb_query = self.db.client.table("applications_v2").select("*")
                if status and status != "ALL":
                    sb_query = sb_query.eq("status", status)
                res = sb_query.order("updated_at", desc=True).range(offset, offset + limit - 1).execute()
                if res.data:
                    return res.data
            except Exception as e:
                print(f"[APP_V2_REPO] Supabase list error: {e}")

        return []

    def get_application_with_details(self, app_id: str) -> Optional[Dict[str, Any]]:
        """Get single application joined with job and resume info."""
        clean_app_id = _clean_uuid(app_id)
        if not clean_app_id:
            return None

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT 
                            a.id, a.job_id, a.resume_version_id, a.status, a.form_payload,
                            a.submission_method, a.external_confirmation_id, a.screenshot_url,
                            a.manual_reason, a.human_reviewer_notes, a.submitted_at,
                            a.idempotency_key, a.created_at, a.updated_at, a.batch_id,
                            a.portal_mapping_id, a.automation_metadata,
                            j.title AS job_title, j.company, j.location, j.apply_url,
                            j.description_raw, j.tech_stack,
                            s.overall_score AS match_score,
                            r.version_name AS resume_version_name, r.role AS resume_role, r.download_url AS resume_download_url
                        FROM applications_v2 a
                        LEFT JOIN jobs j ON a.job_id = j.id
                        LEFT JOIN (
                            SELECT DISTINCT ON (job_id) job_id, overall_score 
                            FROM job_scores 
                            ORDER BY job_id, evaluated_at DESC
                        ) s ON a.job_id = s.job_id
                        LEFT JOIN resume_versions r ON a.resume_version_id = r.id
                        WHERE a.id = %s LIMIT 1;
                    """, (clean_app_id,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[APP_V2_REPO] Get application details error: {e}")
            finally:
                pg_conn.close()

        return self.get_application(clean_app_id)

    def get_metrics(self) -> Dict[str, Any]:
        """Calculates aggregated metrics for Applications HUD."""
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT 
                            COUNT(*) AS total_applications,
                            COUNT(*) FILTER (WHERE status = 'READY_FOR_REVIEW') AS ready_for_review_count,
                            COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'EMAIL_SENT')) AS submitted_count,
                            COUNT(*) FILTER (WHERE status IN ('QUEUED', 'PROCESSING')) AS in_progress_count,
                            COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_count,
                            COUNT(*) FILTER (WHERE automation_metadata->>'email_sent_to' IS NOT NULL) AS email_sent_count
                        FROM applications_v2;
                    """)
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[APP_V2_REPO] Metrics error: {e}")
            finally:
                pg_conn.close()

        return {
            "total_applications": 0,
            "ready_for_review_count": 0,
            "submitted_count": 0,
            "in_progress_count": 0,
            "failed_count": 0,
            "email_sent_count": 0
        }

    def delete_application(self, app_id: str) -> bool:
        """Deletes an application by ID."""
        clean_app_id = _clean_uuid(app_id)
        if not clean_app_id:
            return False

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM application_events WHERE application_id = %s;", (clean_app_id,))
                    cur.execute("DELETE FROM applications_v2 WHERE id = %s;", (clean_app_id,))
                    pg_conn.commit()
                    return True
            except Exception as e:
                pg_conn.rollback()
                print(f"[APP_V2_REPO] Delete application error: {e}")
            finally:
                pg_conn.close()

        if self.db.client:
            try:
                try:
                    self.db.client.table("application_events").delete().eq("application_id", clean_app_id).execute()
                except Exception:
                    pass
                self.db.client.table("applications_v2").delete().eq("id", clean_app_id).execute()
                return True
            except Exception as e:
                print(f"[APP_V2_REPO] Supabase delete error: {e}")

        return False

    def bulk_delete_applications(self, app_ids: List[str]) -> int:
        """Bulk deletes multiple applications."""
        clean_ids = [_clean_uuid(aid) for aid in app_ids if _clean_uuid(aid)]
        if not clean_ids:
            return 0

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM application_events WHERE application_id = ANY(%s);", (clean_ids,))
                    cur.execute("DELETE FROM applications_v2 WHERE id = ANY(%s);", (clean_ids,))
                    deleted_count = cur.rowcount
                    pg_conn.commit()
                    return deleted_count
            except Exception as e:
                pg_conn.rollback()
                print(f"[APP_V2_REPO] Bulk delete error: {e}")
            finally:
                pg_conn.close()

        if self.db.client:
            try:
                try:
                    self.db.client.table("application_events").delete().in_("application_id", clean_ids).execute()
                except Exception:
                    pass
                self.db.client.table("applications_v2").delete().in_("id", clean_ids).execute()
                return len(clean_ids)
            except Exception as e:
                print(f"[APP_V2_REPO] Supabase bulk delete error: {e}")

        return 0

    def log_event(
        self,
        app_id: str,
        event_type: str,
        message: str,
        previous_status: Optional[str] = None,
        new_status: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Logs an event to application_events table."""
        clean_app_id = _clean_uuid(app_id)
        if not clean_app_id:
            return False

        event_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        meta_json = json.dumps(metadata or {})

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO application_events
                        (id, application_id, event_type, previous_status, new_status, message, metadata, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                    """, (
                        event_id, clean_app_id, event_type, previous_status, new_status, message, meta_json, now
                    ))
                    pg_conn.commit()
                    return True
            except Exception as e:
                pg_conn.rollback()
                print(f"[APP_V2_REPO] Log event error: {e}")
            finally:
                pg_conn.close()

        return False

    def get_application_events(self, app_id: str) -> List[Dict[str, Any]]:
        """Fetch timeline events for an application."""
        clean_app_id = _clean_uuid(app_id)
        if not clean_app_id:
            return []

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM application_events
                        WHERE application_id = %s
                        ORDER BY created_at DESC;
                    """, (clean_app_id,))
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
            except Exception as e:
                print(f"[APP_V2_REPO] Get events error: {e}")
            finally:
                pg_conn.close()

        return []


# Singleton instance
application_v2_repository = ApplicationV2Repository()
