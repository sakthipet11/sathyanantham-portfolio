import os
import re
from typing import Dict, Any, List, Optional
from backend.python.repositories.resume_repository import resume_repository

class ResumeMatchingService:
    """
    Intelligent Resume Matcher that analyzes recruiter correspondence
    and selects the best tailored candidate resume PDF.
    """

    def __init__(self):
        self.repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

    def match_resume_for_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates subject, body, extracted job title, and company
        to select the best tailored PDF resume.
        """
        subject = str(email_data.get("subject", "")).lower()
        body = str(email_data.get("body") or email_data.get("body_raw") or email_data.get("body_text") or "").lower()
        job_title = str(email_data.get("job_title", "")).lower()
        combined_text = f"{subject} {body} {job_title}"

        # Fetch available resumes
        all_resumes = resume_repository.list_resumes()

        # Scoring heuristics
        best_resume = None
        best_score = 0
        match_reason = "Default authoritative Lead Architect profile"

        for res in all_resumes:
            score = 0
            res_role = str(res.get("role", "")).lower()
            res_name = str(res.get("name", "")).lower()

            # Rule 1: AI / Python / FullStack
            if any(k in combined_text for k in ["python", "genai", "llm", "ai agent", "fastapi", "full stack", "fullstack", "ai engineer", "rag", "langchain"]):
                if "ai" in res_name or "ai" in res_role:
                    score += 10
                    match_reason = "Matched AI FullStack / Python / GenAI requirements"

            # Rule 2: Micro Frontends / Module Federation
            elif any(k in combined_text for k in ["micro frontend", "micro-frontend", "microfrontend", "module federation", "monorepo", "webpack"]):
                if "microfrontend" in res_name or "mfe" in res_name or "micro" in res_role:
                    score += 10
                    match_reason = "Matched Micro Frontend Architecture & Module Federation specialization"

            # Rule 3: Frontend Architect / React / Next.js / Lead UI
            elif any(k in combined_text for k in ["frontend", "architect", "lead ui", "react", "next.js", "ui lead", "web architect"]):
                if "frontend_architect" in res_name or "architect" in res_role:
                    score += 8
                    match_reason = "Matched Lead Frontend Architect / React & Next.js background"

            # Fallback score based on standard keywords
            for kw in res.get("target_keywords", []):
                if kw.lower() in combined_text:
                    score += 2

            if score > best_score:
                best_score = score
                best_resume = res

        if not best_resume:
            # Default to Frontend Architect 2026
            for r in all_resumes:
                if "frontend_architect" in r.get("name", "").lower() or "architect" in r.get("role", "").lower():
                    best_resume = r
                    break
            if not best_resume and len(all_resumes) > 0:
                best_resume = all_resumes[0]

        # Verify physical file existence
        file_name = best_resume.get("name", "Sathyanantham_V_Frontend_Architect_2026.pdf") if best_resume else "Sathyanantham_V_Resume.pdf"
        file_path = os.path.join(self.repo_root, "public", "downloads", file_name)
        if not os.path.exists(file_path):
            file_path = os.path.join(self.repo_root, "public", "resume.pdf")

        return {
            "resume_id": best_resume.get("id") if best_resume else "resume-frontend-architect",
            "file_name": file_name,
            "role": best_resume.get("role", "Lead Frontend Architect") if best_resume else "Lead Frontend Architect",
            "download_url": best_resume.get("download_url", f"/downloads/{file_name}") if best_resume else f"/downloads/{file_name}",
            "file_path": file_path,
            "match_reason": match_reason,
            "confidence": 0.96 if best_score > 0 else 0.85
        }

    def match_resume_for_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates job title, company, requirements, and description
        to select the best tailored candidate resume PDF.
        """
        job_title = str(job_data.get("title", ""))
        desc = str(job_data.get("description_raw") or job_data.get("requirements_clean") or "")
        return self.match_resume_for_email({
            "subject": job_title,
            "body": desc,
            "job_title": job_title
        })

resume_matching_service = ResumeMatchingService()

