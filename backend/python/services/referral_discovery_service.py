import os
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.referral_repository import referral_repository
from backend.python.services.company_normalization_service import company_normalization_service
from backend.python.services.linkedin_contact_service import linkedin_contact_service
from backend.python.services.referral_ranking_service import referral_ranking_service
from backend.python.services.referral_messaging_service import referral_messaging_service
from backend.python.services.resume_matching_service import resume_matching_service
from backend.python.services.cover_letter_service import cover_letter_service
from backend.python.services.gmail_mcp_client import gmail_mcp_client

class ReferralDiscoveryService:
    """
    Automated Referral Request Execution Platform:
    Step 1: Filter qualified jobs (ATS score >= 90 / threshold). Discard weak-fit roles.
    Step 2: Extract & normalize company identity (handle corporate aliases).
    Step 3: Match against LinkedIn contacts with strict hierarchy (1st-degree > 2nd-degree > Public;
            Engineering/Recruiting function priority; Seniority tiebreaker; graceful NO_CONTACT_FOUND).
    Step 4: Enrich contact details (verified email, LinkedIn profile URL, role/title).
    Step 5: Generate tailored materials (tailored resume PDF + tailored cover letter + draft outreach email).
    Step 6: Human review gate (Populates READY_FOR_REVIEW queue with all details and attachments).
    Step 7: Real dispatch via SMTP/Gmail with attachments + follow-up tracking.
    """

    def __init__(self, referral_ats_threshold: int = 90):
        self.referral_ats_threshold = referral_ats_threshold

    async def discover_referral_opportunities(self, threshold: Optional[int] = None) -> List[Dict[str, Any]]:
        target_threshold = threshold if threshold is not None else self.referral_ats_threshold
        
        # Step 1: Filter qualified jobs from Job Discovery / Applications pipeline where ats_score >= threshold
        all_jobs = job_repository.list_jobs(min_score=float(target_threshold), limit=100)
        
        discovered_referrals: List[Dict[str, Any]] = []

        for job in all_jobs:
            raw_company = job.get("company", "").strip()
            if not raw_company:
                continue

            # Step 2: Extract and normalize company identity (handle aliases)
            norm_company = company_normalization_service.normalize(raw_company)
            job_title = job.get("title", "Lead Frontend Architect")
            ats_score = int(job.get("match_score") or job.get("ats_score") or 90)

            # Step 3: Match against LinkedIn contacts (Priority 1: 1st-Degree, Engineering/Recruiter, Seniority)
            contact = await linkedin_contact_service.find_and_enrich_best_contact(
                company_name=norm_company,
                target_role=job_title
            )

            # Check if this job already has a referral record
            existing_refs = referral_repository.list_referrals(company=norm_company)
            already_tracked = any(r.get("job_id") == job.get("id") for r in existing_refs)
            if already_tracked:
                continue

            if not contact:
                # Step 3 (Unmatched): Mark row "No referral contact found" and skip outreach without blocking pipeline
                no_contact_record = {
                    "id": f"ref-{uuid.uuid4().hex[:12]}",
                    "job_id": job.get("id"),
                    "job_title": job_title,
                    "job_ats_score": ats_score,
                    "company": norm_company,
                    "person_name": "No referral contact found",
                    "contact_email": None,
                    "role": "None identified",
                    "profile_url": None,
                    "connection_type": "NO_CONTACT",
                    "referral_score": 0,
                    "reason": f"No warm or 1st-degree LinkedIn contact currently found at {norm_company}. Outreach skipped.",
                    "relationship_evidence": "No network connection found.",
                    "message": "",
                    "cover_letter_text": "",
                    "status": "NO_CONTACT_FOUND",
                    "attachments": [],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                saved_no_contact = referral_repository.save_referral(no_contact_record)
                referral_repository.log_audit(
                    referral_id=saved_no_contact["id"],
                    event_type="REFERRAL_NO_CONTACT",
                    actor="REFERRAL_DISCOVERY_AGENT",
                    details=f"No referral contact found at {norm_company}; marked row as NO_CONTACT_FOUND."
                )
                discovered_referrals.append(saved_no_contact)
                continue

            # Step 4: Enrich contact details (verified email, LinkedIn URL, role)
            contact_email = contact.get("contact_email") or contact.get("verified_email") or ""
            profile_url = contact.get("profile_url") or f"https://linkedin.com/company/{norm_company.lower()}"
            person_name = contact.get("person_name", "Valued Connection")
            role = contact.get("role", "Engineering Leader")
            connection_type = contact.get("connection_type", "1ST_DEGREE_LINKEDIN")

            # Rank contact
            ranking_result = referral_ranking_service.rank_contact(job, contact)

            # Step 5: Generate tailored materials
            # 5a. Pull (or match) tailored resume PDF
            matched_resume = resume_matching_service.match_resume_for_email({
                "subject": f"Referral inquiry for {job_title} at {norm_company}",
                "body": job.get("description_raw") or job.get("description") or "",
                "job_title": job_title,
                "company": norm_company
            })

            # 5b. Generate personalized tailored cover letter
            cover_letter_res = await cover_letter_service.generate_cover_letter(job=job, contact=contact)

            # 5c. Draft personalized referral-request email message referencing role, company, and attachments
            msg_res = await referral_messaging_service.generate_message(
                job=job,
                contact=contact,
                include_twin_demo=True
            )

            # Build list of attachments
            attachments = [
                {
                    "type": "RESUME_PDF",
                    "name": matched_resume.get("file_name", "Sathyanantham_V_Frontend_Architect_2026.pdf"),
                    "path": matched_resume.get("file_path"),
                    "download_url": matched_resume.get("download_url")
                },
                {
                    "type": "COVER_LETTER_TXT",
                    "name": cover_letter_res.get("file_name", f"Cover_Letter_{norm_company}.txt"),
                    "path": cover_letter_res.get("file_path"),
                    "download_url": f"/downloads/cover_letters/{cover_letter_res.get('file_name')}"
                }
            ]

            # Step 6: Human review gate — populate record in READY_FOR_REVIEW queue
            ref_record = {
                "id": f"ref-{uuid.uuid4().hex[:12]}",
                "job_id": job.get("id"),
                "job_title": job_title,
                "job_ats_score": ats_score,
                "company": norm_company,
                "person_name": person_name,
                "contact_email": contact_email,
                "role": role,
                "profile_url": profile_url,
                "connection_type": connection_type,
                "referral_score": ranking_result.get("referral_score", 95),
                "reason": ranking_result.get("reason", "Strong 1st-degree engineering contact match."),
                "relationship_evidence": ranking_result.get("relationship_evidence", "Verified 1st-Degree LinkedIn connection."),
                "subject": msg_res.get("subject", f"Referral inquiry — {job_title} at {norm_company}"),
                "message": msg_res.get("body", ""),
                "cover_letter_text": cover_letter_res.get("cover_letter_text", ""),
                "cover_letter_path": cover_letter_res.get("file_path"),
                "resume_id": matched_resume.get("resume_id"),
                "resume_file_name": matched_resume.get("file_name"),
                "resume_download_url": matched_resume.get("download_url"),
                "attachments": attachments,
                "include_twin_demo": True,
                "status": "READY_FOR_REVIEW",
                "follow_up_due_at": None,
                "follow_up_status": "NOT_SENT",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            saved = referral_repository.save_referral(ref_record)
            referral_repository.log_audit(
                referral_id=saved["id"],
                event_type="REFERRAL_DISCOVERED",
                actor="REFERRAL_DISCOVERY_AGENT",
                details=f"Discovered contact {person_name} ({connection_type}) at {norm_company}. Tailored materials generated."
            )
            discovered_referrals.append(saved)

        return discovered_referrals

    def approve_referral(self, referral_id: str, approved_by: str = "HUMAN_ADMIN") -> Dict[str, Any]:
        ref = referral_repository.get_referral_by_id(referral_id)
        if not ref:
            raise ValueError(f"Referral {referral_id} not found")
        
        updated = referral_repository.update_referral_status(referral_id, status="APPROVED")
        referral_repository.log_audit(
            referral_id=referral_id,
            event_type="HUMAN_APPROVAL_GRANTED",
            actor=approved_by,
            details="Administrator approved referral outreach message and attachments."
        )
        return {"status": "SUCCESS", "referral": updated}

    async def send_referral(
        self,
        referral_id: str,
        custom_message: Optional[str] = None,
        custom_email: Optional[str] = None,
        sent_by: str = "HUMAN_ADMIN"
    ) -> Dict[str, Any]:
        """
        Step 7: Send & track.
        On human approval, sends real MIME email via Gmail MCP / SMTP with both attachments
        (tailored resume PDF + tailored cover letter), moves record to SENT, and schedules follow-up tracker.
        """
        ref = referral_repository.get_referral_by_id(referral_id)
        if not ref:
            raise ValueError(f"Referral {referral_id} not found")
        
        if ref.get("status") == "NO_CONTACT_FOUND":
            raise ValueError(f"Cannot dispatch referral with status 'NO_CONTACT_FOUND'. Please attach a valid contact first.")

        recipient_email = custom_email or ref.get("contact_email")
        if not recipient_email or "@" not in recipient_email:
            raise ValueError(f"Valid recipient email required for dispatch (got: '{recipient_email}')")

        final_msg = custom_message or ref.get("message")
        subject = ref.get("subject") or f"Referral inquiry — {ref.get('job_title')} at {ref.get('company')}"
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()
        follow_up_due_iso = (now_dt + timedelta(days=5)).isoformat()

        # Resolve attachments (both tailored resume PDF and cover letter)
        attachments_to_send = []
        if ref.get("attachments") and isinstance(ref.get("attachments"), list):
            for att in ref.get("attachments"):
                if isinstance(att, dict) and att.get("path"):
                    attachments_to_send.append(att["path"])
                elif isinstance(att, str):
                    attachments_to_send.append(att)

        if not attachments_to_send and ref.get("resume_file_name"):
            attachments_to_send.append(ref["resume_file_name"])

        # Real SMTP Transmission via GmailMCPClient
        smtp_res = await gmail_mcp_client.send_message(
            to=recipient_email,
            subject=subject,
            body=final_msg,
            attachments=attachments_to_send
        )

        # Update status to SENT and track follow-up
        updated = referral_repository.update_referral_status(
            referral_id=referral_id,
            status="SENT",
            message=final_msg,
            sent_at=now_iso,
            contact_email=recipient_email,
            follow_up_due_at=follow_up_due_iso,
            follow_up_status="PENDING"
        )

        referral_repository.log_audit(
            referral_id=referral_id,
            event_type="REFERRAL_OUTREACH_DISPATCHED",
            actor=sent_by,
            details=f"Email successfully dispatched to {recipient_email} with attachments {smtp_res.get('attachments', [])} via SMTP. Follow-up scheduled for 5 days."
        )

        return {
            "status": "SENT",
            "referral_id": referral_id,
            "recipient_email": recipient_email,
            "recipient_name": ref.get("person_name"),
            "sent_at": now_iso,
            "follow_up_due_at": follow_up_due_iso,
            "attachments_sent": smtp_res.get("attachments", []),
            "referral": updated
        }

    async def nudge_referral(self, referral_id: str, custom_nudge_message: Optional[str] = None, sent_by: str = "HUMAN_ADMIN") -> Dict[str, Any]:
        """
        Sends a polite follow-up nudge if contact has not replied within N days.
        """
        ref = referral_repository.get_referral_by_id(referral_id)
        if not ref:
            raise ValueError(f"Referral {referral_id} not found")
        
        recipient_email = ref.get("contact_email")
        if not recipient_email:
            raise ValueError(f"No recipient email found for referral {referral_id}")

        first_name = (ref.get("person_name") or "there").split()[0]
        company = ref.get("company", "the company")
        job_title = ref.get("job_title", "the role")

        nudge_body = custom_nudge_message or (
            f"Hi {first_name},\n\n"
            f"Hope you're having a productive week! Just following up briefly on my earlier note regarding the {job_title} opening at {company}.\n\n"
            f"I wanted to check if you had a moment to glance at my portfolio (https://sathyanantham-portfolio-tv.vercel.app) or if you might be able to connect me with the hiring team.\n\n"
            f"Thanks again for your time!\n\nBest regards,\nSathyanantham V\nLead Frontend Architect"
        )

        subject = f"Following up: {ref.get('subject', f'Referral inquiry — {job_title} at {company}')}"
        now_iso = datetime.now(timezone.utc).isoformat()

        smtp_res = await gmail_mcp_client.send_message(
            to=recipient_email,
            subject=subject,
            body=nudge_body
        )

        updated = referral_repository.update_referral_status(
            referral_id=referral_id,
            status="SENT",
            follow_up_status="NUDGED",
            follow_up_due_at=None
        )

        referral_repository.log_audit(
            referral_id=referral_id,
            event_type="REFERRAL_FOLLOW_UP_SENT",
            actor=sent_by,
            details=f"Follow-up nudge dispatched to {recipient_email} via SMTP."
        )

        return {
            "status": "NUDGED",
            "referral_id": referral_id,
            "recipient_email": recipient_email,
            "sent_at": now_iso,
            "referral": updated
        }

referral_discovery_service = ReferralDiscoveryService()
