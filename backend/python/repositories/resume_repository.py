import os
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

DEFAULT_AUTHORITATIVE_RESUMES = [
    {
        "id": "resume-frontend-architect",
        "name": "Sathyanantham_V_Frontend_Architect_2026.pdf",
        "role": "Lead Frontend Architect",
        "score": "99%",
        "status": "ACTIVE",
        "created_at": "2026-08-16T10:00:00Z",
        "download_url": "/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf",
        "target_keywords": ["React", "TypeScript", "Next.js", "Frontend Architecture", "UI Lead", "Design Systems", "Web Performance"]
    },
    {
        "id": "resume-ai-lead",
        "name": "Sathyanantham_V_AI_FullStack_Lead.pdf",
        "role": "AI-Assisted Lead Engineer",
        "score": "97%",
        "status": "ACTIVE",
        "created_at": "2026-08-14T10:00:00Z",
        "download_url": "/downloads/Sathyanantham_V_AI_FullStack_Lead.pdf",
        "target_keywords": ["Python", "FastAPI", "GenAI", "LLM", "AI Agent", "RAG", "FullStack Lead", "Machine Learning"]
    },
    {
        "id": "resume-mfe-specialist",
        "name": "Sathyanantham_V_MicroFrontend_Specialist.pdf",
        "role": "Micro Frontend Architect",
        "score": "98%",
        "status": "ACTIVE",
        "created_at": "2026-08-11T10:00:00Z",
        "download_url": "/downloads/Sathyanantham_V_MicroFrontend_Specialist.pdf",
        "target_keywords": ["Micro Frontends", "Module Federation", "Webpack", "Enterprise Monorepo", "Distributed UI", "Scale"]
    },
    {
        "id": "resume-general-architect",
        "name": "Sathyanantham_V_Resume.pdf",
        "role": "Principal Architect & FullStack Lead",
        "score": "95%",
        "status": "ACTIVE",
        "created_at": "2026-08-01T10:00:00Z",
        "download_url": "/downloads/Sathyanantham_V_Resume.pdf",
        "target_keywords": ["Principal Architect", "Engineering Lead", "FullStack", "Cloud", "Distributed Systems"]
    }
]

class ResumeRepository:
    def __init__(self):
        self.db = db_helper
        self._in_memory_resumes: Dict[str, Dict[str, Any]] = {r["id"]: dict(r) for r in DEFAULT_AUTHORITATIVE_RESUMES}

    def _normalize_resume(self, row: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": str(row.get("id")),
            "name": row.get("name") or row.get("version_name") or "Sathyanantham_V_Resume.pdf",
            "role": row.get("role") or row.get("version_name") or "Lead Architect",
            "score": row.get("score") or "95%",
            "status": row.get("status") or "ACTIVE",
            "created_at": str(row.get("created_at") or datetime.now(timezone.utc).isoformat()),
            "download_url": row.get("download_url") or row.get("pdf_url") or f"/downloads/{row.get('name')}",
            "target_keywords": row.get("tailored_keywords") or []
        }

    def save_resume(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        res_id = resume_data.get("id") or str(uuid.uuid4())
        resume_data["id"] = res_id
        if "created_at" not in resume_data:
            resume_data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        self._in_memory_resumes[res_id] = dict(resume_data)

        if self.db.client:
            try:
                self.db.client.table("resume_versions").upsert(resume_data).execute()
            except Exception as e:
                print(f"[RESUME_REPO] Supabase save error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO resume_versions (id, name, version_name, role, score, status, created_at, download_url, pdf_url)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            version_name = EXCLUDED.version_name,
                            role = EXCLUDED.role,
                            score = EXCLUDED.score,
                            status = EXCLUDED.status,
                            download_url = EXCLUDED.download_url,
                            pdf_url = EXCLUDED.pdf_url;
                    """, (
                        res_id,
                        resume_data.get("name", "Tailored_Resume.pdf"),
                        resume_data.get("role", "Lead Engineer"),
                        resume_data.get("role", "Lead Engineer"),
                        resume_data.get("score", "95%"),
                        resume_data.get("status", "ACTIVE"),
                        resume_data.get("created_at"),
                        resume_data.get("download_url", f"/downloads/{resume_data.get('name')}"),
                        resume_data.get("download_url", f"/downloads/{resume_data.get('name')}")
                    ))
                    pg_conn.commit()
            except Exception as e:
                print(f"[RESUME_REPO] PG save error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        return resume_data

    def list_resumes(self) -> List[Dict[str, Any]]:
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM resume_versions ORDER BY created_at DESC;")
                    rows = cur.fetchall()
                    if rows:
                        return [self._normalize_resume(dict(r)) for r in rows]
            except Exception as e:
                print(f"[RESUME_REPO] PG list error: {e}")
            finally:
                pg_conn.close()

        if self.db.client:
            try:
                res = self.db.client.table("resume_versions").select("*").execute()
                if res.data and len(res.data) > 0:
                    return [self._normalize_resume(r) for r in res.data]
            except Exception as e:
                print(f"[RESUME_REPO] Supabase list error: {e}")

        return list(self._in_memory_resumes.values())

    def get_resume_by_id(self, resume_id: str) -> Optional[Dict[str, Any]]:
        # Match by ID or Name
        for res in self.list_resumes():
            if str(res.get("id")) == str(resume_id) or str(res.get("name")) == str(resume_id) or str(res.get("role")).lower() == str(resume_id).lower():
                return res

        for res in self._in_memory_resumes.values():
            if str(res.get("id")) == str(resume_id) or str(res.get("name")) == str(resume_id):
                return res
        return None

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
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM resume_versions WHERE id::text = %s OR name = %s;", (str(resume_id), str(resume_id)))
                    deleted_count = cur.rowcount
                    pg_conn.commit()
                    if deleted_count > 0:
                        deleted = True
            except Exception as e:
                print(f"[RESUME_REPO] PG delete error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if self.db.client:
            try:
                res = self.db.client.table("resume_versions").delete().eq("id", resume_id).execute()
                if res.data and len(res.data) > 0:
                    deleted = True
            except Exception as e:
                print(f"[RESUME_REPO] Supabase delete error: {e}")

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

resume_repository = ResumeRepository()
