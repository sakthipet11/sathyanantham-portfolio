import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.supabase_repo import db_helper

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
        return self._in_memory_emails.get(email_id)

    def save_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        email_data["updated_at"] = datetime.utcnow().isoformat()
        if not email_data.get("received_at"):
            email_data["received_at"] = datetime.utcnow().isoformat()

        email_id = email_data.get("id") or f"em-{hashlib.md5((email_data.get('gmail_message_id') or str(datetime.utcnow().timestamp())).encode()).hexdigest()[:12]}"
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

        self._in_memory_emails[email_id] = email_data
        return email_data

    def update_email_status(self, email_id: str, status: str, draft_reply_body: Optional[str] = None, sent_message_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        update_fields: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        if draft_reply_body is not None:
            update_fields["draft_reply_body"] = draft_reply_body
        if sent_message_id:
            update_fields["sent_message_id"] = sent_message_id
            update_fields["sent_at"] = datetime.utcnow().isoformat()

        if self.db.client:
            try:
                res = self.db.client.table("emails").update(update_fields).eq("id", email_id).execute()
                if res.data and len(res.data) > 0:
                    self._in_memory_emails[email_id] = res.data[0]
                    return res.data[0]
            except Exception as e:
                print(f"[EMAIL_REPO] Error updating email status in Supabase: {e}")

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
                query = self.db.client.table("emails").select("*").order("received_at", desc=True).limit(limit)
                if classification and classification != "ALL":
                    query = query.eq("classification", classification)
                if status and status != "ALL":
                    query = query.eq("status", status)
                res = query.execute()
                all_emails = res.data or []
            except Exception as e:
                print(f"[EMAIL_REPO] Error listing emails from Supabase: {e}")
                all_emails = list(self._in_memory_emails.values())
        else:
            all_emails = list(self._in_memory_emails.values())

        if not self.db.client:
            if classification and classification != "ALL":
                all_emails = [e for e in all_emails if e.get("classification") == classification]
            if status and status != "ALL":
                all_emails = [e for e in all_emails if e.get("status") == status]

        return all_emails[:limit]

    def get_email_metrics(self) -> Dict[str, Any]:
        emails = list(self._in_memory_emails.values())
        if self.db.client:
            try:
                res = self.db.client.table("emails").select("id, classification, status, requires_human_review").execute()
                if res.data:
                    emails = res.data
            except Exception:
                pass

        total = len(emails)
        interview_requests = sum(1 for e in emails if e.get("classification") == "INTERVIEW_REQUEST")
        resume_requests = sum(1 for e in emails if e.get("classification") == "RESUME_REQUEST")
        pending_review = sum(1 for e in emails if e.get("requires_human_review") is True and e.get("status") in ["RECEIVED", "CLASSIFIED", "DRAFT_READY"])
        offers = sum(1 for e in emails if e.get("classification") == "OFFER")
        rejections = sum(1 for e in emails if e.get("classification") == "REJECTION")
        replies_sent = sum(1 for e in emails if e.get("status") == "SENT")

        return {
            "total_emails": total,
            "interview_requests": interview_requests,
            "resume_requests": resume_requests,
            "pending_review": pending_review,
            "offers": offers,
            "rejections": rejections,
            "replies_sent": replies_sent
        }

email_repository = EmailRepository()
