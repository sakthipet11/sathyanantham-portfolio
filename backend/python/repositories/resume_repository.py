import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

DEFAULT_MOCK_RESUMES = [
    {
        "id": "resume-v2026-sathya-architect",
        "name": "Sathyanantham_V_Frontend_Architect_2026.pdf",
        "role": "Frontend Architect",
        "score": "99%",
        "status": "ACTIVE",
        "created_at": "2026-08-16T10:00:00Z",
        "download_url": "/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf"
    },
    {
        "id": "resume-v2026-sathya-ai-lead",
        "name": "Sathyanantham_V_AI_FullStack_Lead.pdf",
        "role": "AI-Assisted Lead Engineer",
        "score": "96%",
        "status": "ACTIVE",
        "created_at": "2026-08-14T10:00:00Z",
        "download_url": "/downloads/Sathyanantham_V_AI_FullStack_Lead.pdf"
    },
    {
        "id": "resume-v2026-sathya-mfe-specialist",
        "name": "Sathyanantham_V_MicroFrontend_Specialist.pdf",
        "role": "Micro Frontend Architect",
        "score": "98%",
        "status": "ARCHIVED",
        "created_at": "2026-08-11T10:00:00Z",
        "download_url": "/downloads/Sathyanantham_V_MicroFrontend_Specialist.pdf"
    }
]

class ResumeRepository:
    def __init__(self):
        self.db = db_helper
        self._in_memory_resumes: Dict[str, Dict[str, Any]] = {r["id"]: dict(r) for r in DEFAULT_MOCK_RESUMES}

    def list_resumes(self) -> List[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("resume_versions").select("*").execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                print(f"[RESUME_REPO] Supabase list error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM resume_versions ORDER BY created_at DESC;")
                    rows = cur.fetchall()
                    if rows:
                        return [dict(r) for r in rows]
            except Exception as e:
                # Silently catch table missing notice in fresh local state
                pass
            finally:
                pg_conn.close()

        return list(self._in_memory_resumes.values())

    def get_resume_by_id(self, resume_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("resume_versions").select("*").eq("id", resume_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[RESUME_REPO] Supabase get error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM resume_versions WHERE id::text = %s LIMIT 1;", (str(resume_id),))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                pass
            finally:
                pg_conn.close()

        return self._in_memory_resumes.get(resume_id)

    def delete_by_id(self, resume_id: str, actor: str = "admin_user", action: str = "MANUAL_DELETE") -> bool:
        record = self.get_resume_by_id(resume_id)
        if not record:
            return False

        # Audit log snapshot BEFORE deletion
        self.db.write_audit_log(
            actor_type="ADMIN_HUMAN" if action == "MANUAL_DELETE" else "SYSTEM_SCHEDULER",
            actor_id=actor,
            action=action,
            entity_type="resumes",
            entity_id=resume_id,
            before_state=record,
            after_state=None,
            justification=f"Hard delete resume version record {resume_id}"
        )

        deleted = False
        if self.db.client:
            try:
                res = self.db.client.table("resume_versions").delete().eq("id", resume_id).execute()
                if res.data and len(res.data) > 0:
                    deleted = True
            except Exception as e:
                print(f"[RESUME_REPO] Supabase delete error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM resume_versions WHERE id::text = %s;", (str(resume_id),))
                    if cur.rowcount > 0:
                        deleted = True
            except Exception as e:
                pass
            finally:
                pg_conn.close()

        if resume_id in self._in_memory_resumes:
            del self._in_memory_resumes[resume_id]
            deleted = True

        return deleted

    def delete_bulk(self, resume_ids: List[str], actor: str = "admin_user", action: str = "MANUAL_DELETE") -> int:
        count = 0
        for r_id in resume_ids:
            if self.delete_by_id(r_id, actor=actor, action=action):
                count += 1
        return count

    def get_expired_resumes(self, cutoff_days: int, status_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        cutoff_dt = datetime.now(timezone.utc) - timedelta(days=cutoff_days)
        all_res = self.list_resumes()
        expired = []
        for r in all_res:
            created_str = r.get("created_at")
            if not created_str:
                continue
            try:
                dt = datetime.fromisoformat(str(created_str).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            if dt < cutoff_dt:
                res_status = r.get("status", "ACTIVE")
                if status_filter and len(status_filter) > 0:
                    if res_status in status_filter:
                        expired.append(r)
                else:
                    expired.append(r)
        return expired

resume_repository = ResumeRepository()
