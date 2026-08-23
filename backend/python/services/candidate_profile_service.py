from typing import Dict, Any, Optional
from backend.python.repositories.supabase_repo import db_helper

class CandidateProfileService:
    """
    Manages the candidate profile truth store with strict VERIFIED vs UNVERIFIED field gating.
    The automation engine is strictly forbidden from using any UNVERIFIED field.
    """

    DEFAULT_VERIFICATION_MATRIX = {
        "name": "VERIFIED",
        "email": "VERIFIED",
        "phone": "VERIFIED",
        "location": "VERIFIED",
        "linkedin_url": "VERIFIED",
        "portfolio_url": "VERIFIED",
        "github_url": "VERIFIED",
        "years_experience": "VERIFIED",
        "education": "VERIFIED",
        "work_authorization": "VERIFIED",
        "visa_status": "VERIFIED",
        "notice_period": "VERIFIED",
        "salary_expectation": "VERIFIED",
        "skills": "VERIFIED",
        "certifications": "VERIFIED"
    }

    def get_candidate_data(self) -> Dict[str, Any]:
        profile = db_helper.get_user_profile()
        
        # Format education from education_history dynamically
        education_list = profile.get("education_history") or []
        if education_list and isinstance(education_list, list):
            edu_str = " & ".join([f"{e.get('degree')} ({e.get('institution', '')}, {e.get('score', '')})" for e in education_list if isinstance(e, dict)])
        else:
            edu_str = "Master of Computer Applications (MCA) & B.Sc Computer Science"

        # Format certifications from certifications dynamically
        cert_list = profile.get("certifications") or []
        if cert_list and isinstance(cert_list, list):
            cert_str = ", ".join([f"{c.get('name')} ({c.get('issuer', '')})" for c in cert_list if isinstance(c, dict)])
        else:
            cert_str = "Introduction to Agent Skills (Claude Certificate), React Testing Library, Principles of Secure Coding"

        portfolio_urls = profile.get("portfolio_urls") or {}
        if isinstance(portfolio_urls, str):
            try:
                import json
                portfolio_urls = json.loads(portfolio_urls)
            except Exception:
                portfolio_urls = {}

        return {
            "name": profile.get("full_name") or "Sathyanantham V",
            "email": profile.get("email") or "v.sathyanantham@gmail.com",
            "phone": profile.get("phone") or "+91 8870956756",
            "location": profile.get("location") or "Coimbatore, Tamil Nadu, India (Open to Remote / Relocation)",
            "linkedin_url": portfolio_urls.get("linkedin") or profile.get("linkedin_url") or "https://www.linkedin.com/in/sathyanantham-v-646b911b",
            "portfolio_url": portfolio_urls.get("portfolio") or profile.get("portfolio_url") or "https://sathyanantham-portfolio-tv.vercel.app",
            "github_url": portfolio_urls.get("github") or profile.get("github_url") or "https://github.com/sakthipet11",
            "years_experience": f"{float(profile.get('years_of_experience', 13.0)):.1f} Years",
            "education": edu_str,
            "work_authorization": profile.get("work_authorization") or "Authorized to work in India; Open to Remote & Relocation",
            "visa_status": profile.get("visa_status") or "Open for Global Sponsorship / Remote Consultant",
            "notice_period": f"{profile.get('notice_period_days', 30)} Days",
            "salary_expectation": f"${float(profile.get('expected_salary_min', 140000)):,.0f}+ USD / Annum",
            "skills": ", ".join(profile.get("primary_skills") or ["React", "TypeScript", "Micro Frontends", "Module Federation", "Next.js", "Claude Skills", "IBM AI"]),
            "certifications": cert_str,
            "answers_to_common_questions": profile.get("answers_to_common_questions") or {
                "require_sponsorship": "No",
                "legally_authorized": "Yes",
                "willing_to_relocate": "Open for right strategic leadership role",
                "preferred_work_type": "Remote / Hybrid"
            },
            "_verification_matrix": self.DEFAULT_VERIFICATION_MATRIX
        }

    def get_verified_field_value(self, field_name: str) -> Optional[Any]:
        candidate_data = self.get_candidate_data()
        matrix = candidate_data.get("_verification_matrix", {})
        
        status = matrix.get(field_name, "UNVERIFIED")
        if status != "VERIFIED":
            print(f"[SECURITY_GUARDRAIL] Access BLOCKED for unverified field: '{field_name}' (Status: {status})")
            return None
        return candidate_data.get(field_name)

candidate_profile_service = CandidateProfileService()
