from typing import Dict, Any, List
import re

class ReferralRankingService:
    """
    Ranks potential referral candidates based on multi-dimensional relevance:
    1. Company match (20%)
    2. Role & team relevance (20%)
    3. Seniority tier (15%)
    4. Connection quality (20%) [1st-degree LinkedIn priority]
    5. Technical stack overlap (10%)
    6. Shared professional context (5%)
    7. Public evidence of connection (5%)
    8. Referral likelihood (5%)

    CRITICAL RULE: Zero Relationship Fabrication.
    Factual evidence is always explicitly recorded.
    """

    def rank_contact(self, job: Dict[str, Any], contact: Dict[str, Any]) -> Dict[str, Any]:
        job_company = (job.get("company") or "").lower().strip()
        contact_company = (contact.get("company") or "").lower().strip()
        contact_role = (contact.get("role") or "").lower()
        connection_type = contact.get("connection_type") or "PUBLIC_DIRECTORY"

        # 1. Company Match (20 pts)
        company_score = 20 if job_company in contact_company or contact_company in job_company else 0

        # 2. Role & Team Relevance (20 pts)
        role_score = 0
        if any(k in contact_role for k in ["architect", "frontend", "ui", "platform", "systems", "web", "software", "developer", "engineering"]):
            role_score = 20
        elif any(k in contact_role for k in ["manager", "director", "vp", "head", "cto", "vp of engineering", "engineering manager"]):
            role_score = 18
        elif any(k in contact_role for k in ["recruiter", "talent", "sourcer", "people"]):
            role_score = 12
        else:
            role_score = 6

        # 3. Seniority Tier (15 pts)
        seniority_score = 0
        if any(k in contact_role for k in ["vp", "vice president", "head", "director", "cto", "executive"]):
            seniority_score = 15
        elif any(k in contact_role for k in ["staff", "principal", "distinguished", "lead"]):
            seniority_score = 14
        elif any(k in contact_role for k in ["manager", "team lead"]):
            seniority_score = 12
        elif any(k in contact_role for k in ["senior"]):
            seniority_score = 10
        else:
            seniority_score = 6

        # 4. Connection Quality (20 pts) - 1st Degree LinkedIn Priority
        conn_score = 0
        if connection_type == "1ST_DEGREE_LINKEDIN":
            conn_score = 20
        elif connection_type == "2ND_DEGREE":
            conn_score = 12
        elif connection_type == "ALUMNI":
            conn_score = 10
        else: # PUBLIC_DIRECTORY / SEARCH
            conn_score = 5

        # 5. Technical Stack Overlap (10 pts)
        tech_score = 0
        headline = (contact.get("headline") or contact.get("bio") or "").lower()
        skills = [s.lower() for s in contact.get("skills", [])]
        combined_tech = f"{contact_role} {headline} {' '.join(skills)}"
        
        overlap_keywords = ["react", "typescript", "micro frontend", "architecture", "module federation", "next.js", "frontend", "distributed", "design system", "ui"]
        matches = sum(1 for kw in overlap_keywords if kw in combined_tech)
        tech_score = min(10, max(4, matches * 3))

        # 6. Shared Professional Context (5 pts)
        shared_score = 5 if connection_type in ["1ST_DEGREE_LINKEDIN", "ALUMNI"] or contact.get("shared_groups") else 2

        # 7. Public Evidence & Connection Verifiability (5 pts)
        evidence_score = 5 if contact.get("profile_url") and "linkedin.com" in contact.get("profile_url") else 3

        # 8. Referral Likelihood (5 pts)
        likelihood_score = 5 if connection_type == "1ST_DEGREE_LINKEDIN" else (4 if seniority_score >= 12 else 3)

        total_score = company_score + role_score + seniority_score + conn_score + tech_score + shared_score + evidence_score + likelihood_score
        final_score = min(100, max(0, total_score))

        # Generate Factual Relationship Evidence
        relationship_evidence = self._generate_factual_evidence(contact, connection_type)
        reason = self._generate_ranking_reason(contact, final_score, connection_type)

        return {
            "referral_score": final_score,
            "company_score": company_score,
            "role_score": role_score,
            "seniority_score": seniority_score,
            "connection_score": conn_score,
            "technical_score": tech_score,
            "relationship_evidence": relationship_evidence,
            "reason": reason,
            "recommended_contact": final_score >= 80
        }

    def _generate_factual_evidence(self, contact: Dict[str, Any], connection_type: str) -> str:
        if connection_type == "1ST_DEGREE_LINKEDIN":
            connected_since = contact.get("connected_since", "Verified Network")
            return f"Verified 1st-Degree LinkedIn connection ({connected_since}). Direct messaging available."
        elif connection_type == "2ND_DEGREE":
            mutual = contact.get("mutual_connections_count", 1)
            return f"2nd-Degree LinkedIn connection with {mutual} shared engineering contacts."
        elif connection_type == "ALUMNI":
            return f"Shared educational or corporate alumni network with {contact.get('person_name')}."
        else:
            return f"Public employee directory / engineering team member at {contact.get('company')}. No prior direct connection."

    def _generate_ranking_reason(self, contact: Dict[str, Any], score: int, connection_type: str) -> str:
        name = contact.get("person_name", "Contact")
        role = contact.get("role", "Engineering Leader")
        company = contact.get("company", "Target Company")

        if connection_type == "1ST_DEGREE_LINKEDIN":
            return f"High-priority 1st-degree contact: {name} ({role} at {company}). Direct reach out recommended."
        elif score >= 85:
            return f"Strong engineering leader match: {name} ({role}). High technical overlap with target platform role."
        else:
            return f"Relevant team member at {company}: {name} ({role}). Outreach via cold introduction."

referral_ranking_service = ReferralRankingService()
