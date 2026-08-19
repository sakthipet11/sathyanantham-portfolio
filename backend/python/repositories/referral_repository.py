from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import hashlib
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

    def list_referrals(self, company: Optional[str] = None, status: Optional[str] = None, min_score: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
        if self.db.client:
            try:
                query = self.db.client.table("referrals").select("*")
                if company:
                    query = query.ilike("company", f"%{company}%")
                if status and status != "ALL":
                    query = query.eq("status", status)
                res = query.order("created_at", desc=True).limit(limit).execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                print(f"[REFERRAL_REPO] Error querying Supabase: {e}")

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
                        return [dict(r) for r in rows]
            except Exception as e:
                print(f"[REFERRAL_REPO] PG list_referrals error: {e}")
            finally:
                pg_conn.close()

        # In-Memory fallback
        results = list(self._in_memory_referrals.values())
        if company:
            results = [r for r in results if company.lower() in (r.get("company") or "").lower()]
        if status and status != "ALL":
            results = [r for r in results if r.get("status") == status]

        return results[:limit]

    def get_referral_by_id(self, referral_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("referrals").select("*").eq("id", referral_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[REFERRAL_REPO] Error fetching referral {referral_id}: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM referrals WHERE id::text = %s LIMIT 1;", (str(referral_id),))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[REFERRAL_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        return self._in_memory_referrals.get(referral_id)

    def save_referral(self, referral_data: Dict[str, Any]) -> Dict[str, Any]:
        ref_id = referral_data.get("id")
        if not ref_id or not str(ref_id).count("-") == 4:
            ref_id = str(uuid.uuid4())
        referral_data["id"] = ref_id
        
        now = datetime.now(timezone.utc).isoformat()
        if "created_at" not in referral_data:
            referral_data["created_at"] = now
        referral_data["updated_at"] = now

        if self.db.client:
            try:
                res = self.db.client.table("referrals").upsert(referral_data).execute()
                if res.data and len(res.data) > 0:
                    self._in_memory_referrals[referral_data["id"]] = res.data[0]
                    return res.data[0]
            except Exception as e:
                print(f"[REFERRAL_REPO] Error saving referral to Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO referrals (id, company, contact_name, status)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            company = EXCLUDED.company,
                            contact_name = EXCLUDED.contact_name,
                            status = EXCLUDED.status,
                            updated_at = NOW()
                        RETURNING *;
                    """, (
                        referral_data["id"],
                        referral_data.get("company", "Figma"),
                        referral_data.get("contact_name", referral_data.get("person_name", "Marcus Vance")),
                        referral_data.get("status", "READY_FOR_REVIEW")
                    ))
                    row = cur.fetchone()
                    if row:
                        res = dict(row)
                        self._in_memory_referrals[referral_data["id"]] = res
                        return res
            except Exception as e:
                print(f"[REFERRAL_REPO] PG save_referral error: {e}")
            finally:
                pg_conn.close()

        self._in_memory_referrals[referral_data["id"]] = referral_data
        return referral_data

    def update_referral_status(self, referral_id: str, status: str, message: Optional[str] = None, sent_at: Optional[str] = None) -> Optional[Dict[str, Any]]:
        ref = self.get_referral_by_id(referral_id)
        
        now = datetime.now(timezone.utc).isoformat()

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("UPDATE referrals SET status = %s, updated_at = NOW() WHERE id::text = %s RETURNING *;", (status, str(referral_id)))
                    row = cur.fetchone()
                    if row:
                        res = dict(row)
                        self._in_memory_referrals[referral_id] = res
                        return res
            except Exception as e:
                print(f"[REFERRAL_REPO] PG update_referral_status error: {e}")
            finally:
                pg_conn.close()

        if ref:
            ref["status"] = status
            ref["updated_at"] = now
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
        all_refs = self.list_referrals(limit=100)
        return {
            "total_qualified_jobs": len(all_refs),
            "first_degree_contacts": sum(1 for r in all_refs if r.get("connection_degree") in ["1ST_DEGREE", "1ST_DEGREE_LINKEDIN"]),
            "messages_drafted": sum(1 for r in all_refs if r.get("status") in ["DRAFTED", "READY_FOR_REVIEW", "APPROVED", "SENT"]),
            "ready_for_review": sum(1 for r in all_refs if r.get("status") == "READY_FOR_REVIEW"),
            "approved": sum(1 for r in all_refs if r.get("status") == "APPROVED"),
            "sent": sum(1 for r in all_refs if r.get("status") == "SENT"),
            "replied": sum(1 for r in all_refs if r.get("status") == "REPLIED")
        }

    def delete_by_id(self, referral_id: str, actor: str = "admin_user", action: str = "MANUAL_DELETE") -> bool:
        record = self.get_referral_by_id(referral_id)
        if not record:
            return False

        # Audit log snapshot BEFORE deletion
        self.db.write_audit_log(
            actor_type="ADMIN_HUMAN" if action == "MANUAL_DELETE" else "SYSTEM_SCHEDULER",
            actor_id=actor,
            action=action,
            entity_type="referrals",
            entity_id=referral_id,
            before_state=record,
            after_state=None,
            justification=f"Hard delete referral record {referral_id}"
        )

        deleted = False
        if self.db.client:
            try:
                res = self.db.client.table("referrals").delete().eq("id", referral_id).execute()
                if res.data and len(res.data) > 0:
                    deleted = True
            except Exception as e:
                print(f"[REFERRAL_REPO] Supabase delete error: {e}")

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

    def get_expired_referrals(self, cutoff_days: int, status_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        from datetime import datetime, timezone, timedelta
        cutoff_dt = datetime.now(timezone.utc) - timedelta(days=cutoff_days)
        all_refs = self.list_referrals(limit=1000)
        expired = []
        for ref in all_refs:
            created_str = ref.get("created_at") or ref.get("discovered_at")
            if not created_str:
                continue
            try:
                dt = datetime.fromisoformat(str(created_str).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            if dt < cutoff_dt:
                ref_status = ref.get("status", "QUALIFIED")
                if status_filter and len(status_filter) > 0:
                    if ref_status in status_filter:
                        expired.append(ref)
                else:
                    expired.append(ref)
        return expired

referral_repository = ReferralRepository()
