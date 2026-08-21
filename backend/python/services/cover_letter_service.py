import os
import re
import json
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from backend.python.services.ai_providers import GenericLLMProvider, llm_provider
from backend.python.services.candidate_profile_service import candidate_profile_service

class CoverLetterService:
    """
    Generates personalized, high-impact tailored cover letters for qualified job opportunities.
    Strictly grounded in Sathyanantham V's verified credentials:
    - 13.5+ years experience
    - Lead Frontend Architect / Principal UI Platform Engineer
    - Micro Frontends, Module Federation, Enterprise React, Next.js, TypeScript, AI Agent Systems
    - Real measurable outcomes (scale, performance, distributed architecture)
    """

    def __init__(self, ai_provider: Optional[GenericLLMProvider] = None):
        self.ai_provider = ai_provider or llm_provider
        self.repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

    async def generate_cover_letter(
        self,
        job: Dict[str, Any],
        contact: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates a tailored cover letter using centralized LLM or deterministic fallback.
        """
        candidate_data = candidate_profile_service.get_candidate_data()
        company = job.get("company", "Target Company")
        job_title = job.get("title", "Lead Frontend Architect")
        contact_name = (contact.get("person_name") if contact else None) or "Hiring Team"

        system_prompt = (
            "You are an Elite Executive Career Strategist crafting a compelling, tailored cover letter for Sathyanantham V.\n"
            "STRICT GROUNDING RULES:\n"
            "1. Only use verified candidate facts: 13.5+ years leading enterprise web platforms, Micro Frontend architectures, Module Federation, Enterprise React & Next.js systems, and AI agent integrations.\n"
            "2. Address specifically to the target company and role.\n"
            "3. Keep the letter crisp, persuasive, and under 300 words (3-4 paragraphs).\n"
            "4. Paragraph 1: Purpose & enthusiastic interest in the role at target company.\n"
            "5. Paragraph 2: Core architectural achievements (13.5+ yrs, Micro Frontends, Module Federation, UI performance at scale).\n"
            "6. Paragraph 3: Strategic value for the target team and alignment with engineering scale.\n"
            "7. Paragraph 4: Professional closing and portfolio/AI Twin reference.\n"
            "8. Return clean markdown formatted letter starting with 'Dear [Name/Hiring Team],' and closing with 'Sincerely,\\nSathyanantham V'."
        )

        user_content = {
            "target_role": job_title,
            "target_company": company,
            "job_description_snippet": (job.get("description_raw") or job.get("description") or "")[:500],
            "hiring_contact": contact_name,
            "candidate_profile": {
                "name": candidate_data["name"],
                "title": "Lead Frontend Architect",
                "experience": candidate_data["years_experience"],
                "key_skills": candidate_data["skills"],
                "portfolio_url": candidate_data["portfolio_url"],
                "email": candidate_data["email"],
                "phone": candidate_data["phone"]
            }
        }

        try:
            full_response = ""
            async for chunk in self.ai_provider.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate tailored cover letter for: {json.dumps(user_content)}"}
                ],
                stream=False,
                temperature=0.3,
                max_tokens=800
            ):
                full_response += chunk

            clean_text = full_response.strip()
            if clean_text.startswith("```markdown"):
                clean_text = clean_text.split("```markdown")[1].split("```")[0].strip()
            elif clean_text.startswith("```"):
                clean_text = clean_text.split("```")[1].split("```")[0].strip()

            if "Sathyanantham" not in clean_text:
                clean_text += "\n\nSincerely,\n**Sathyanantham V**\nLead Frontend Architect"

            if len(clean_text) > 100:
                saved_path = self._save_cover_letter_file(company, job_title, clean_text)
                return {
                    "cover_letter_text": clean_text,
                    "file_path": saved_path,
                    "file_name": os.path.basename(saved_path),
                    "generated_by": "GEMINI_AI"
                }
        except Exception as e:
            print(f"[COVER_LETTER] LLM cover letter generation failed ({e}); falling back to deterministic template.")

        # Deterministic Grounded Fallback
        fallback_text = self._deterministic_cover_letter(job_title, company, contact_name, candidate_data)
        saved_path = self._save_cover_letter_file(company, job_title, fallback_text)
        return {
            "cover_letter_text": fallback_text,
            "file_path": saved_path,
            "file_name": os.path.basename(saved_path),
            "generated_by": "DETERMINISTIC_ENGINE"
        }

    def _deterministic_cover_letter(
        self,
        job_title: str,
        company: str,
        contact_name: str,
        candidate_data: Dict[str, Any]
    ) -> str:
        salutation = f"Dear {contact_name}," if contact_name and contact_name != "Hiring Team" else "Dear Hiring Team,"
        today_date = datetime.now(timezone.utc).strftime("%B %d, %Y")

        return (
            f"**Sathyanantham V**\n"
            f"Lead Frontend Architect & Principal UI Platform Engineer\n"
            f"{candidate_data.get('email')} | {candidate_data.get('phone')} | {candidate_data.get('portfolio_url')}\n\n"
            f"{today_date}\n\n"
            f"{salutation}\n\n"
            f"I am writing to express my strong interest in the **{job_title}** opportunity at **{company}**. "
            f"With over 13.5 years of specialized experience architecting large-scale enterprise web applications, "
            f"Micro Frontends, and high-performance React/TypeScript platforms, I am eager to contribute to {company}'s technical vision.\n\n"
            f"Throughout my career, I have spearheaded the design and delivery of mission-critical platform architectures, "
            f"implementing Module Federation, modular design systems, and robust state management that empower multi-team scalability. "
            f"My expertise spans modern web standards, Core Web Vitals optimization, and enterprise AI-augmented developer tooling.\n\n"
            f"I would welcome the opportunity to discuss how my technical leadership and hands-on architectural experience align with "
            f"the engineering goals of {company}. You can review my architecture case studies and live interactive AI Twin at {candidate_data.get('portfolio_url')}.\n\n"
            f"Thank you for your time and consideration.\n\n"
            f"Sincerely,\n"
            f"**Sathyanantham V**\n"
            f"Lead Frontend Architect"
        )

    def _save_cover_letter_file(self, company: str, job_title: str, content: str) -> str:
        """
        Saves cover letter to disk in public/downloads/cover_letters for easy attachment & preview.
        """
        clean_company = re.sub(r'[^a-zA-Z0-9]', '_', company).strip('_')
        clean_title = re.sub(r'[^a-zA-Z0-9]', '_', job_title).strip('_')
        folder = os.path.join(self.repo_root, "public", "downloads", "cover_letters")
        os.makedirs(folder, exist_ok=True)

        file_name = f"Cover_Letter_{clean_company}_{clean_title}.txt"
        file_path = os.path.join(folder, file_name)

        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            print(f"[COVER_LETTER] Warning saving cover letter file: {e}")

        return file_path

cover_letter_service = CoverLetterService()
