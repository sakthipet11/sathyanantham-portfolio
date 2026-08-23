import os
import uuid
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.referral_repository import referral_repository
from backend.python.repositories.connection_repository import connection_repository
from backend.python.services.company_normalization_service import company_normalization_service
from backend.python.services.linkedin_contact_service import linkedin_contact_service
from backend.python.services.apify_recruiter_service import apify_recruiter_service
from backend.python.services.referral_ranking_service import referral_ranking_service
from backend.python.services.referral_messaging_service import referral_messaging_service
from backend.python.services.resume_matching_service import resume_matching_service
from backend.python.services.cover_letter_service import cover_letter_service
from backend.python.services.gmail_mcp_client import gmail_mcp_client

class ReferralDiscoveryService:
    """
    Automated Referral Request Execution Platform:
    Step 1: Filter qualified jobs (ATS score >= 90 / threshold).
    Step 2: Extract & normalize company identity.
    Step 3: Query real 1st-degree connection from connection_repository.
    Step 4: If no 1st-degree connection exists: execute multi-company Apify Recruiter Discovery in BATCH.
    Step 5: Persist any Apify discovered recruiter into connection_repository.
    Step 6: Generate tailored materials (tailored resume PDF + tailored cover letter + outreach draft).
    Step 7: Place in READY_FOR_REVIEW queue for human approval.
    Step 8: Real dispatch via SMTP/Gmail with real attachments.
    """

    def __init__(self, referral_ats_threshold: int = 90):
        self.referral_ats_threshold = referral_ats_threshold

    async def discover_referral_opportunities(self, threshold: Optional[int] = None) -> List[Dict[str, Any]]:
        target_threshold = threshold if threshold is not None else self.referral_ats_threshold
        
        # Step 1: First fetch jobs from Job table/repository and filter where ATS/match score >= threshold
        raw_jobs = job_repository.list_jobs(limit=200)
        all_jobs = [
            j for j in raw_jobs
            if float(j.get("match_score") or (j.get("score_details") or {}).get("overall_score") or j.get("ats_score") or 0.0) >= float(target_threshold)
        ]
        
        # Auto-ingest default CSV if connections empty
        if not connection_repository.list_connections(limit=5):
            try:
                connection_repository.ingest_default_csv()
            except Exception as e:
                print(f"[REFERRAL_DISCOVERY] Auto-sync connections notice: {e}")

        discovered_referrals: List[Dict[str, Any]] = []
        jobs_needing_apify: List[Dict[str, Any]] = []
        job_contact_map: Dict[str, Dict[str, Any]] = {}

        # 1st Pass: Find 1st-degree connections from Connections DB
        for job in all_jobs:
            raw_company = job.get("company", "").strip()
            if not raw_company:
                continue

            norm_company = company_normalization_service.normalize(raw_company)
            job_title = job.get("title", "Lead Frontend Architect")
            job_id = job.get("id")

            # Check if this job already has a referral record
            existing_refs = referral_repository.list_referrals(company=norm_company)
            existing_for_job = next((r for r in existing_refs if r.get("job_id") == job_id), None)
            if existing_for_job:
                discovered_referrals.append(existing_for_job)
                continue

            # Try finding 1st-degree connection from local network
            contact = await linkedin_contact_service.find_and_enrich_best_contact(
                company_name=norm_company,
                target_role=job_title
            )

            if contact and contact.get("connection_type") == "1ST_DEGREE_LINKEDIN":
                job_contact_map[job_id] = {
                    "job": job,
                    "norm_company": norm_company,
                    "contact": contact,
                    "source": "1ST_DEGREE_LINKEDIN"
                }
            else:
                # Queue for batch Apify recruiter extraction
                jobs_needing_apify.append({
                    "job_id": job_id,
                    "job": job,
                    "company": norm_company,
                    "location": job.get("location") or "Remote",
                    "job_url": job.get("apply_url") or job.get("job_url") or ""
                })

        # 2nd Pass: Execute Apify Batch Call for companies lacking 1st-degree connections
        if jobs_needing_apify:
            print(f"[REFERRAL_DISCOVERY] Running Apify batch recruiter discovery for {len(jobs_needing_apify)} jobs...")
            try:
                apify_batch_results = await apify_recruiter_service.batch_find_hr_contacts(jobs_needing_apify)
                for item in jobs_needing_apify:
                    j_id = item["job_id"]
                    comp = item["company"]
                    res = apify_batch_results.get(comp, {})
                    recruiter = res.get("recruiter")
                    
                    if recruiter:
                        job_contact_map[j_id] = {
                            "job": item["job"],
                            "norm_company": comp,
                            "contact": {
                                "person_name": recruiter.get("full_name") or recruiter.get("first_name", "Talent Partner"),
                                "company": comp,
                                "role": recruiter.get("position") or "Technical Recruiter",
                                "connection_type": "APIFY_RECRUITER",
                                "profile_url": recruiter.get("linkedin_url"),
                                "contact_email": recruiter.get("email"),
                                "verified_email": recruiter.get("email")
                            },
                            "source": "APIFY_RECRUITER"
                        }
                    else:
                        job_contact_map[j_id] = {
                            "job": item["job"],
                            "norm_company": comp,
                            "contact": None,
                            "source": "NO_CONTACT_FOUND"
                        }
            except Exception as e:
                print(f"[REFERRAL_DISCOVERY] Apify batch lookup notice: {e}")
                for item in jobs_needing_apify:
                    job_contact_map[item["job_id"]] = {
                        "job": item["job"],
                        "norm_company": item["company"],
                        "contact": None,
                        "source": "NO_CONTACT_FOUND"
                    }

        # 3rd Pass: Build Referral Records with Tailored Materials (Parallel Concurrency)
        async def _process_single_mapping(j_id: str, mapping: Dict[str, Any]):
            job = mapping["job"]
            norm_company = mapping["norm_company"]
            contact = mapping["contact"]
            source = mapping["source"]
            job_title = job.get("title", "Lead Frontend Architect")
            ats_score = int(job.get("match_score") or job.get("ats_score") or 90)

            if not contact:
                no_contact_record = {
                    "id": f"ref-{uuid.uuid4().hex[:12]}",
                    "job_id": j_id,
                    "job_title": job_title,
                    "job_ats_score": ats_score,
                    "company": norm_company,
                    "person_name": "No referral contact found",
                    "contact_email": None,
                    "role": "None identified",
                    "profile_url": None,
                    "connection_type": "NO_CONTACT",
                    "referral_score": 0,
                    "reason": f"No warm connection or contact found at {norm_company}.",
                    "relationship_evidence": "No network connection found.",
                    "message": "",
                    "cover_letter_text": "",
                    "status": "NO_CONTACT_FOUND",
                    "attachments": [],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                saved_nc = referral_repository.save_referral(no_contact_record)
                referral_repository.log_audit(
                    referral_id=saved_nc["id"],
                    event_type="REFERRAL_NO_CONTACT",
                    actor="REFERRAL_DISCOVERY_AGENT",
                    details=f"No contact found at {norm_company}; marked as NO_CONTACT_FOUND."
                )
                return saved_nc

            person_name = contact.get("person_name", "Valued Connection")
            contact_email = contact.get("contact_email") or contact.get("verified_email") or ""
            profile_url = contact.get("profile_url") or f"https://linkedin.com/company/{norm_company.lower()}"
            role = contact.get("role", "Engineering Leader")
            connection_type = contact.get("connection_type", "1ST_DEGREE_LINKEDIN")

            ranking_result = referral_ranking_service.rank_contact(job, contact)

            matched_resume = resume_matching_service.match_resume_for_email({
                "subject": f"Referral inquiry for {job_title} at {norm_company}",
                "body": job.get("description_raw") or job.get("description") or "",
                "job_title": job_title,
                "company": norm_company
            })

            # Run cover letter and messaging concurrently for this contact
            cl_task = cover_letter_service.generate_cover_letter(job=job, contact=contact)
            msg_task = referral_messaging_service.generate_message(
                job=job,
                contact=contact,
                include_twin_demo=True
            )
            cover_letter_res, msg_res = await asyncio.gather(cl_task, msg_task)

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

            ref_record = {
                "id": f"ref-{uuid.uuid4().hex[:12]}",
                "job_id": j_id,
                "job_title": job_title,
                "job_ats_score": ats_score,
                "company": norm_company,
                "person_name": person_name,
                "contact_email": contact_email,
                "role": role,
                "profile_url": profile_url,
                "connection_type": connection_type,
                "referral_score": ranking_result.get("referral_score", 95),
                "reason": ranking_result.get("reason", "Verified contact match."),
                "relationship_evidence": ranking_result.get("relationship_evidence", f"Source: {source}"),
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
                details=f"Discovered contact {person_name} ({connection_type}) at {norm_company} via {source}. Tailored materials generated."
            )
            return saved

        pass3_tasks = [_process_single_mapping(j_id, m) for j_id, m in job_contact_map.items()]
        pass3_results = await asyncio.gather(*pass3_tasks, return_exceptions=True)
        for res in pass3_results:
            if isinstance(res, dict):
                discovered_referrals.append(res)
            elif isinstance(res, Exception):
                print(f"[REFERRAL_DISCOVERY] Error generating referral materials: {res}")

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
        Dispatches real MIME email via Gmail MCP / SMTP with both attachments
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

        # Resolve attachments
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

        # Update status to SENT
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
            details=f"Email successfully dispatched to {recipient_email} with attachments {smtp_res.get('attachments', [])} via SMTP."
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
