import os
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.python.repositories.email_repository import email_repository
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.resume_repository import resume_repository
from backend.python.services.email_classification_service import email_classification_service
from backend.python.services.resume_matching_service import resume_matching_service
from backend.python.services.gmail_mcp_client import gmail_mcp_client

class RecruiterAutomationService:
    """
    Orchestrates inbound recruiter email ingestion, AI classification,
    tailored resume matching, safety risk gating, auto-response policies,
    and human-approved outbound email dispatch via Gmail.
    """

    def __init__(self):
        self.email_repo = email_repository
        self.job_repo = job_repository
        self.resume_repo = resume_repository
        self.classification_service = email_classification_service
        self.resume_matcher = resume_matching_service
        self.gmail_client = gmail_mcp_client
        self.repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

        # Default Automation Policy
        self.automation_policy = {
            "auto_reply_resume_requests": False,  # Default to staging draft for human review
            "min_confidence_auto_reply": 0.95,
            "require_review_for_all": True
        }

    async def process_inbound_email(self, raw_email: Dict[str, Any]) -> Dict[str, Any]:
        gmail_msg_id = str(raw_email.get("gmail_message_id") or raw_email.get("id") or f"msg-{uuid.uuid4().hex[:10]}")
        
        # 1. Idempotency Check
        existing = self.email_repo.get_email_by_gmail_id(gmail_msg_id)
        if existing:
            print(f"[RECRUITER_AUTO] Email {gmail_msg_id} already ingested. Skipping duplicate processing.")
            return {"status": "DUPLICATE_SKIPPED", "email": existing}

        # 2. AI Classification & Contextual Draft Generation
        classification_result = await self.classification_service.classify_and_draft(raw_email)

        # 3. Match with Existing Job Listing (if present)
        company_name = classification_result.get("company", raw_email.get("company", "Enterprise Hiring"))
        matched_jobs = self.job_repo.list_jobs(limit=20)
        job_id = None
        for j in matched_jobs:
            if j.get("company", "").lower() == company_name.lower():
                job_id = j["id"]
                break

        # 4. Tailored Resume Resolution
        attached_resume_id = classification_result.get("suggested_resume_version_id")
        if not attached_resume_id and classification_result.get("classification") == "RESUME_REQUEST":
            match_res = self.resume_matcher.match_resume_for_email({
                "subject": raw_email.get("subject", ""),
                "body": raw_email.get("body", ""),
                "company": company_name
            })
            attached_resume_id = match_res["resume_id"]

        # 5. Construct Email Record
        body_content = raw_email.get("body") or raw_email.get("body_raw") or raw_email.get("body_text") or ""
        email_record = {
            "id": str(uuid.uuid4()),
            "gmail_message_id": gmail_msg_id,
            "thread_id": raw_email.get("thread_id") or f"th-{gmail_msg_id[:8]}",
            "sender": raw_email.get("sender", "recruiter@enterprise.com"),
            "sender_name": classification_result.get("sender_name") or raw_email.get("sender_name") or "Technical Recruiter",
            "company": company_name,
            "subject": raw_email.get("subject", "Opportunity Inquiry"),
            "body_raw": body_content,
            "body_text": body_content,
            "body_html": raw_email.get("body_html", ""),
            "body_summary": body_content[:300] + "..." if len(body_content) > 300 else body_content,
            "classification": classification_result["classification"],
            "ai_classification": classification_result["classification"],
            "confidence": classification_result["confidence"],
            "job_id": job_id,
            "action": classification_result.get("recommended_action", "Review message"),
            "requires_human_review": classification_result["requires_human_review"],
            "risk_reasons": classification_result.get("risk_reasons", []),
            "ai_extracted_details": classification_result.get("extracted_entities", {}),
            "draft_reply_subject": classification_result.get("draft_reply_subject", f"Re: {raw_email.get('subject')}"),
            "draft_reply_body": classification_result.get("draft_reply_body", ""),
            "attached_resume_id": attached_resume_id,
            "status": "DRAFT_READY" if classification_result.get("draft_reply_body") else "RECEIVED",
            "received_at": raw_email.get("received_at") or datetime.now(timezone.utc).isoformat()
        }

        # 6. Persist to Database & Log Audit
        saved_email = self.email_repo.save_email(email_record)
        self.email_repo.log_audit(
            email_id=saved_email["id"],
            action="EMAIL_INGESTED_AND_CLASSIFIED",
            actor="SYSTEM_AI_CLASSIFIER",
            notes=f"Classified as {email_record['classification']} (Confidence: {email_record['confidence']:.2f}). Draft staged with attached resume: {attached_resume_id or 'None'}."
        )

        # 7. Check Optional Auto-Response Policy
        if (
            self.automation_policy.get("auto_reply_resume_requests") and
            classification_result.get("classification") == "RESUME_REQUEST" and
            not classification_result.get("requires_human_review") and
            classification_result.get("confidence", 0) >= self.automation_policy.get("min_confidence_auto_reply", 0.95)
        ):
            print(f"[RECRUITER_AUTO] Auto-response triggered for resume request {saved_email['id']}.")
            auto_send_res = await self.approve_and_send_reply(
                email_id=saved_email["id"],
                approved_by="AUTONOMOUS_POLICY_AGENT"
            )
            saved_email = auto_send_res["email"]

        return {
            "status": "SUCCESS",
            "email": saved_email
        }

    async def approve_and_send_reply(
        self,
        email_id: str,
        approved_by: str = "HUMAN_ADMIN",
        custom_reply_body: Optional[str] = None,
        selected_resume_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Human Approval Gate:
        Dispatches outbound communication only after human review and prevents duplicate sends.
        """
        email_record = self.email_repo.get_email_by_id(email_id)
        if not email_record:
            raise ValueError(f"Email record {email_id} not found.")

        # Idempotency Check
        if email_record.get("status") == "SENT":
            return {
                "status": "ALREADY_SENT",
                "message": f"A reply has already been sent for email {email_id}."
            }

        final_body = custom_reply_body or email_record.get("draft_reply_body", "")
        if not final_body.strip():
            raise ValueError("Cannot send an empty email reply body.")

        target_resume_id = selected_resume_id or email_record.get("attached_resume_id")
        
        # Resolve physical PDF attachment path
        attachment_path = None
        if target_resume_id:
            res_obj = self.resume_repo.get_resume_by_id(target_resume_id)
            file_name = res_obj.get("name") if res_obj else f"{target_resume_id}.pdf"
            candidate_path = os.path.join(self.repo_root, "public", "downloads", file_name)
            if not os.path.exists(candidate_path):
                candidate_path = os.path.join(self.repo_root, "public", "resume.pdf")
            if os.path.exists(candidate_path):
                attachment_path = candidate_path

        # 1. Log Human Approval
        self.email_repo.log_audit(
            email_id=email_id,
            action="REPLY_APPROVED",
            actor=approved_by,
            notes=f"Approval granted by {approved_by}. Dispatching outbound email with attached resume: {os.path.basename(attachment_path) if attachment_path else 'None'}."
        )

        # 2. Dispatch via Gmail Client
        send_res = await self.gmail_client.send_message(
            to=email_record.get("sender", ""),
            subject=email_record.get("draft_reply_subject", f"Re: {email_record.get('subject')}"),
            body=final_body,
            thread_id=email_record.get("thread_id"),
            in_reply_to=email_record.get("gmail_message_id"),
            attachment_path=attachment_path
        )

        # 3. Update Database Status to SENT
        updated = self.email_repo.update_email_status(
            email_id=email_id,
            status="SENT",
            draft_reply_body=final_body,
            attached_resume_id=target_resume_id,
            sent_message_id=send_res["message_id"]
        )

        self.email_repo.log_audit(
            email_id=email_id,
            action="REPLY_SENT",
            actor="GMAIL_MCP_SERVICE",
            notes=f"Successfully sent outbound message ID: {send_res['message_id']} to {email_record.get('sender')}"
        )

        return {
            "status": "SENT",
            "sent_message_id": send_res["message_id"],
            "email": updated
        }

    async def sync_live_inbox(self, max_messages: int = 25, since_days: int = 2) -> Dict[str, Any]:
        """
        Polls Gmail inbox over IMAP (targeting the configured timeframe, e.g. last 1-2 days),
        extracts recruiter emails, and runs them through the ingestion & classification pipeline.
        """
        fetched = await self.gmail_client.fetch_recent_messages(
            folder="INBOX",
            max_results=max_messages,
            since_days=since_days
        )
        ingested_count = 0
        skipped_count = 0
        results = []

        for raw_em in fetched:
            res = await self.process_inbound_email(raw_em)
            if res.get("status") == "SUCCESS":
                ingested_count += 1
            else:
                skipped_count += 1
            results.append(res)

        return {
            "status": "SYNC_COMPLETE",
            "connected_email_account": self.gmail_client.email_address,
            "since_days": since_days,
            "total_fetched": len(fetched),
            "newly_ingested": ingested_count,
            "skipped_duplicates": skipped_count,
            "details": results
        }

recruiter_automation_service = RecruiterAutomationService()
