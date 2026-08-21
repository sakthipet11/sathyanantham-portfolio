import re
import json
from typing import Dict, Any, List, Optional
from backend.python.services.ai_providers import GenericLLMProvider, llm_provider
from backend.python.services.resume_matching_service import resume_matching_service

class EmailClassificationService:
    """
    AI-powered Email Classifier for inbound recruiter correspondence.
    Performs multi-class intent categorization, entity extraction,
    safety risk evaluation, and grounded contextual draft generation.
    """

    CLASSIFICATION_CATEGORIES = [
        "INTERVIEW_REQUEST",
        "RESUME_REQUEST",
        "JOB_OFFER",
        "SALARY_NEGOTIATION",
        "TECHNICAL_ASSESSMENT",
        "FOLLOW_UP",
        "REJECTION",
        "APPLICATION_CONFIRMATION",
        "RECRUITER_CONTACT",
        "GENERAL_INQUIRY",
        "OTHER"
    ]

    RISK_PATTERNS = [
        (r"salary|compensation|expected.*rate|hourly|package|base|bonus|ctc|current.*ctc|expected.*ctc", "Compensation / Salary negotiation detected"),
        (r"visa|sponsorship|work.*auth|green.*card|h1-?b|citizenship|opt|cpt", "Work authorization / Visa sponsorship inquiry detected"),
        (r"ssn|social.*security|passport|bank|routing|tax|w-?2|w-?9|direct.*deposit", "Sensitive PII or financial document request detected"),
        (r"cryptocurrency|telegram|whatsapp|wire.*transfer|gift.*card", "Suspicious or unverified communication channel detected"),
        (r"offer letter|formal offer|sign.*contract|joining date|deadline.*accept", "Formal offer decision requiring human review")
    ]

    def __init__(self, ai_provider: Optional[GenericLLMProvider] = None):
        self.ai_provider = ai_provider or llm_provider

    def evaluate_risk(self, subject: str, body: str) -> List[str]:
        text = f"{subject} {body}".lower()
        reasons = []
        for pattern, reason in self.RISK_PATTERNS:
            if re.search(pattern, text):
                reasons.append(reason)
        return reasons

    def extract_entities(self, text: str, subject: str, sender: str) -> Dict[str, Any]:
        """
        Deterministic NLP extractor for company, role, recruiter name, and proposed dates.
        """
        combined = f"{subject} {text}"
        
        # 1. Company extraction
        company = None
        comp_match = re.search(r"(?:at|with|for|from|join(?:ing)?)\s+([A-Z][A-Za-z0-9&.\s]{2,25}(?:Inc|LLC|Corp|Technologies|Labs|Systems|Networks|Software)?)", combined)
        if comp_match:
            candidate_comp = comp_match.group(1).strip()
            if candidate_comp.lower() not in ["sathya", "sathyanantham", "our", "the", "this", "your", "an", "a"]:
                company = candidate_comp
        if not company and "@" in sender:
            domain = sender.split("@")[-1].split(".")[0]
            if domain not in ["gmail", "yahoo", "hotmail", "outlook", "icloud", "protonmail"]:
                company = domain.capitalize()

        # 2. Role extraction
        job_title = "Lead Frontend Architect"
        title_patterns = [
            r"(?:lead|principal|senior|staff)?\s*(?:frontend|ui|software|fullstack|web|react|ai)\s*(?:architect|engineer|developer|lead)",
            r"engineering manager|tech lead|director of engineering"
        ]
        for pat in title_patterns:
            m = re.search(pat, combined, re.IGNORECASE)
            if m:
                job_title = m.group(0).title()
                break

        # 3. Recruiter Name extraction
        recruiter_name = None
        name_match = re.search(r"(?:best|regards|thanks|cheers|sincerely),?\s*\n+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", text)
        if name_match:
            recruiter_name = name_match.group(1).strip()

        # 4. Dates & Slots mentioned
        dates_slots = []
        date_matches = re.findall(r"(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\b\d{1,2}:\d{2}\s*(?:am|pm)?\s*(?:est|pst|cst|ist|utc)?)", combined, re.IGNORECASE)
        if date_matches:
            dates_slots = list(set([d.strip() for d in date_matches[:4]]))

        return {
            "company": company or "Enterprise Hiring Team",
            "job_title": job_title,
            "recruiter_name": recruiter_name,
            "dates_slots": dates_slots
        }

    def deterministic_classify(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        High-precision deterministic rule-based classifier and entity extractor.
        """
        subject = str(email_data.get("subject", ""))
        body = str(email_data.get("body") or email_data.get("body_raw") or email_data.get("body_text") or "")
        sender = str(email_data.get("sender", ""))
        sender_name = email_data.get("sender_name")
        company = email_data.get("company")
        
        entities = self.extract_entities(body, subject, sender)
        if not company:
            company = entities["company"]
        if not sender_name:
            sender_name = entities["recruiter_name"] or "Recruitment Team"
        job_title = email_data.get("job_title") or entities["job_title"]

        combined = f"{subject} {body}".lower()

        classification = "GENERAL_INQUIRY"
        confidence = 0.88
        recommended_action = "Review incoming recruiter message"
        requires_review = True

        # Intent Detection Rules
        if any(k in combined for k in ["offer letter", "formal offer", "pleased to offer you", "extend an offer", "job offer"]):
            classification = "JOB_OFFER"
            confidence = 0.98
            recommended_action = "Review formal offer compensation and terms with candidate"
            requires_review = True

        elif any(k in combined for k in ["interview", "schedule a call", "schedule an interview", "phone screen", "chat with the hiring manager", "zoom link", "google meet", "introductory call", "technical discussion", "round 1", "round 2"]):
            classification = "INTERVIEW_REQUEST"
            confidence = 0.95
            recommended_action = "Confirm candidate availability and accept interview invitation"
            requires_review = True

        elif ("resume" in combined or "cv" in combined) and any(k in combined for k in ["send", "share", "updated", "request", "attach", "copy", "forward", "latest"]):
            classification = "RESUME_REQUEST"
            confidence = 0.96
            recommended_action = "Attach tailored Lead Architect resume and reply"
            requires_review = False  # Can be auto-replied if policy permits, but defaults to staging

        elif any(k in combined for k in ["salary expectations", "current ctc", "expected ctc", "compensation budget", "hourly rate", "rate check", "base pay"]):
            classification = "SALARY_NEGOTIATION"
            confidence = 0.94
            recommended_action = "Review salary and compensation requirements before replying"
            requires_review = True

        elif any(k in combined for k in ["coding challenge", "take-home", "hackerrank", "codesignal", "technical assessment", "online assessment"]):
            classification = "TECHNICAL_ASSESSMENT"
            confidence = 0.93
            recommended_action = "Review technical assessment specifications and timeline"
            requires_review = True

        elif any(k in combined for k in ["unfortunately", "not moving forward", "other candidates", "impressed with your background, but", "position has been filled"]):
            classification = "REJECTION"
            confidence = 0.96
            recommended_action = "Acknowledge gracefully and archive application"
            requires_review = False

        elif any(k in combined for k in ["thank you for applying", "application received", "we have received your application", "submission confirmation"]):
            classification = "APPLICATION_CONFIRMATION"
            confidence = 0.99
            recommended_action = "Log confirmation reference"
            requires_review = False

        elif any(k in combined for k in ["following up", "status update", "any update", "checking in on"]):
            classification = "FOLLOW_UP"
            confidence = 0.91
            recommended_action = "Review ongoing discussion thread"
            requires_review = True

        elif any(k in combined for k in ["came across your profile", "found your github", "saw your linkedin", "exciting opportunity", "reach out", "connecting"]):
            classification = "RECRUITER_CONTACT"
            confidence = 0.90
            recommended_action = "Express interest and request detailed role specifications"
            requires_review = True

        # Safety & Risk Evaluation
        risks = self.evaluate_risk(subject, body)
        if risks:
            requires_review = True

        # Dynamic Resume Selection
        matched_resume = resume_matching_service.match_resume_for_email({
            "subject": subject,
            "body": body,
            "job_title": job_title,
            "company": company
        })

        # Draft generation tailored for Sathyanantham V
        draft_subject = f"Re: {subject}" if not subject.lower().startswith("re:") else subject
        
        if classification == "RESUME_REQUEST":
            draft_body = (
                f"Hi {sender_name},\n\n"
                f"Thank you for reaching out regarding the {job_title} opportunity at {company}.\n\n"
                f"I have attached my tailored resume ({matched_resume['file_name']}) showcasing my 13.5+ years of enterprise experience leading Micro Frontend transformations, Module Federation, and scalable React platforms.\n\n"
                f"You can also explore my live interactive portfolio and case studies here: https://sathyanantham-portfolio-tv.vercel.app\n\n"
                f"I look forward to discussing how my background aligns with your engineering roadmap.\n\n"
                f"Best regards,\nSathyanantham V\nLead Frontend Architect\n+91 8870956756 | v.sathyanantham@gmail.com"
            )
        elif classification == "INTERVIEW_REQUEST":
            draft_body = (
                f"Hi {sender_name},\n\n"
                f"Thank you for the interview invitation for the {job_title} role at {company}. I would be delighted to speak with the team.\n\n"
                f"I am available for a discussion during the following windows:\n"
                f"• Tuesday: 10:00 AM – 1:00 PM EST / 7:30 PM – 10:30 PM IST\n"
                f"• Thursday: 2:00 PM – 5:00 PM EST / 11:30 PM – 2:30 AM IST\n"
                f"• Friday: 10:00 AM – 1:00 PM EST / 7:30 PM – 10:30 PM IST\n\n"
                f"Please feel free to send a calendar invite for whichever slot works best on your end.\n\n"
                f"Best regards,\nSathyanantham V\nLead Frontend Architect\n+91 8870956756 | v.sathyanantham@gmail.com"
            )
        elif classification == "JOB_OFFER":
            draft_body = (
                f"Hi {sender_name},\n\n"
                f"Thank you very much for extending the offer for the {job_title} role at {company}. I am excited about the prospect of joining the team and contributing to your engineering vision.\n\n"
                f"I am currently reviewing the details of the offer and will follow up shortly with any specific points of discussion.\n\n"
                f"Best regards,\nSathyanantham V\nLead Frontend Architect"
            )
        elif classification == "REJECTION":
            draft_body = (
                f"Hi {sender_name},\n\n"
                f"Thank you for following up and letting me know. I appreciate the team's consideration for the {job_title} role at {company}.\n\n"
                f"I would welcome the opportunity to stay in touch for future principal/lead architecture opportunities.\n\n"
                f"Best regards,\nSathyanantham V"
            )
        else:
            draft_body = (
                f"Hi {sender_name},\n\n"
                f"Thank you for connecting regarding the {job_title} opportunity at {company}. I would be interested in learning more about the engineering scope, team topology, and technical goals.\n\n"
                f"Best regards,\nSathyanantham V\nLead Frontend Architect\nhttps://sathyanantham-portfolio-tv.vercel.app"
            )

        return {
            "classification": classification,
            "confidence": confidence,
            "company": company,
            "job_title": job_title,
            "sender": sender,
            "sender_name": sender_name,
            "recommended_action": recommended_action,
            "requires_human_review": requires_review,
            "risk_reasons": risks,
            "extracted_entities": entities,
            "draft_reply_subject": draft_subject,
            "draft_reply_body": draft_body,
            "suggested_resume_version_id": matched_resume["resume_id"],
            "suggested_resume_file_name": matched_resume["file_name"],
            "suggested_resume_download_url": matched_resume["download_url"],
            "suggested_resume_file_path": matched_resume["file_path"]
        }

    async def classify_and_draft(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classifies incoming email using LLM with deterministic safety fallback.
        """
        baseline = self.deterministic_classify(email_data)

        system_prompt = """You are an Enterprise Executive AI Assistant managing inbound recruiter correspondence for Sathyanantham V (Lead Frontend Architect with 13.5+ years experience).
Classify the recruiter email and extract structured entities and draft a high-context reply.

Valid Classifications:
INTERVIEW_REQUEST, RESUME_REQUEST, JOB_OFFER, SALARY_NEGOTIATION, TECHNICAL_ASSESSMENT, FOLLOW_UP, REJECTION, APPLICATION_CONFIRMATION, RECRUITER_CONTACT, GENERAL_INQUIRY, OTHER.

Safety Rules:
- If salary, compensation, visa sponsorship, legal contracts, or job offer is detected, set requires_human_review = true.
- Output MUST be strictly valid JSON.

JSON Schema:
{
  "classification": "<CATEGORY>",
  "confidence": <0.0-1.0>,
  "company": "<Extracted Company>",
  "job_title": "<Extracted Role>",
  "sender_name": "<Recruiter Name>",
  "recommended_action": "<Action summary>",
  "requires_human_review": <true/false>,
  "risk_reasons": ["<reason>"],
  "draft_reply_subject": "Re: ...",
  "draft_reply_body": "..."
}"""

        user_prompt = f"""Sender: {email_data.get('sender')}
Subject: {email_data.get('subject')}
Body:
{str(email_data.get('body') or email_data.get('body_text') or email_data.get('body_raw') or '')[:2000]}"""

        try:
            full_response = ""
            async for chunk in self.ai_provider.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                stream=False,
                timeout=3.0
            ):
                full_response += chunk

            json_match = re.search(r'\{[\s\S]*\}', full_response)
            if json_match:
                parsed = json.loads(json_match.group(0))
                additional_risks = self.evaluate_risk(str(email_data.get('subject', '')), str(email_data.get('body', '')))
                merged_risks = list(set(parsed.get("risk_reasons", []) + additional_risks))
                parsed["risk_reasons"] = merged_risks
                if merged_risks:
                    parsed["requires_human_review"] = True

                # Preserve matched resume
                parsed["suggested_resume_version_id"] = baseline["suggested_resume_version_id"]
                parsed["suggested_resume_file_name"] = baseline["suggested_resume_file_name"]
                parsed["suggested_resume_download_url"] = baseline["suggested_resume_download_url"]
                parsed["suggested_resume_file_path"] = baseline["suggested_resume_file_path"]
                parsed["extracted_entities"] = baseline["extracted_entities"]

                return parsed
        except Exception as e:
            # Clean fallback
            pass

        return baseline

email_classification_service = EmailClassificationService()
