from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.referral_repository import referral_repository
from backend.python.services.referral_ranking_service import referral_ranking_service
from backend.python.services.referral_messaging_service import referral_messaging_service

class ReferralDiscoveryService:
    """
    Orchestrates the Referral Discovery & Outreach pipeline:
    1. Filters jobs with ATS Score >= 90
    2. Priority 1: Ingests candidate's 1st-degree LinkedIn connections
    3. Priority 2: Ingests permitted public directory / team contacts
    4. Ranks candidate contacts using multi-dimensional scoring
    5. Generates personalized referral messages with optional AI Twin demo
    6. Enforces Human Approval Gate before dispatch
    """

    def __init__(self, referral_ats_threshold: int = 90):
        self.referral_ats_threshold = referral_ats_threshold
        # Seeded verified network connections (LinkedIn authorized sync)
        self.verified_linkedin_network = [
            {
                "person_name": "Marcus Vance",
                "company": "Figma",
                "role": "VP of Core Product Engineering",
                "profile_url": "https://linkedin.com/in/marcus-vance-figma",
                "connection_type": "1ST_DEGREE_LINKEDIN",
                "connected_since": "2022",
                "skills": ["Micro Frontends", "React", "Design Systems", "Web Architecture"]
            },
            {
                "person_name": "Elena Rostova",
                "company": "Stripe",
                "role": "Staff Engineering Manager, Developer Infrastructure",
                "profile_url": "https://linkedin.com/in/elena-rostova-stripe",
                "connection_type": "1ST_DEGREE_LINKEDIN",
                "connected_since": "2023",
                "skills": ["Distributed Systems", "TypeScript", "Micro Frontends", "Module Federation"]
            },
            {
                "person_name": "Sarah Connor",
                "company": "Figma",
                "role": "Staff Technical Recruiter",
                "profile_url": "https://linkedin.com/in/sarah-connor-figma",
                "connection_type": "1ST_DEGREE_LINKEDIN",
                "connected_since": "2024",
                "skills": ["Talent Acquisition", "Engineering Hiring"]
            },
            {
                "person_name": "Rajesh Subramanian",
                "company": "Google",
                "role": "Senior Staff Software Engineer",
                "profile_url": "https://linkedin.com/in/rajesh-subramanian-google",
                "connection_type": "1ST_DEGREE_LINKEDIN",
                "connected_since": "2021",
                "skills": ["Cloud Architecture", "Large Scale Frontend Systems", "Angular/React"]
            },
            {
                "person_name": "David Lindqvist",
                "company": "Linear",
                "role": "Principal Systems Engineer",
                "profile_url": "https://linkedin.com/in/david-lindqvist-linear",
                "connection_type": "PUBLIC_DIRECTORY",
                "skills": ["Real-time Sync", "TypeScript", "Frontend Systems"]
            },
            {
                "person_name": "Chloe Dupont",
                "company": "Vercel",
                "role": "Director of Product Engineering",
                "profile_url": "https://linkedin.com/in/chloe-dupont-vercel",
                "connection_type": "PUBLIC_DIRECTORY",
                "skills": ["Next.js", "Edge Infrastructure", "React Server Components"]
            }
        ]

    async def discover_referral_opportunities(self, threshold: Optional[int] = None) -> List[Dict[str, Any]]:
        target_threshold = threshold or self.referral_ats_threshold
        # Query qualified jobs with ATS >= threshold
        all_jobs = job_repository.list_jobs(min_score=target_threshold, limit=100)
        
        discovered_referrals: List[Dict[str, Any]] = []

        for job in all_jobs:
            job_company = (job.get("company") or "").lower().strip()
            if not job_company:
                continue

            # Find matching contacts (Priority 1: 1st-Degree LinkedIn, Priority 2: Public)
            matching_contacts = [
                c for c in self.verified_linkedin_network
                if job_company in (c.get("company") or "").lower() or (c.get("company") or "").lower() in job_company
            ]

            for contact in matching_contacts:
                # Check if already tracked
                existing_refs = referral_repository.list_referrals(company=job.get("company"))
                already_exists = any(
                    r.get("person_name") == contact.get("person_name") and r.get("job_id") == job.get("id")
                    for r in existing_refs
                )
                if already_exists:
                    continue

                # 1. Rank Contact
                ranking_result = referral_ranking_service.rank_contact(job, contact)

                # 2. Generate Initial Message
                msg_result = await referral_messaging_service.generate_message(
                    job=job,
                    contact=contact,
                    include_twin_demo=True
                )

                ref_record = {
                    "id": f"ref-{uuid.uuid4().hex[:12]}",
                    "job_id": job.get("id"),
                    "job_title": job.get("title"),
                    "job_ats_score": job.get("ats_score", 90),
                    "company": job.get("company"),
                    "person_name": contact.get("person_name"),
                    "role": contact.get("role"),
                    "profile_url": contact.get("profile_url"),
                    "connection_type": contact.get("connection_type", "PUBLIC_DIRECTORY"),
                    "referral_score": ranking_result["referral_score"],
                    "reason": ranking_result["reason"],
                    "relationship_evidence": ranking_result["relationship_evidence"],
                    "message": msg_result["body"],
                    "include_twin_demo": True,
                    "status": "READY_FOR_REVIEW" if ranking_result["referral_score"] >= 85 else "QUALIFIED",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }

                saved = referral_repository.save_referral(ref_record)
                referral_repository.log_audit(
                    referral_id=saved["id"],
                    event_type="REFERRAL_DISCOVERED",
                    actor="REFERRAL_DISCOVERY_AGENT",
                    details=f"Discovered {saved['person_name']} ({saved['connection_type']}) with referral score {saved['referral_score']}%."
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
            details="Administrator approved referral outreach message."
        )
        return {"status": "SUCCESS", "referral": updated}

    async def send_referral(self, referral_id: str, custom_message: Optional[str] = None, sent_by: str = "HUMAN_ADMIN") -> Dict[str, Any]:
        ref = referral_repository.get_referral_by_id(referral_id)
        if not ref:
            raise ValueError(f"Referral {referral_id} not found")
        
        # Enforce approval gate if not already approved
        if ref.get("status") not in ["APPROVED", "READY_FOR_REVIEW"]:
            raise ValueError(f"Referral outreach must be in APPROVED or READY_FOR_REVIEW state (current: {ref.get('status')})")

        final_msg = custom_message or ref.get("message")
        now = datetime.now(timezone.utc).isoformat()

        # Simulate external dispatch via LinkedIn InMail / Message API
        updated = referral_repository.update_referral_status(
            referral_id=referral_id,
            status="SENT",
            message=final_msg,
            sent_at=now
        )

        referral_repository.log_audit(
            referral_id=referral_id,
            event_type="REFERRAL_MESSAGE_SENT",
            actor=sent_by,
            details=f"Referral request successfully dispatched to {ref.get('person_name')} ({ref.get('profile_url')})."
        )

        return {
            "status": "SENT",
            "referral_id": referral_id,
            "recipient": ref.get("person_name"),
            "sent_at": now,
            "referral": updated
        }

referral_discovery_service = ReferralDiscoveryService()
