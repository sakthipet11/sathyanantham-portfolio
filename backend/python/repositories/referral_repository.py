from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import hashlib
import json
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

class ReferralRepository:
    """
    Persistence layer for referrals and immutable audit events.
    Supports PostgreSQL table 'referrals' with in-memory resilient fallback.
    """

    def __init__(self):
        self.db = db_helper
        self._in_memory_referrals: Dict[str, Dict[str, Any]] = {}
        self._in_memory_events: List[Dict[str, Any]] = []

    def _hydrate_referral(self, row_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Ensures all standard referral UI fields exist on the record."""
        r_id = str(row_dict.get("id"))
        comp = row_dict.get("company", "TechCorp")
        c_name = row_dict.get("contact_name") or row_dict.get("person_name") or "Talent Acquisition Team"
        c_email = row_dict.get("contact_email") or ""
        c_url = row_dict.get("contact_linkedin") or row_dict.get("profile_url") or f"https://linkedin.com/company/{comp.lower().replace(' ', '')}"
        c_degree = row_dict.get("connection_degree") or row_dict.get("connection_type") or "APIFY_MAPS_DISCOVERY"
        status = row_dict.get("status", "READY_FOR_REVIEW")
        job_title = row_dict.get("job_title", "Lead Frontend Architect")
        ats_score = row_dict.get("job_ats_score") or row_dict.get("referral_score") or 94

        base = {
            "id": r_id,
            "job_id": row_dict.get("job_id"),
            "job_title": job_title,
            "job_ats_score": int(ats_score),
            "company": comp,
            "person_name": c_name,
            "contact_name": c_name,
            "contact_email": c_email,
            "profile_url": c_url,
            "contact_linkedin": c_url,
            "role": row_dict.get("role", "Talent Acquisition / Engineering Lead"),
            "connection_type": c_degree,
            "connection_degree": c_degree,
            "referral_score": int(ats_score),
            "reason": row_dict.get("reason", f"Matched qualified role at {comp}"),
            "relationship_evidence": row_dict.get("relationship_evidence", "Discovered verified network connection"),
            "subject": row_dict.get("subject", f"Referral inquiry — {job_title} at {comp}"),
            "message": row_dict.get("message", f"Hi {c_name.split()[0]}, I noticed {comp} is hiring for {job_title}. Given my background in micro-frontends and agentic systems, I'd love to connect."),
            "cover_letter_text": row_dict.get("cover_letter_text", f"Tailored cover letter for {comp}."),
            "resume_id": row_dict.get("resume_id", "resume-frontend-architect"),
            "resume_file_name": row_dict.get("resume_file_name", "Sathyanantham_V_Frontend_Architect_2026.pdf"),
            "resume_download_url": row_dict.get("resume_download_url", "/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf"),
            "attachments": row_dict.get("attachments") or [
                {"type": "RESUME_PDF", "name": "Sathyanantham_V_Frontend_Architect_2026.pdf", "download_url": "/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf"},
                {"type": "COVER_LETTER_TXT", "name": f"Cover_Letter_{comp}.txt", "download_url": f"/downloads/cover_letters/Cover_Letter_{comp}.txt"}
            ],
            "include_twin_demo": row_dict.get("include_twin_demo", True),
            "status": status,
            "created_at": str(row_dict.get("created_at") or datetime.now(timezone.utc).isoformat()),
            "updated_at": str(row_dict.get("updated_at") or datetime.now(timezone.utc).isoformat())
        }

        # Merge with any richer in-memory state
        if r_id in self._in_memory_referrals:
            return {**base, **self._in_memory_referrals[r_id]}
        return base

    def list_referrals(self, company: Optional[str] = None, status: Optional[str] = None, min_score: Optional[int] = None, limit: int = 100) -> List[Dict[str, Any]]:
        results = []

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    sql = "SELECT * FROM referrals"
                    conds = []
                    params = []
                    if company:
                        conds.append("company ILIKE %s")
                        params.append(f"%{company}%")
                    if status and status != "ALL":
                        conds.append("status = %s")
                        params.append(status)
                    if conds:
                        sql += " WHERE " + " AND ".join(conds)
                    sql += " ORDER BY created_at DESC LIMIT %s;"
                    params.append(limit)
                    cur.execute(sql, tuple(params))
                    rows = cur.fetchall()
                    if rows:
                        for r in rows:
                            results.append(self._hydrate_referral(dict(r)))
                        return results
            except Exception as e:
                print(f"[REFERRAL_REPO] PG list_referrals error: {e}")
            finally:
                pg_conn.close()

        # In-Memory fallback
        results = [self._hydrate_referral(r) for r in self._in_memory_referrals.values()]
        if company:
            results = [r for r in results if company.lower() in (r.get("company") or "").lower()]
        if status and status != "ALL":
            results = [r for r in results if r.get("status") == status]

        return results[:limit]

    def get_referral_by_id(self, referral_id: str) -> Optional[Dict[str, Any]]:
        ref_id_str = str(referral_id)

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM referrals WHERE id::text = %s LIMIT 1;", (ref_id_str,))
                    row = cur.fetchone()
                    if row:
                        return self._hydrate_referral(dict(row))
            except Exception as e:
                print(f"[REFERRAL_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        in_mem = self._in_memory_referrals.get(ref_id_str) or self._in_memory_referrals.get(referral_id)
        if in_mem:
            return self._hydrate_referral(in_mem)
        return None

    def save_referral(self, referral_data: Dict[str, Any]) -> Dict[str, Any]:
        ref_id = referral_data.get("id")
        try:
            # Validate or generate standard UUID string
            uuid.UUID(str(ref_id))
            ref_id_clean = str(ref_id)
        except Exception:
            key_to_hash = referral_data.get('person_name') or referral_data.get('company') or str(ref_id) or str(datetime.now(timezone.utc).timestamp())
            ref_id_clean = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(key_to_hash)))

        referral_data["id"] = ref_id_clean
        now = datetime.now(timezone.utc).isoformat()
        if "created_at" not in referral_data:
            referral_data["created_at"] = now
        referral_data["updated_at"] = now

        # Keep in-memory cache updated
        self._in_memory_referrals[ref_id_clean] = referral_data

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO referrals (id, company, contact_name, contact_email, contact_linkedin, connection_degree, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            company = EXCLUDED.company,
                            contact_name = EXCLUDED.contact_name,
                            contact_email = EXCLUDED.contact_email,
                            contact_linkedin = EXCLUDED.contact_linkedin,
                            connection_degree = EXCLUDED.connection_degree,
                            status = EXCLUDED.status,
                            updated_at = NOW()
                        RETURNING *;
                    """, (
                        ref_id_clean,
                        referral_data.get("company", "TechCorp"),
                        referral_data.get("contact_name", referral_data.get("person_name", "Talent Acquisition Team")),
                        referral_data.get("contact_email"),
                        referral_data.get("contact_linkedin") or referral_data.get("profile_url"),
                        referral_data.get("connection_degree") or referral_data.get("connection_type", "APIFY_MAPS_DISCOVERY"),
                        referral_data.get("status", "READY_FOR_REVIEW")
                    ))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        res = dict(row)
                        merged = {**referral_data, **res}
                        self._in_memory_referrals[ref_id_clean] = merged
                        return merged
            except Exception as e:
                print(f"[REFERRAL_REPO] PG save_referral error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        return referral_data

    def update_referral_status(
        self,
        referral_id: str,
        status: str,
        message: Optional[str] = None,
        sent_at: Optional[str] = None,
        contact_email: Optional[str] = None,
        follow_up_due_at: Optional[str] = None,
        follow_up_status: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        ref = self.get_referral_by_id(referral_id)
        now = datetime.now(timezone.utc).isoformat()

        updates = {"status": status, "updated_at": now}
        if message is not None:
            updates["message"] = message
        if sent_at is not None:
            updates["sent_at"] = sent_at
        if contact_email is not None:
            updates["contact_email"] = contact_email
        if follow_up_due_at is not None:
            updates["follow_up_due_at"] = follow_up_due_at
        if follow_up_status is not None:
            updates["follow_up_status"] = follow_up_status

        if referral_id in self._in_memory_referrals:
            self._in_memory_referrals[referral_id].update(updates)

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("UPDATE referrals SET status = %s, updated_at = NOW() WHERE id::text = %s RETURNING *;", (status, str(referral_id)))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        res = dict(row)
                        if referral_id in self._in_memory_referrals:
                            self._in_memory_referrals[referral_id].update(updates)
                        else:
                            self._in_memory_referrals[referral_id] = {**res, **updates}
                        return self._in_memory_referrals[referral_id]
            except Exception as e:
                print(f"[REFERRAL_REPO] PG update_referral_status error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if ref:
            ref.update(updates)
            self._in_memory_referrals[referral_id] = ref
            return ref
        return None

    def update_referral(self, referral_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        ref = self.get_referral_by_id(referral_id)
        now = datetime.now(timezone.utc).isoformat()
        updates["updated_at"] = now

        if referral_id in self._in_memory_referrals:
            self._in_memory_referrals[referral_id].update(updates)

        if ref:
            ref.update(updates)
            self._in_memory_referrals[referral_id] = ref
            return ref
        return None

    def log_audit(self, referral_id: str, event_type: str, actor: str, details: str):
        now = datetime.now(timezone.utc).isoformat()
        event = {
            "id": f"rev-{hashlib.md5((referral_id + event_type + str(datetime.now(timezone.utc).timestamp())).encode()).hexdigest()[:12]}",
            "referral_id": referral_id,
            "event_type": event_type,
            "actor": actor,
            "details": details,
            "timestamp": now
        }
        self._in_memory_events.append(event)

    def get_metrics(self) -> Dict[str, Any]:
        all_refs = self.list_referrals(limit=200)
        return {
            "total_qualified_jobs": len(all_refs),
            "first_degree_contacts": sum(1 for r in all_refs if (r.get("connection_type") or "").upper().startswith("1ST")),
            "messages_drafted": sum(1 for r in all_refs if r.get("status") in ["DRAFTED", "READY_FOR_REVIEW", "APPROVED", "SENT"]),
            "ready_for_review": sum(1 for r in all_refs if r.get("status") == "READY_FOR_REVIEW"),
            "approved": sum(1 for r in all_refs if r.get("status") == "APPROVED"),
            "sent": sum(1 for r in all_refs if r.get("status") == "SENT"),
            "no_contact_found": sum(1 for r in all_refs if r.get("status") == "NO_CONTACT_FOUND"),
            "replied": sum(1 for r in all_refs if r.get("status") == "REPLIED")
        }

    def delete_by_id(self, referral_id: str, actor: str = "admin_user", action: str = "MANUAL_DELETE") -> bool:
        record = self.get_referral_by_id(referral_id)
        if not record:
            return False

        deleted = False
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM referrals WHERE id::text = %s;", (str(referral_id),))
                    deleted_count = cur.rowcount
                    pg_conn.commit()
                    if deleted_count > 0:
                        deleted = True
            except Exception as e:
                print(f"[REFERRAL_REPO] PG delete error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if referral_id in self._in_memory_referrals:
            del self._in_memory_referrals[referral_id]
            deleted = True

        return deleted

    def delete_bulk(self, referral_ids: List[str], actor: str = "admin_user", action: str = "MANUAL_DELETE") -> int:
        count = 0
        for r_id in referral_ids:
            if self.delete_by_id(r_id, actor=actor, action=action):
                count += 1
        return count

referral_repository = ReferralRepository()
