from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import hashlib
from backend.python.repositories.supabase_repo import db_helper

class ReferralRepository:
    """
    Persistence layer for referrals and immutable audit events.
    Supports Supabase PostgreSQL table 'referrals' with in-memory resilient fallback.
    """

    def __init__(self):
        self.db = db_helper
        self._in_memory_referrals: Dict[str, Dict[str, Any]] = {}
        self._in_memory_events: List[Dict[str, Any]] = []
        self._seed_initial_demo_referrals()

    def _seed_initial_demo_referrals(self):
        demo_referrals = [
            {
                "id": "ref-figma-01",
                "job_id": "job-figma-lead-arch",
                "job_title": "Lead UI Platform Architect",
                "job_ats_score": 96,
                "company": "Figma",
                "person_name": "Marcus Vance",
                "role": "VP of Core Product Engineering",
                "profile_url": "https://linkedin.com/in/marcus-vance-figma",
                "connection_type": "1ST_DEGREE_LINKEDIN",
                "referral_score": 98,
                "reason": "1st-Degree LinkedIn connection. VP of Engineering overseeing UI platform organization.",
                "relationship_evidence": "Connected on LinkedIn since 2022. Endorsed for Micro Frontends and Distributed React Platforms.",
                "message": "Hi Marcus,\n\nHope all is well! I noticed Figma is actively looking for a Lead UI Platform Architect to scale your core canvas and design system infrastructure.\n\nGiven my 13+ years leading Module Federation and React performance optimizations at scale, this role aligns directly with my engineering focus.\n\nWould you be open to putting in an internal referral for me? Here is my portfolio: https://sathyanantham-portfolio-tv.vercel.app (or test my live interactive AI Twin at https://sathyanantham-portfolio-tv.vercel.app?openTwin=true).\n\nBest regards,\nSathyanantham V",
                "include_twin_demo": True,
                "status": "READY_FOR_REVIEW",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "ref-stripe-02",
                "job_id": "job-stripe-mfe-01",
                "job_title": "Principal Frontend Engineer - Micro Frontends",
                "job_ats_score": 94,
                "company": "Stripe",
                "person_name": "Elena Rostova",
                "role": "Staff Engineering Manager, Developer Infrastructure",
                "profile_url": "https://linkedin.com/in/elena-rostova-stripe",
                "connection_type": "1ST_DEGREE_LINKEDIN",
                "referral_score": 95,
                "reason": "1st-Degree LinkedIn connection. Manages Stripe's Web Developer Infrastructure & UI Architecture.",
                "relationship_evidence": "Connected on LinkedIn since 2023. Shared technical network in Modern Frontend Architecture.",
                "message": "Hi Elena,\n\nHope you're having a great week! I saw that Stripe is hiring a Principal Frontend Engineer for the Micro Frontends initiative.\n\nHaving architected enterprise Module Federation platforms handling high-throughput payments, I'd love to explore this opportunity with the team.\n\nWould you be comfortable referring me internally? You can review my architecture case studies at https://sathyanantham-portfolio-tv.vercel.app.\n\nBest,\nSathyanantham V",
                "include_twin_demo": False,
                "status": "READY_FOR_REVIEW",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "ref-linear-03",
                "job_id": "job-linear-staff-01",
                "job_title": "Staff Frontend Systems Engineer",
                "job_ats_score": 92,
                "company": "Linear",
                "person_name": "David Lindqvist",
                "role": "Principal Systems Engineer",
                "profile_url": "https://linkedin.com/in/david-lindqvist-linear",
                "connection_type": "PUBLIC_DIRECTORY",
                "referral_score": 88,
                "reason": "Public team lead on Linear sync engine & UI desktop architecture.",
                "relationship_evidence": "Public engineering contributor & open source maintainer at Linear. No prior 1st-degree connection.",
                "message": "Hi David,\n\nI came across your profile while researching the frontend systems team at Linear. I’ve been following Linear’s high-performance synchronization architecture with great interest.\n\nI'm exploring the Staff Frontend Systems opening at Linear. With 13+ years optimizing sub-50ms React render cycles and state sync pipelines, I believe I can make an immediate impact.\n\nWould you be open to submitting an internal referral or introducing me to the hiring manager? My portfolio: https://sathyanantham-portfolio-tv.vercel.app\n\nBest regards,\nSathyanantham V",
                "include_twin_demo": True,
                "status": "QUALIFIED",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        for ref in demo_referrals:
            self._in_memory_referrals[ref["id"]] = ref

    def list_referrals(self, company: Optional[str] = None, status: Optional[str] = None, min_score: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
        if self.db.client:
            try:
                query = self.db.client.table("referrals").select("*")
                if company:
                    query = query.ilike("company", f"%{company}%")
                if status and status != "ALL":
                    query = query.eq("status", status)
                if min_score:
                    query = query.gte("referral_score", min_score)
                res = query.order("referral_score", desc=True).limit(limit).execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                print(f"[REFERRAL_REPO] Error querying Supabase: {e}")

        # In-Memory fallback
        results = list(self._in_memory_referrals.values())
        if company:
            results = [r for r in results if company.lower() in (r.get("company") or "").lower()]
        if status and status != "ALL":
            results = [r for r in results if r.get("status") == status]
        if min_score:
            results = [r for r in results if (r.get("referral_score") or 0) >= min_score]

        results.sort(key=lambda x: x.get("referral_score", 0), reverse=True)
        return results[:limit]

    def get_referral_by_id(self, referral_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("referrals").select("*").eq("id", referral_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[REFERRAL_REPO] Error fetching referral {referral_id}: {e}")
        return self._in_memory_referrals.get(referral_id)

    def save_referral(self, referral_data: Dict[str, Any]) -> Dict[str, Any]:
        if "id" not in referral_data or not referral_data["id"]:
            referral_data["id"] = f"ref-{uuid.uuid4().hex[:12]}"
        
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

        self._in_memory_referrals[referral_data["id"]] = referral_data
        return referral_data

    def update_referral_status(self, referral_id: str, status: str, message: Optional[str] = None, sent_at: Optional[str] = None) -> Optional[Dict[str, Any]]:
        ref = self.get_referral_by_id(referral_id)
        if not ref:
            return None
        
        now = datetime.now(timezone.utc).isoformat()
        update_fields: Dict[str, Any] = {
            "status": status,
            "updated_at": now
        }
        if message is not None:
            update_fields["message"] = message
        if sent_at is not None:
            update_fields["sent_at"] = sent_at

        if self.db.client:
            try:
                res = self.db.client.table("referrals").update(update_fields).eq("id", referral_id).execute()
                if res.data and len(res.data) > 0:
                    ref.update(res.data[0])
                    self._in_memory_referrals[referral_id] = ref
                    return ref
            except Exception as e:
                print(f"[REFERRAL_REPO] Error updating referral status in Supabase: {e}")

        ref.update(update_fields)
        self._in_memory_referrals[referral_id] = ref
        return ref

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
        if self.db.client:
            try:
                self.db.client.table("referral_events").insert(event).execute()
            except Exception as e:
                print(f"[REFERRAL_REPO] Error logging referral event to Supabase: {e}")
        self._in_memory_events.append(event)

    def get_metrics(self) -> Dict[str, Any]:
        all_refs = list(self._in_memory_referrals.values())
        return {
            "total_qualified_jobs": len(all_refs),
            "first_degree_contacts": sum(1 for r in all_refs if r.get("connection_type") == "1ST_DEGREE_LINKEDIN"),
            "messages_drafted": sum(1 for r in all_refs if r.get("status") in ["DRAFTED", "READY_FOR_REVIEW", "APPROVED", "SENT"]),
            "ready_for_review": sum(1 for r in all_refs if r.get("status") == "READY_FOR_REVIEW"),
            "approved": sum(1 for r in all_refs if r.get("status") == "APPROVED"),
            "sent": sum(1 for r in all_refs if r.get("status") == "SENT"),
            "replied": sum(1 for r in all_refs if r.get("status") == "REPLIED")
        }

referral_repository = ReferralRepository()
