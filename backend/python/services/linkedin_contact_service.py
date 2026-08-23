import os
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from backend.python.repositories.connection_repository import connection_repository
from backend.python.services.company_normalization_service import company_normalization_service
from backend.python.services.website_contacts_enrichment_service import website_contacts_enrichment_service

class LinkedInContactService:
    """
    Manages verified LinkedIn network connections and directory contacts with strict
    hierarchical matching directly against the connection_repository:
    1. 1st-Degree LinkedIn connection over 2nd-Degree and Public directory
    2. Function relevance: Engineering > Hiring/Recruiting > Product > Other
    3. Seniority tier & recency as tiebreaker
    4. Comprehensive contact enrichment (Email, LinkedIn profile URL, Title/Role)
    """

    def __init__(self):
        self.conn_repo = connection_repository

    def list_all_connections(self) -> List[Dict[str, Any]]:
        return self.conn_repo.list_connections(limit=2000)

    def find_matching_contacts_for_company(self, target_company: str) -> List[Dict[str, Any]]:
        """
        Finds all network contacts associated with a given company using the connection repository.
        """
        if not target_company:
            return []

        # Auto-ingest default CSV if DB is empty
        all_existing = self.conn_repo.list_connections(limit=5)
        if not all_existing:
            try:
                self.conn_repo.ingest_default_csv()
            except Exception as e:
                print(f"[LINKEDIN_CONTACT] Auto-ingest notice: {e}")

        raw_conns = self.conn_repo.find_connections_by_company(target_company)
        contacts = []
        for c in raw_conns:
            name = c.get("full_name") or f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
            role = c.get("position") or "Connection"
            degree = c.get("connection_degree") or "1st"
            
            contacts.append({
                "id": c.get("id"),
                "person_name": name,
                "company": c.get("company", target_company),
                "role": role,
                "department": "Recruiting" if "recruiter" in role.lower() or "talent" in role.lower() or "hr" in role.lower() else "Engineering",
                "seniority": "Director" if "director" in role.lower() else ("VP" if "vp" in role.lower() else ("Lead" if "lead" in role.lower() else "Staff")),
                "profile_url": c.get("linkedin_url") or f"https://linkedin.com/company/{target_company.lower()}",
                "connection_type": "1ST_DEGREE_LINKEDIN" if degree == "1st" else ("RECRUITER" if degree == "Recruiter" else degree),
                "connected_since": c.get("connected_on") or "2024",
                "verified_email": c.get("email"),
                "skills": ["Web Architecture", "Frontend Systems"]
            })

        return contacts

    def rank_and_prioritize_contacts(
        self,
        contacts: List[Dict[str, Any]],
        target_role: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Prioritizes contacts based on hierarchy:
        1. 1st-degree over 2nd/3rd-degree / public
        2. Relevant functions (Engineering > Hiring/Recruiting > Product > Other)
        3. Seniority tier tiebreaker (VP > Director > Principal/Senior Staff > Staff > Manager > Senior)
        """
        def _get_sort_score(c: Dict[str, Any]) -> Tuple[int, int, int]:
            # Degree score
            degree_score = 3 if c.get("connection_type") == "1ST_DEGREE_LINKEDIN" else (2 if c.get("connection_type") == "2ND_DEGREE" else 1)

            # Department / Function score
            dept = (c.get("department") or "").lower()
            role = (c.get("role") or "").lower()
            if any(k in role or k in dept for k in ["engineer", "architect", "platform", "ui", "systems", "frontend", "developer"]):
                func_score = 4
            elif any(k in role or k in dept for k in ["recruiter", "talent", "hiring", "sourcer", "people"]):
                func_score = 3
            elif any(k in role or k in dept for k in ["product", "design", "program"]):
                func_score = 2
            else:
                func_score = 1

            # Seniority score
            sen = (c.get("seniority") or role).lower()
            if any(k in sen for k in ["vp", "vice president", "head", "cto", "fellow"]):
                sen_score = 6
            elif any(k in sen for k in ["director", "partner"]):
                sen_score = 5
            elif any(k in sen for k in ["principal", "senior staff", "distinguished"]):
                sen_score = 4
            elif any(k in sen for k in ["staff", "lead", "manager"]):
                sen_score = 3
            elif any(k in sen for k in ["senior", "sr"]):
                sen_score = 2
            else:
                sen_score = 1

            return (degree_score, func_score, sen_score)

        return sorted(contacts, key=_get_sort_score, reverse=True)

    async def find_and_enrich_best_contact(
        self,
        company_name: str,
        target_role: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Identifies and enriches the best single contact for a given target company.
        If no contacts exist in verified network, returns None (allowing pipeline to invoke Apify).
        """
        matches = self.find_matching_contacts_for_company(company_name)
        if not matches:
            return None

        ranked = self.rank_and_prioritize_contacts(matches, target_role)
        best = ranked[0]

        # Enrich contact email if missing
        if not best.get("verified_email"):
            domain = company_normalization_service.resolve_company_domain(company_name)
            enriched_email = await website_contacts_enrichment_service.resolve_best_contact_email(
                person_name=best["person_name"],
                company_domain=domain,
                existing_email=best.get("verified_email")
            )
            best["contact_email"] = enriched_email
            best["company_domain"] = domain
        else:
            best["contact_email"] = best["verified_email"]

        return best

linkedin_contact_service = LinkedInContactService()
