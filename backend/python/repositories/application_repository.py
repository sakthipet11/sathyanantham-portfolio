import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

class ApplicationRepository:
    def __init__(self):
        self.db = db_helper
        self._in_memory_apps: Dict[str, Dict[str, Any]] = {}
        self._in_memory_events: List[Dict[str, Any]] = []

    def get_application_by_idempotency_key(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("applications").select("*").eq("idempotency_key", idempotency_key).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[APP_REPO] Error querying application by idempotency key: {e}")
        
        for app in self._in_memory_apps.values():
            if app.get("idempotency_key") == idempotency_key:
                return app
        return None

    def get_application_by_id(self, application_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("applications").select("*").eq("id", application_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[APP_REPO] Error fetching application {application_id}: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM applications WHERE id::text = %s LIMIT 1;", (str(application_id),))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[APP_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        return self._in_memory_apps.get(application_id)

    def get_application_by_job_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("applications").select("*").eq("job_id", job_id).order("submitted_at", desc=True).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[APP_REPO] Error fetching application by job_id: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM applications WHERE job_id::text = %s ORDER BY submitted_at DESC LIMIT 1;", (str(job_id),))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[APP_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        for app in self._in_memory_apps.values():
            if app.get("job_id") == job_id:
                return app
        return None

    def save_application(self, app_data: Dict[str, Any]) -> Dict[str, Any]:
        app_data["updated_at"] = datetime.utcnow().isoformat()
        if not app_data.get("submitted_at"):
            app_data["submitted_at"] = datetime.utcnow().isoformat()

        app_id = app_data.get("id")
        if not app_id or not app_id.count("-") == 4:
            key_to_hash = app_data.get('idempotency_key') or str(datetime.utcnow().timestamp())
            app_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(key_to_hash)))
        app_data["id"] = app_id

        if self.db.client:
            try:
                res = self.db.client.table("applications").upsert(app_data, on_conflict="idempotency_key").execute()
                if res.data and len(res.data) > 0:
                    saved = res.data[0]
                    self._in_memory_apps[saved["id"]] = saved
                    return saved
            except Exception as e:
                print(f"[APP_REPO] Error saving application to Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO applications (id, job_id, role, company, status)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            role = EXCLUDED.role,
                            company = EXCLUDED.company,
                            status = EXCLUDED.status
                        RETURNING *;
                    """, (
                        app_data["id"],
                        app_data.get("job_id", "JOB-101"),
                        app_data.get("role", "Lead Frontend Architect"),
                        app_data.get("company", "TechCorp Enterprise"),
                        app_data.get("status", "Submitted")
                    ))
                    row = cur.fetchone()
                    if row:
                        saved = dict(row)
                        self._in_memory_apps[saved["id"]] = saved
                        return saved
            except Exception as e:
                print(f"[APP_REPO] PG save_application error: {e}")
            finally:
                pg_conn.close()

        self._in_memory_apps[app_id] = app_data
        return app_data

    def update_application_status(self, app_id: str, status: str, manual_reason: Optional[str] = None, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        update_fields: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("UPDATE applications SET status = %s WHERE id::text = %s RETURNING *;", (status, str(app_id)))
                    row = cur.fetchone()
                    if row:
                        res = dict(row)
                        self._in_memory_apps[str(app_id)] = res
                        return res
            except Exception as e:
                print(f"[APP_REPO] PG update_application_status error: {e}")
            finally:
                pg_conn.close()

        if app_id in self._in_memory_apps:
            self._in_memory_apps[app_id].update(update_fields)
            return self._in_memory_apps[app_id]
        return None

    def log_event(self, application_id: str, event_type: str, message: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        event_data = {
            "id": f"evt-{hashlib.md5((application_id + event_type + str(datetime.utcnow().timestamp())).encode()).hexdigest()[:12]}",
            "application_id": application_id,
            "event_type": event_type,
            "message": message,
            "payload": payload or {},
            "created_at": datetime.utcnow().isoformat()
        }

        self._in_memory_events.append(event_data)
        return event_data

    def get_events_for_application(self, application_id: str) -> List[Dict[str, Any]]:
        return [e for e in self._in_memory_events if e.get("application_id") == application_id]

    def list_applications(self, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        if self.db.client:
            try:
                query = self.db.client.table("applications").select("*").order("submitted_at", desc=True).limit(limit)
                if status and status != "ALL":
                    query = query.eq("status", status)
                res = query.execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                print(f"[APP_REPO] Error listing applications from Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    sql = "SELECT * FROM applications"
                    params = []
                    if status and status != "ALL":
                        sql += " WHERE status = %s"
                        params.append(status)
                    sql += " ORDER BY submitted_at DESC LIMIT %s;"
                    params.append(limit)
                    cur.execute(sql, tuple(params))
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
            except Exception as e:
                print(f"[APP_REPO] PG list_applications error: {e}")
            finally:
                pg_conn.close()

        all_apps = list(self._in_memory_apps.values())
        if status and status != "ALL":
            all_apps = [a for a in all_apps if a.get("status") == status]
        return all_apps[:limit]

    def get_application_metrics(self) -> Dict[str, Any]:
        apps = self.list_applications(limit=100)
        total = len(apps)
        ready_for_review = sum(1 for a in apps if a.get("status") == "READY_FOR_REVIEW")
        approved = sum(1 for a in apps if a.get("status") == "APPROVED")
        submitted = sum(1 for a in apps if a.get("status") in ["SUBMITTED", "Submitted", "Interviewing"])
        manual_required = sum(1 for a in apps if a.get("status") == "MANUAL_REQUIRED")
        failed = sum(1 for a in apps if a.get("status") == "FAILED")
        
        success_rate = round((submitted / max(submitted + failed, 1)) * 100, 1) if (submitted + failed) > 0 else 100.0

        return {
            "total_applications": total,
            "ready_for_review": ready_for_review,
            "approved": approved,
            "submitted": submitted,
            "manual_required": manual_required,
            "failed": failed,
            "success_rate": success_rate
        }

    def delete_by_id(self, app_id: str, actor: str = "admin_user", action: str = "MANUAL_DELETE") -> bool:
        record = self.get_application_by_id(app_id)
        if not record:
            return False

        # Audit log snapshot BEFORE deletion
        self.db.write_audit_log(
            actor_type="ADMIN_HUMAN" if action == "MANUAL_DELETE" else "SYSTEM_SCHEDULER",
            actor_id=actor,
            action=action,
            entity_type="applications",
            entity_id=app_id,
            before_state=record,
            after_state=None,
            justification=f"Hard delete application record {app_id}"
        )

        deleted = False
        if self.db.client:
            try:
                res = self.db.client.table("applications").delete().eq("id", app_id).execute()
                if res.data and len(res.data) > 0:
                    deleted = True
            except Exception as e:
                print(f"[APP_REPO] Supabase delete error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM applications WHERE id::text = %s;", (str(app_id),))
                    if cur.rowcount > 0:
                        deleted = True
            except Exception as e:
                print(f"[APP_REPO] PG delete error: {e}")
            finally:
                pg_conn.close()

        if app_id in self._in_memory_apps:
            del self._in_memory_apps[app_id]
            deleted = True

        return deleted

    def delete_bulk(self, app_ids: List[str], actor: str = "admin_user", action: str = "MANUAL_DELETE") -> int:
        count = 0
        for a_id in app_ids:
            if self.delete_by_id(a_id, actor=actor, action=action):
                count += 1
        return count

    def get_expired_applications(self, cutoff_days: int, status_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        from datetime import datetime, timezone, timedelta
        cutoff_dt = datetime.now(timezone.utc) - timedelta(days=cutoff_days)
        all_apps = self.list_applications(limit=1000)
        expired = []
        for app in all_apps:
            created_str = app.get("created_at") or app.get("submitted_at")
            if not created_str:
                continue
            try:
                dt = datetime.fromisoformat(str(created_str).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            if dt < cutoff_dt:
                app_status = app.get("status", "READY_FOR_REVIEW")
                if status_filter and len(status_filter) > 0:
                    if app_status in status_filter:
                        expired.append(app)
                else:
                    expired.append(app)
        return expired

application_repository = ApplicationRepository()
