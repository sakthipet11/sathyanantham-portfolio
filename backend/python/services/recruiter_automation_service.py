import hashlib
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.email_repository import email_repository
from backend.python.repositories.job_repository import job_repository
from backend.python.services.email_classification_service import email_classification_service
from backend.python.services.gmail_mcp_client import gmail_mcp_client

class RecruiterAutomationService:
    """
    Orchestrates recruiter email ingestion, classification, draft generation,
    and human-approved outbound email dispatch via Gmail MCP.
    """

    def __init__(self):
        self.email_repo = email_repository
        self.job_repo = job_repository
        self.gmail_client = gmail_mcp_client

    async def process_inbound_email(self, raw_email: Dict[str, Any]) -> Dict[str, Any]:
        gmail_msg_id = str(raw_email.get("gmail_message_id") or raw_email.get("id") or f"msg-{uuid.uuid4().hex[:10]}")
        
        # 1. Idempotency Check
        existing = self.email_repo.get_email_by_gmail_id(gmail_msg_id)
        if existing:
            print(f"[RECRUITER_AUTO] Email {gmail_msg_id} already ingested. Skipping duplicate processing.")
            return {"status": "DUPLICATE_SKIPPED", "email": existing}

        # 2. AI Classification & Contextual Draft Generation
        classification_result = await email_classification_service.classify_and_draft(raw_email)

        # 3. Match with Existing Job in System (if possible)
        company_name = classification_result.get("company", raw_email.get("company", "Tech Enterprise"))
        matched_jobs = self.job_repo.list_jobs(limit=10)
        job_id = None
        for j in matched_jobs:
            if j.get("company", "").lower() == company_name.lower():
                job_id = j["id"]
                break

        # 4. Construct Email Record
        email_record = {
            "id": f"em-{uuid.uuid4().hex[:12]}",
            "gmail_message_id": gmail_msg_id,
            "thread_id": raw_email.get("thread_id") or f"th-{gmail_msg_id[:8]}",
            "sender": raw_email.get("sender", "recruiter@enterprise.com"),
            "sender_name": raw_email.get("sender_name", "Technical Recruiter"),
            "company": company_name,
            "subject": raw_email.get("subject", "Opportunity Inquiry"),
            "body_raw": raw_email.get("body", ""),
            "body_summary": raw_email.get("body", "")[:300] + "...",
            "classification": classification_result["classification"],
            "confidence": classification_result["confidence"],
            "job_id": job_id,
            "action": classification_result["recommended_action"],
            "requires_human_review": classification_result["requires_human_review"],
            "risk_reasons": classification_result.get("risk_reasons", []),
            "draft_reply_subject": classification_result["draft_reply_subject"],
            "draft_reply_body": classification_result["draft_reply_body"],
            "attached_resume_id": classification_result.get("suggested_resume_version_id"),
            "status": "DRAFT_READY" if classification_result.get("draft_reply_body") else "RECEIVED",
            "received_at": raw_email.get("received_at") or datetime.utcnow().isoformat()
        }

        # 5. Persist to PostgreSQL & Log Audit
        saved_email = self.email_repo.save_email(email_record)
        self.email_repo.log_audit(
            email_id=saved_email["id"],
            action="EMAIL_INGESTED_AND_CLASSIFIED",
            actor="SYSTEM_GEMINI_AGENT",
            notes=f"Classified as {email_record['classification']} (Confidence: {email_record['confidence']}). Draft staged for human review."
        )

        return {
            "status": "SUCCESS",
            "email": saved_email
        }

    async def approve_and_send_reply(
        self,
        email_id: str,
        approved_by: str = "HUMAN_ADMIN",
        custom_reply_body: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Stage 2: Outbound Human Approval Gate.
        Dispatches response only after human review and prevents duplicate sends.
        """
        email_record = self.email_repo.get_email_by_id(email_id)
        if not email_record:
            raise ValueError(f"Email record {email_id} not found.")

        # Idempotency Double-Check
        if email_record.get("status") == "SENT":
            return {
                "status": "ALREADY_SENT",
                "message": f"A reply has already been sent for email {email_id}."
            }

        final_body = custom_reply_body or email_record.get("draft_reply_body", "")
        if not final_body.strip():
            raise ValueError("Cannot send an empty email reply body.")

        # 1. Log Human Approval
        self.email_repo.log_audit(
            email_id=email_id,
            action="REPLY_APPROVED",
            actor=approved_by,
            notes=f"Human approval granted. Dispatching outbound communication."
        )

        # 2. Dispatch via Gmail MCP Client
        send_res = await self.gmail_client.send_message(
            to=email_record.get("sender", ""),
            subject=email_record.get("draft_reply_subject", f"Re: {email_record.get('subject')}"),
            body=final_body,
            thread_id=email_record.get("thread_id"),
            attachments=[{"file_id": email_record["attached_resume_id"], "type": "application/pdf"}] if email_record.get("attached_resume_id") else None
        )

        # 3. Update Database Status to SENT
        updated = self.email_repo.update_email_status(
            email_id=email_id,
            status="SENT",
            draft_reply_body=final_body,
            sent_message_id=send_res["message_id"]
        )

        self.email_repo.log_audit(
            email_id=email_id,
            action="REPLY_SENT",
            actor="GMAIL_MCP_SERVICE",
            notes=f"Successfully sent outbound message ID: {send_res['message_id']}"
        )

        return {
            "status": "SENT",
            "sent_message_id": send_res["message_id"],
            "email": updated
        }

recruiter_automation_service = RecruiterAutomationService()
