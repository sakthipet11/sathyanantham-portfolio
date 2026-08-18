from typing import Dict, Any, Optional
import json
from backend.python.services.ai_providers import OpenRouterAIProvider

class ReferralMessagingService:
    """
    Generates personalized, high-converting, non-pushy referral outreach messages.
    Strictly follows:
    - Zero Relationship Fabrication
    - Warm tone for 1st-degree LinkedIn connections
    - Respectful introductory tone for cold outreach
    - Candidate verified credentials (13.5+ yrs, Micro Frontends, Module Federation)
    - Portfolio link and optional AI Twin interactive chatbot link
    """

    def __init__(self):
        self.ai_provider = OpenRouterAIProvider()

    async def generate_message(
        self,
        job: Dict[str, Any],
        contact: Dict[str, Any],
        candidate_profile: Optional[Dict[str, Any]] = None,
        include_twin_demo: bool = True
    ) -> Dict[str, Any]:
        """
        Generates personalized referral outreach message using LLM or deterministic template.
        """
        person_name = contact.get("person_name", "there")
        company = job.get("company") or contact.get("company", "the company")
        job_title = job.get("title") or "Engineering Role"
        connection_type = contact.get("connection_type") or "PUBLIC_DIRECTORY"

        portfolio_url = "https://sathyanantham.dev"
        twin_url = "https://sathyanantham.dev?openTwin=true"

        first_name = person_name.split()[0] if person_name else "there"

        # System prompt for Gemini
        system_prompt = (
            "You are a Senior Networking & Referral Strategist. Draft a concise, highly professional referral request message.\n"
            "CRITICAL RULES:\n"
            "1. NEVER fabricate or claim a prior relationship if none exists.\n"
            "2. If connection_type is '1ST_DEGREE_LINKEDIN', use a warm professional opening (e.g., 'Hope all is well with you!').\n"
            "3. If connection_type is NOT 1st degree, use a polite exploratory opening (e.g., 'I came across your profile while researching the engineering team at...').\n"
            "4. Keep it under 150 words.\n"
            "5. Highlight the candidate's verified background: Sathyanantham V, Lead Frontend Architect with 13.5+ years of experience leading Micro Frontends, Module Federation, and Enterprise React platforms.\n"
            "6. Provide the portfolio link and politely ask if they'd be open to submitting an internal referral or connecting with the hiring manager.\n"
            "7. Return JSON with 'subject' and 'body'."
        )

        user_content = {
            "target_job": {
                "title": job_title,
                "company": company,
                "ats_score": job.get("ats_score", 92)
            },
            "contact": {
                "name": person_name,
                "role": contact.get("role"),
                "connection_type": connection_type,
                "relationship_evidence": contact.get("relationship_evidence")
            },
            "include_twin_demo": include_twin_demo
        }

        try:
            raw_response = await self.ai_provider.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate referral message for: {json.dumps(user_content)}"}
                ],
                temperature=0.3,
                max_tokens=600
            )

            clean_json = raw_response.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()

            parsed = json.loads(clean_json)
            if "body" in parsed and len(parsed["body"]) > 20:
                return {
                    "subject": parsed.get("subject", f"Quick question regarding {job_title} at {company}"),
                    "body": parsed["body"],
                    "include_twin_demo": include_twin_demo,
                    "generated_by": "GEMINI_AI"
                }
        except Exception as e:
            print(f"[REFERRAL_MSG] LLM generation failed, falling back to deterministic template: {e}")

        # Deterministic Grounded Fallback Template
        return self.deterministic_generate(job, contact, include_twin_demo)

    def deterministic_generate(
        self,
        job: Dict[str, Any],
        contact: Dict[str, Any],
        include_twin_demo: bool = True
    ) -> Dict[str, Any]:
        person_name = contact.get("person_name", "there")
        first_name = person_name.split()[0] if person_name else "there"
        company = job.get("company") or contact.get("company", "the company")
        job_title = job.get("title") or "Engineering Role"
        connection_type = contact.get("connection_type") or "PUBLIC_DIRECTORY"

        portfolio_url = "https://sathyanantham.dev"
        twin_url = "https://sathyanantham.dev?openTwin=true"

        if connection_type == "1ST_DEGREE_LINKEDIN":
            greeting = f"Hi {first_name},\n\nHope you're having a great week!"
            context = f"I noticed that {company} is currently expanding and hiring for a {job_title}."
        else:
            greeting = f"Hi {first_name},\n\nI came across your profile while researching the platform engineering team at {company}."
            context = f"I'm exploring the {job_title} opening at {company}."

        credentials = (
            f"With 13.5+ years of experience leading Micro Frontend architecture, Module Federation, and Enterprise React systems, "
            f"I believe my technical background directly aligns with your team's scale and engineering challenges."
        )

        twin_text = f" (or try my live interactive AI Twin at {twin_url})" if include_twin_demo else ""

        ask = (
            f"Would you be open to putting in an internal referral for me, or sharing the best way to get in touch with the hiring team?\n\n"
            f"You can explore my architecture portfolio and case studies at {portfolio_url}{twin_text}."
        )

        closing = f"Thanks so much for your time and consideration!\n\nBest regards,\nSathyanantham V\nLead Frontend Architect"

        body = f"{greeting}\n\n{context}\n\n{credentials}\n\n{ask}\n\n{closing}"
        subject = f"Referral inquiry — {job_title} at {company}"

        return {
            "subject": subject,
            "body": body,
            "include_twin_demo": include_twin_demo,
            "generated_by": "DETERMINISTIC_ENGINE"
        }

referral_messaging_service = ReferralMessagingService()
