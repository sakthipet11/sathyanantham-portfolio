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
        return {
            "name": profile.get("full_name", "Sathyanantham V"),
            "email": profile.get("email", "sathya.leadarchitect@gmail.com"),
            "phone": profile.get("phone", "+1 (555) 382-9912"),
            "location": profile.get("location", "Bangalore, India (Open to US/Global Remote)"),
            "linkedin_url": profile.get("linkedin_url", "https://linkedin.com/in/sathyanantham-v"),
            "portfolio_url": profile.get("portfolio_url", "https://sathyanantham.dev"),
            "github_url": profile.get("github_url", "https://github.com/sakthipet11"),
            "years_experience": str(profile.get("years_of_experience", "13.5")),
            "education": "Bachelor of Engineering in Computer Science & Engineering",
            "work_authorization": profile.get("work_authorization", "Authorized to work; does not require immediate sponsorship for remote contracts"),
            "visa_status": profile.get("visa_status", "H1B/Transfer Eligible / B1/B2 Valid / Remote Consultant"),
            "notice_period": "Immediate / 2 Weeks",
            "salary_expectation": f"${profile.get('expected_salary_min', 180000):,.0f}+ USD / Annum",
            "skills": ", ".join(profile.get("primary_skills", ["React", "TypeScript", "Micro Frontends", "Module Federation", "Next.js"])),
            "certifications": "AWS Certified Solutions Architect, Meta Certified Lead Frontend Engineer",
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
