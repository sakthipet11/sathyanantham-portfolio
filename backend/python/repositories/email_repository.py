import hashlib
import uuid
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

def _normalize_datetime_iso(val: Any) -> str:
    if not val:
        return datetime.now(timezone.utc).isoformat()
    if isinstance(val, datetime):
        if val.tzinfo is None:
            val = val.replace(tzinfo=timezone.utc)
        return val.isoformat()
    val_str = str(val).strip()
    try:
        import email.utils
        dt = email.utils.parsedate_to_datetime(val_str)
        if dt:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
    except Exception:
        pass
    try:
        dt = datetime.fromisoformat(val_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()

class EmailRepository:
    def __init__(self):
        self.db = db_helper
        self._in_memory_emails: Dict[str, Dict[str, Any]] = {}
        self._in_memory_audit_logs: List[Dict[str, Any]] = []

    def _normalize_email_record(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes database rows from PostgreSQL / Supabase to unified dictionary structure.
        Eliminates KeyError: 'status' or column naming mismatches.
        """
        if not row:
            return {}

        details = row.get("ai_extracted_details") or {}
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except Exception:
                details = {}

        risk_reasons = row.get("risk_reasons") or details.get("risk_reasons") or []
        if isinstance(risk_reasons, str):
            try:
                risk_reasons = json.loads(risk_reasons)
            except Exception:
                risk_reasons = []

        status = row.get("action_status") or row.get("status") or "DRAFT_READY"
        classification = row.get("ai_classification") or row.get("classification") or "GENERAL_INQUIRY"
        confidence_val = row.get("confidence")
        if confidence_val is None:
            confidence_val = details.get("confidence", 0.95)
        try:
            confidence = float(confidence_val)
        except Exception:
            confidence = 0.95

        body_raw = row.get("body_text") or row.get("body_raw") or row.get("body") or ""
        body_summary = row.get("body_summary") or (body_raw[:250] + "..." if len(body_raw) > 250 else body_raw)

        return {
            "id": str(row.get("id")),
            "gmail_message_id": str(row.get("gmail_message_id") or row.get("id")),
            "thread_id": str(row.get("gmail_thread_id") or row.get("thread_id") or ""),
            "direction": row.get("direction") or "INBOUND",
            "sender": row.get("sender") or "recruiter@enterprise.com",
            "sender_name": row.get("sender_name") or details.get("sender_name") or "Technical Recruiter",
            "company": row.get("company") or details.get("company") or "Enterprise",
            "recipient": row.get("recipient") or "v.sathyanantham@gmail.com",
            "subject": row.get("subject") or "Opportunity Inquiry",
            "body_raw": body_raw,
            "body_text": body_raw,
            "body_html": row.get("body_html") or "",
            "body_summary": body_summary,
            "classification": classification,
            "ai_classification": classification,
            "confidence": confidence,
            "ai_extracted_details": details,
            "requires_human_review": bool(row.get("requires_human_review") if "requires_human_review" in row else row.get("requires_action", True)),
            "risk_reasons": risk_reasons,
            "status": status,
            "action_status": status,
            "draft_reply_subject": row.get("draft_reply_subject") or f"Re: {row.get('subject')}",
            "draft_reply_body": row.get("draft_reply_body") or "",
            "attached_resume_id": row.get("attached_resume_id") or details.get("suggested_resume_version_id"),
            "sent_message_id": row.get("sent_message_id"),
            "received_at": _normalize_datetime_iso(row.get("received_at") or row.get("created_at")),
            "sent_at": str(row.get("sent_at")) if row.get("sent_at") else None,
            "created_at": _normalize_datetime_iso(row.get("created_at")),
            "updated_at": _normalize_datetime_iso(row.get("updated_at"))
        }

    def get_email_by_gmail_id(self, gmail_message_id: str) -> Optional[Dict[str, Any]]:
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM emails WHERE gmail_message_id = %s LIMIT 1;", (str(gmail_message_id),))
                    row = cur.fetchone()
                    if row:
                        return self._normalize_email_record(dict(row))
            except Exception as e:
                print(f"[EMAIL_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        if self.db.client:
            try:
                res = self.db.client.table("emails").select("*").eq("gmail_message_id", gmail_message_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return self._normalize_email_record(res.data[0])
            except Exception as e:
                print(f"[EMAIL_REPO] Error querying email by gmail_message_id: {e}")

        for em in self._in_memory_emails.values():
            if em.get("gmail_message_id") == gmail_message_id:
                return self._normalize_email_record(em)
        return None

    def get_email_by_id(self, email_id: str) -> Optional[Dict[str, Any]]:
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM emails WHERE id::text = %s LIMIT 1;", (str(email_id),))
                    row = cur.fetchone()
                    if row:
                        return self._normalize_email_record(dict(row))
            except Exception as e:
                print(f"[EMAIL_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        if self.db.client:
            try:
                res = self.db.client.table("emails").select("*").eq("id", email_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return self._normalize_email_record(res.data[0])
            except Exception as e:
                print(f"[EMAIL_REPO] Error fetching email {email_id}: {e}")

        for em_id, em in self._in_memory_emails.items():
            if str(em_id) == str(email_id) or str(em.get("id")) == str(email_id):
                return self._normalize_email_record(em)
        return None

    def save_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        email_data["updated_at"] = now_iso
        if not email_data.get("received_at"):
            email_data["received_at"] = now_iso

        email_id = str(email_data.get("id") or "")
        if not email_id or email_id.count("-") != 4:
            key_to_hash = email_data.get('gmail_message_id') or email_id or str(datetime.now(timezone.utc).timestamp())
            email_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(key_to_hash)))
        email_data["id"] = email_id

        # Prepare values
        gmail_msg_id = email_data.get("gmail_message_id", email_id)
        thread_id = email_data.get("thread_id", f"th-{email_id[:8]}")
        direction = email_data.get("direction", "INBOUND")
        sender = email_data.get("sender", "recruiter@company.com")
        sender_name = email_data.get("sender_name", "Technical Recruiter")
        company = email_data.get("company", "Enterprise")
        recipient = email_data.get("recipient", "v.sathyanantham@gmail.com")
        subject = email_data.get("subject", "Interview Request")
        body_text = email_data.get("body_raw") or email_data.get("body_text") or email_data.get("body") or ""
        body_html = email_data.get("body_html", "")
        body_summary = email_data.get("body_summary") or (body_text[:250] + "..." if len(body_text) > 250 else body_text)
        ai_class = email_data.get("classification") or email_data.get("ai_classification") or "GENERAL_INQUIRY"
        confidence = float(email_data.get("confidence", 0.95))
        details = email_data.get("ai_extracted_details", {})
        req_review = bool(email_data.get("requires_human_review", True))
        risks = email_data.get("risk_reasons", [])
        status = email_data.get("status") or email_data.get("action_status") or "DRAFT_READY"
        draft_subj = email_data.get("draft_reply_subject", f"Re: {subject}")
        draft_body = email_data.get("draft_reply_body", "")
        attached_resume = email_data.get("attached_resume_id")
        sent_msg_id = email_data.get("sent_message_id")
        received_at = _normalize_datetime_iso(email_data.get("received_at", now_iso))

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO emails (
                            id, gmail_message_id, gmail_thread_id, direction,
                            sender, sender_name, company, recipient, subject,
                            body_text, body_html, body_summary, ai_classification,
                            confidence, ai_extracted_details, requires_human_review,
                            risk_reasons, action_status, draft_reply_subject,
                            draft_reply_body, attached_resume_id, sent_message_id,
                            received_at, updated_at
                        )
                        VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s
                        )
                        ON CONFLICT (gmail_message_id) DO UPDATE SET
                            subject = EXCLUDED.subject,
                            body_text = EXCLUDED.body_text,
                            body_summary = EXCLUDED.body_summary,
                            sender_name = EXCLUDED.sender_name,
                            company = EXCLUDED.company,
                            ai_classification = EXCLUDED.ai_classification,
                            confidence = EXCLUDED.confidence,
                            ai_extracted_details = EXCLUDED.ai_extracted_details,
                            requires_human_review = EXCLUDED.requires_human_review,
                            risk_reasons = EXCLUDED.risk_reasons,
                            action_status = EXCLUDED.action_status,
                            draft_reply_subject = EXCLUDED.draft_reply_subject,
                            draft_reply_body = EXCLUDED.draft_reply_body,
                            attached_resume_id = EXCLUDED.attached_resume_id,
                            sent_message_id = EXCLUDED.sent_message_id,
                            updated_at = EXCLUDED.updated_at
                        RETURNING *;
                    """, (
                        email_id, gmail_msg_id, thread_id, direction,
                        sender, sender_name, company, recipient, subject,
                        body_text, body_html, body_summary, ai_class,
                        confidence, json.dumps(details), req_review,
                        json.dumps(risks), status, draft_subj,
                        draft_body, attached_resume, sent_msg_id,
                        received_at, now_iso
                    ))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        normalized = self._normalize_email_record(dict(row))
                        self._in_memory_emails[normalized["id"]] = normalized
                        return normalized
            except Exception as e:
                print(f"[EMAIL_REPO] PG save_email error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if self.db.client:
            try:
                res = self.db.client.table("emails").upsert(email_data, on_conflict="gmail_message_id").execute()
                if res.data and len(res.data) > 0:
                    saved = self._normalize_email_record(res.data[0])
                    self._in_memory_emails[saved["id"]] = saved
                    return saved
            except Exception as e:
                print(f"[EMAIL_REPO] Error saving email to Supabase: {e}")

        normalized = self._normalize_email_record(email_data)
        self._in_memory_emails[email_id] = normalized
        return normalized

    def update_email_status(
        self,
        email_id: str,
        status: str,
        draft_reply_body: Optional[str] = None,
        attached_resume_id: Optional[str] = None,
        sent_message_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        now_iso = datetime.now(timezone.utc).isoformat()
        sent_at_val = now_iso if status == "SENT" else None

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    updates = ["action_status = %s", "updated_at = %s"]
                    params = [status, now_iso]

                    if draft_reply_body is not None:
                        updates.append("draft_reply_body = %s")
                        params.append(draft_reply_body)
                    if attached_resume_id is not None:
                        updates.append("attached_resume_id = %s")
                        params.append(attached_resume_id)
                    if sent_message_id is not None:
                        updates.append("sent_message_id = %s")
                        params.append(sent_message_id)
                    if sent_at_val:
                        updates.append("sent_at = %s")
                        params.append(sent_at_val)

                    params.append(str(email_id))
                    sql = f"UPDATE emails SET {', '.join(updates)} WHERE id::text = %s RETURNING *;"
                    cur.execute(sql, tuple(params))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        normalized = self._normalize_email_record(dict(row))
                        self._in_memory_emails[str(email_id)] = normalized
                        return normalized
            except Exception as e:
                print(f"[EMAIL_REPO] PG update_email_status error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if email_id in self._in_memory_emails:
            self._in_memory_emails[email_id]["status"] = status
            self._in_memory_emails[email_id]["action_status"] = status
            if draft_reply_body is not None:
                self._in_memory_emails[email_id]["draft_reply_body"] = draft_reply_body
            if attached_resume_id is not None:
                self._in_memory_emails[email_id]["attached_resume_id"] = attached_resume_id
            if sent_message_id is not None:
                self._in_memory_emails[email_id]["sent_message_id"] = sent_message_id
            if sent_at_val:
                self._in_memory_emails[email_id]["sent_at"] = sent_at_val
            return self._normalize_email_record(self._in_memory_emails[email_id])

        return None

    def log_audit(self, email_id: str, action: str, actor: str, notes: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        audit_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        audit_payload = dict(payload or {})
        entry = {
            "id": audit_id,
            "email_id": str(email_id),
            "action": action,
            "actor": actor,
            "notes": notes,
            "payload": audit_payload,
            "created_at": now_iso,
            "timestamp": now_iso
        }
        self._in_memory_audit_logs.append(entry)

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    # Verify if email_id is a valid UUID and exists in emails table to prevent foreign key violation
                    valid_fk_email_id = None
                    try:
                        uuid_obj = uuid.UUID(str(email_id))
                        cur.execute("SELECT 1 FROM emails WHERE id = %s LIMIT 1;", (str(uuid_obj),))
                        if cur.fetchone():
                            valid_fk_email_id = str(uuid_obj)
                        else:
                            audit_payload["unlinked_email_id"] = str(email_id)
                    except (ValueError, TypeError):
                        audit_payload["non_uuid_email_id"] = str(email_id)

                    cur.execute("""
                        INSERT INTO email_audit_logs (id, email_id, action, actor, notes, payload, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s);
                    """, (audit_id, valid_fk_email_id, action, actor, notes, json.dumps(audit_payload), now_iso))
                    pg_conn.commit()
            except Exception as e:
                print(f"[EMAIL_REPO] Warning logging audit event: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        return entry

    def get_audit_logs(self, email_id: str) -> List[Dict[str, Any]]:
        logs = []
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM email_audit_logs 
                        WHERE email_id::text = %s OR payload->>'unlinked_email_id' = %s OR payload->>'non_uuid_email_id' = %s
                        ORDER BY created_at ASC;
                    """, (str(email_id), str(email_id), str(email_id)))
                    rows = cur.fetchall()
                    if rows:
                        logs = [dict(r) for r in rows]
            except Exception as e:
                print(f"[EMAIL_REPO] Error fetching audit logs: {e}")
            finally:
                pg_conn.close()

        if not logs:
            logs = [l for l in self._in_memory_audit_logs if str(l.get("email_id")) == str(email_id)]

        return logs

    def list_emails(
        self,
        classification: Optional[str] = None,
        status: Optional[str] = None,
        requires_review: Optional[bool] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        all_emails: List[Dict[str, Any]] = []

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    sql = "SELECT * FROM emails WHERE 1=1"
                    params = []

                    if classification and classification != "ALL":
                        sql += " AND ai_classification = %s"
                        params.append(classification)
                    if status and status != "ALL":
                        sql += " AND action_status = %s"
                        params.append(status)
                    if requires_review is not None:
                        sql += " AND requires_human_review = %s"
                        params.append(requires_review)
                    if search:
                        sql += " AND (sender ILIKE %s OR company ILIKE %s OR subject ILIKE %s OR body_text ILIKE %s)"
                        s_term = f"%{search}%"
                        params.extend([s_term, s_term, s_term, s_term])

                    sql += " ORDER BY received_at DESC LIMIT %s OFFSET %s;"
                    params.extend([limit, offset])
                    cur.execute(sql, tuple(params))
                    rows = cur.fetchall()
                    if rows:
                        all_emails = [self._normalize_email_record(dict(r)) for r in rows]
            except Exception as e:
                print(f"[EMAIL_REPO] PG list_emails error: {e}")
            finally:
                pg_conn.close()

        if not all_emails and self.db.client:
            try:
                query = self.db.client.table("emails").select("*").order("received_at", desc=True).limit(limit)
                if classification and classification != "ALL":
                    query = query.eq("ai_classification", classification)
                res = query.execute()
                all_emails = [self._normalize_email_record(r) for r in (res.data or [])]
            except Exception as e:
                print(f"[EMAIL_REPO] Error listing emails from Supabase: {e}")

        if not all_emails:
            emails_list = [self._normalize_email_record(e) for e in self._in_memory_emails.values()]
            if classification and classification != "ALL":
                emails_list = [e for e in emails_list if e.get("classification") == classification]
            if status and status != "ALL":
                emails_list = [e for e in emails_list if e.get("status") == status]
            if requires_review is not None:
                emails_list = [e for e in emails_list if e.get("requires_human_review") == requires_review]
            if search:
                s_lower = search.lower()
                emails_list = [e for e in emails_list if s_lower in e.get("sender", "").lower() or s_lower in e.get("company", "").lower() or s_lower in e.get("subject", "").lower()]
            all_emails = sorted(emails_list, key=lambda x: x.get("received_at", ""), reverse=True)

        return all_emails[offset : offset + limit]

    def get_email_metrics(self) -> Dict[str, Any]:
        emails = self.list_emails(limit=500)
        total = len(emails)
        interview_requests = sum(1 for e in emails if e.get("classification") in ["INTERVIEW_REQUEST", "INTERVIEW_INVITE"])
        resume_requests = sum(1 for e in emails if e.get("classification") == "RESUME_REQUEST")
        pending_review = sum(1 for e in emails if e.get("requires_human_review") is True and e.get("status") != "SENT")
        offers = sum(1 for e in emails if e.get("classification") in ["JOB_OFFER", "OFFER"])
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
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM email_audit_logs WHERE email_id::text = %s;", (str(email_id),))
                    cur.execute("DELETE FROM emails WHERE id::text = %s OR gmail_message_id = %s;", (str(email_id), str(email_id)))
                    deleted_count = cur.rowcount
                    pg_conn.commit()
                    if deleted_count > 0:
                        deleted = True
            except Exception as e:
                print(f"[EMAIL_REPO] PG delete error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if self.db.client:
            try:
                res = self.db.client.table("emails").delete().eq("id", email_id).execute()
                if res.data and len(res.data) > 0:
                    deleted = True
            except Exception as e:
                print(f"[EMAIL_REPO] Supabase delete error: {e}")

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
                email_status = em.get("status") or "RECEIVED"
                if status_filter and len(status_filter) > 0:
                    if email_status in status_filter:
                        expired.append(em)
                else:
                    expired.append(em)
        return expired

email_repository = EmailRepository()
