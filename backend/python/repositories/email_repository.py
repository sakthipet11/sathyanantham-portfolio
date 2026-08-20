import hashlib
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

class EmailRepository:
    def __init__(self):
        self.db = db_helper
        self._in_memory_emails: Dict[str, Dict[str, Any]] = {}
        self._in_memory_audit_logs: List[Dict[str, Any]] = []

    def get_email_by_gmail_id(self, gmail_message_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("emails").select("*").eq("gmail_message_id", gmail_message_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[EMAIL_REPO] Error querying email by gmail_message_id: {e}")
        
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM emails WHERE gmail_message_id = %s LIMIT 1;", (gmail_message_id,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[EMAIL_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        for em in self._in_memory_emails.values():
            if em.get("gmail_message_id") == gmail_message_id:
                return em
        return None

    def get_email_by_id(self, email_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("emails").select("*").eq("id", email_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[EMAIL_REPO] Error fetching email {email_id}: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM emails WHERE id::text = %s LIMIT 1;", (str(email_id),))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[EMAIL_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        return self._in_memory_emails.get(email_id)

    def save_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        email_data["updated_at"] = datetime.utcnow().isoformat()
        if not email_data.get("received_at"):
            email_data["received_at"] = datetime.utcnow().isoformat()

        email_id = email_data.get("id")
        if not email_id or email_id.count("-") != 4:
            key_to_hash = email_data.get('gmail_message_id') or email_id or str(datetime.utcnow().timestamp())
            email_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(key_to_hash)))
        email_data["id"] = email_id

        if self.db.client:
            try:
                res = self.db.client.table("emails").upsert(email_data, on_conflict="gmail_message_id").execute()
                if res.data and len(res.data) > 0:
                    saved = res.data[0]
                    self._in_memory_emails[saved["id"]] = saved
                    return saved
            except Exception as e:
                print(f"[EMAIL_REPO] Error saving email to Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO emails (id, gmail_message_id, direction, sender, recipient, subject, body_text)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (gmail_message_id) DO UPDATE SET
                            subject = EXCLUDED.subject,
                            body_text = EXCLUDED.body_text
                        RETURNING *;
                    """, (
                        email_data["id"],
                        email_data.get("gmail_message_id", email_id),
                        email_data.get("direction", "INBOUND"),
                        email_data.get("sender", "recruiter@company.com"),
                        email_data.get("recipient", "v.sathyanantham@gmail.com"),
                        email_data.get("subject", "Interview Request"),
                        email_data.get("body_text", "")
                    ))
                    row = cur.fetchone()
                    if row:
                        saved = dict(row)
                        self._in_memory_emails[saved["id"]] = saved
                        return saved
            except Exception as e:
                print(f"[EMAIL_REPO] PG save_email error: {e}")
            finally:
                pg_conn.close()

        self._in_memory_emails[email_id] = email_data
        return email_data

    def update_email_status(self, email_id: str, status: str, draft_reply_body: Optional[str] = None, sent_message_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        update_fields: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("UPDATE emails SET action_status = %s WHERE id::text = %s RETURNING *;", (status, str(email_id)))
                    row = cur.fetchone()
                    if row:
                        res = dict(row)
                        self._in_memory_emails[str(email_id)] = res
                        return res
            except Exception as e:
                print(f"[EMAIL_REPO] PG update_email_status error: {e}")
            finally:
                pg_conn.close()

        if email_id in self._in_memory_emails:
            self._in_memory_emails[email_id].update(update_fields)
            return self._in_memory_emails[email_id]
        return None

    def log_audit(self, email_id: str, action: str, actor: str, notes: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        entry = {
            "id": f"aud-{hashlib.md5((email_id + action + str(datetime.utcnow().timestamp())).encode()).hexdigest()[:12]}",
            "email_id": email_id,
            "action": action,
            "actor": actor,
            "notes": notes,
            "payload": payload or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self._in_memory_audit_logs.append(entry)
        return entry

    def list_emails(self, classification: Optional[str] = None, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        all_emails: List[Dict[str, Any]] = []
        if self.db.client:
            try:
                query = self.db.client.table("emails").select("*").order("created_at", desc=True).limit(limit)
                if classification and classification != "ALL":
                    query = query.eq("ai_classification", classification)
                res = query.execute()
                all_emails = res.data or []
            except Exception as e:
                print(f"[EMAIL_REPO] Error listing emails from Supabase: {e}")

        if not all_emails:
            pg_conn = self.db._get_pg_connection()
            if pg_conn:
                try:
                    with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        sql = "SELECT * FROM emails"
                        conds = []
                        params = []
                        if classification and classification != "ALL":
                            conds.append("ai_classification = %s")
                            params.append(classification)
                        if conds:
                            sql += " WHERE " + " AND ".join(conds)
                        sql += " ORDER BY created_at DESC LIMIT %s;"
                        params.append(limit)
                        cur.execute(sql, tuple(params))
                        rows = cur.fetchall()
                        all_emails = [dict(r) for r in rows]
                except Exception as e:
                    print(f"[EMAIL_REPO] PG list_emails error: {e}")
                finally:
                    pg_conn.close()

        if not all_emails:
            all_emails = list(self._in_memory_emails.values())

        return all_emails[:limit]

    def get_email_metrics(self) -> Dict[str, Any]:
        emails = self.list_emails(limit=100)
        total = len(emails)
        interview_requests = sum(1 for e in emails if e.get("ai_classification") == "INTERVIEW_INVITE")
        resume_requests = sum(1 for e in emails if e.get("ai_classification") == "RESUME_REQUEST")
        pending_review = sum(1 for e in emails if e.get("requires_action") is True)
        offers = sum(1 for e in emails if e.get("ai_classification") == "OFFER")
        rejections = sum(1 for e in emails if e.get("ai_classification") == "REJECTION")
        replies_sent = sum(1 for e in emails if e.get("action_status") == "SENT")

        return {
            "total_emails": total,
            "interview_requests": interview_requests,
            "resume_requests": resume_requests,
            "pending_review": pending_review,
            "offers": offers,
            "rejections": rejections,
            "replies_sent": replies_sent
        }

    def delete_by_id(self, email_id: str, actor: str = "admin_user", action: str = "MANUAL_DELETE") -> bool:
        record = self.get_email_by_id(email_id)
        if not record:
            return False

        # Audit log snapshot BEFORE deletion
        self.db.write_audit_log(
            actor_type="ADMIN_HUMAN" if action == "MANUAL_DELETE" else "SYSTEM_SCHEDULER",
            actor_id=actor,
            action=action,
            entity_type="emails",
            entity_id=email_id,
            before_state=record,
            after_state=None,
            justification=f"Hard delete email record {email_id}"
        )

        deleted = False
        if self.db.client:
            try:
                res = self.db.client.table("recruiter_emails").delete().eq("id", email_id).execute()
                if res.data and len(res.data) > 0:
                    deleted = True
            except Exception as e:
                print(f"[EMAIL_REPO] Supabase delete error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM recruiter_emails WHERE id::text = %s;", (str(email_id),))
                    if cur.rowcount > 0:
                        deleted = True
            except Exception as e:
                print(f"[EMAIL_REPO] PG delete error: {e}")
            finally:
                pg_conn.close()

        if email_id in self._in_memory_emails:
            del self._in_memory_emails[email_id]
            deleted = True

        return deleted

    def delete_bulk(self, email_ids: List[str], actor: str = "admin_user", action: str = "MANUAL_DELETE") -> int:
        count = 0
        for e_id in email_ids:
            if self.delete_by_id(e_id, actor=actor, action=action):
                count += 1
        return count

    def get_expired_emails(self, cutoff_days: int, status_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        from datetime import datetime, timezone, timedelta
        cutoff_dt = datetime.now(timezone.utc) - timedelta(days=cutoff_days)
        all_emails = self.list_emails(limit=1000)
        expired = []
        for em in all_emails:
            created_str = em.get("received_at") or em.get("created_at")
            if not created_str:
                continue
            try:
                dt = datetime.fromisoformat(str(created_str).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            if dt < cutoff_dt:
                email_status = em.get("action_status") or em.get("status") or "RECEIVED"
                if status_filter and len(status_filter) > 0:
                    if email_status in status_filter:
                        expired.append(em)
                else:
                    expired.append(em)
        return expired

email_repository = EmailRepository()
