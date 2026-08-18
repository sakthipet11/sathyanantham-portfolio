import re
import json
from typing import Dict, Any, List, Optional
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.ai_providers import GenericLLMProvider, llm_provider

class EmailClassificationService:
    """
    AI-powered Email Classifier for inbound recruiter correspondence.
    Enforces risk guardrails and drafts grounded contextual replies.
    """

    CLASSIFICATION_CATEGORIES = [
        "INTERVIEW_REQUEST",
        "RECRUITER_CONTACT",
        "REJECTION",
        "RESUME_REQUEST",
        "ADDITIONAL_INFORMATION_REQUEST",
        "ASSESSMENT",
        "FOLLOW_UP",
        "OFFER",
        "APPLICATION_CONFIRMATION",
        "OTHER"
    ]

    RISK_PATTERNS = [
        (r"salary|compensation|expected.*rate|hourly|package|base|bonus", "Compensation/Salary negotiation detected"),
        (r"visa|sponsorship|work.*auth|green.*card|h1-?b|citizenship", "Legal / Work authorization inquiry detected"),
        (r"ssn|social.*security|passport|bank|routing|tax|w-?2|w-?9", "Sensitive PII or financial document request detected"),
        (r"cryptocurrency|telegram|whatsapp|wire.*transfer", "Suspicious communication channel detected")
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

    def deterministic_classify(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fast deterministic rule-based classification fallback.
        """
        subject = email_data.get("subject", "").lower()
        body = email_data.get("body", "").lower()
        sender = email_data.get("sender", "")
        combined = f"{subject} {body}"

        classification = "OTHER"
        confidence = 0.85
        recommended_action = "Review message"
        requires_review = True

        if any(k in combined for k in ["interview", "schedule a call", "schedule an interview", "phone screen", "chat with the hiring manager", "zoom link", "google meet", "introductory call", "technical discussion"]):
            classification = "INTERVIEW_REQUEST"
            confidence = 0.95
            recommended_action = "Confirm availability and accept interview invitation"
            requires_review = True
        elif ("resume" in combined or "cv" in combined) and any(k in combined for k in ["send", "share", "updated", "request", "attach", "copy", "forward"]):
            classification = "RESUME_REQUEST"
            confidence = 0.96
            recommended_action = "Attach tailored Lead Architect resume and reply"
            requires_review = True
        elif any(k in combined for k in ["offer letter", "formal offer", "pleased to offer you"]):
            classification = "OFFER"
            confidence = 0.98
            recommended_action = "Review formal offer details with candidate"
            requires_review = True
        elif any(k in combined for k in ["unfortunately", "not moving forward", "other candidates", "impressed with your background, but"]):
            classification = "REJECTION"
            confidence = 0.94
            recommended_action = "Acknowledge gracefully / archive"
            requires_review = False
        elif any(k in combined for k in ["thank you for applying", "application received", "we have received your application"]):
            classification = "APPLICATION_CONFIRMATION"
            confidence = 0.99
            recommended_action = "Log confirmation reference"
            requires_review = False
        elif any(k in combined for k in ["coding challenge", "take-home", "hackerrank", "codesignal"]):
            classification = "ASSESSMENT"
            confidence = 0.92
            recommended_action = "Review assessment timeline"
            requires_review = True
        elif any(k in combined for k in ["came across your profile", "found your github", "saw your linkedin", "exciting opportunity", "reach out", "connecting"]):
            classification = "RECRUITER_CONTACT"
            confidence = 0.90
            recommended_action = "Express interest and request job spec"
            requires_review = True

        # Check safety risks
        risks = self.evaluate_risk(subject, body)
        if risks:
            requires_review = True

        # Draft contextual reply
        draft_subject = f"Re: {email_data.get('subject', 'Opportunity Discussion')}"
        company = email_data.get("company") or "Enterprise Team"
        
        if classification == "RESUME_REQUEST":
            draft_body = (
                f"Hi {email_data.get('sender_name') or 'there'},\n\n"
                f"Thank you for connecting regarding the architecture opportunities at {company}. "
                f"I have attached my tailored resume highlighting my 13.5+ years of experience leading Micro Frontend transformations, Module Federation, and Enterprise React platforms.\n\n"
                f"I look forward to discussing how my background aligns with your engineering goals.\n\n"
                f"Best regards,\nSathyanantham V\nLead Frontend Architect\nhttps://sathyanantham.dev"
            )
        elif classification == "INTERVIEW_REQUEST":
            draft_body = (
                f"Hi {email_data.get('sender_name') or 'there'},\n\n"
                f"Thank you for the interview invitation to speak with the team at {company}. I would be delighted to discuss the role.\n\n"
                f"I am available this week during the following windows (EST / UTC-5):\n"
                f"• Tuesday: 10:00 AM – 1:00 PM EST\n"
                f"• Thursday: 2:00 PM – 5:00 PM EST\n\n"
                f"Please let me know what works best on your end.\n\n"
                f"Best regards,\nSathyanantham V\nLead Frontend Architect"
            )
        else:
            draft_body = (
                f"Hi {email_data.get('sender_name') or 'there'},\n\n"
                f"Thank you for reaching out regarding {company}. I would be interested in learning more about the engineering scope and team objectives.\n\n"
                f"Best regards,\nSathyanantham V"
            )

        return {
            "classification": classification,
            "confidence": confidence,
            "company": company,
            "job_title": email_data.get("job_title", "Lead Frontend Architect"),
            "sender": sender,
            "recommended_action": recommended_action,
            "requires_human_review": requires_review,
            "risk_reasons": risks,
            "draft_reply_subject": draft_subject,
            "draft_reply_body": draft_body,
            "suggested_resume_version_id": "resume-v2026-sathya-architect-tailored" if classification == "RESUME_REQUEST" else None
        }

    async def classify_and_draft(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classifies incoming email using LLM with deterministic safety fallback.
        """
        # Always run deterministic analysis first for solid baseline
        baseline = self.deterministic_classify(email_data)

        system_prompt = """You are an Enterprise Executive AI Assistant managing inbound recruiter correspondence for Sathyanantham V (Lead Frontend Architect with 13.5+ years experience).
Classify the email accurately and generate a professional, context-aware draft reply.

CRITICAL RULES:
1. Classify strictly as one of: INTERVIEW_REQUEST, RECRUITER_CONTACT, REJECTION, RESUME_REQUEST, ADDITIONAL_INFORMATION_REQUEST, ASSESSMENT, FOLLOW_UP, OFFER, APPLICATION_CONFIRMATION, OTHER.
2. If compensation, visa sponsorship, sensitive PII, or ambiguous intent is present, set requires_human_review = true.
3. Outbound replies ALWAYS require human approval.
4. Output MUST be valid JSON conforming to the schema.

Required JSON Structure:
{
  "classification": "<CATEGORY>",
  "confidence": <0.0-1.0>,
  "company": "<Extracted Company>",
  "job_title": "<Extracted Title>",
  "recommended_action": "<Action summary>",
  "requires_human_review": <true/false>,
  "risk_reasons": ["<reason>"],
  "draft_reply_subject": "Re: ...",
  "draft_reply_body": "..."
}"""

        user_prompt = f"""Sender: {email_data.get('sender')}
Subject: {email_data.get('subject')}
Body:
{email_data.get('body', '')[:2000]}"""

        try:
            full_response = ""
            async for chunk in self.ai_provider.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                stream=False
            ):
                full_response += chunk

            json_match = re.search(r'\{[\s\S]*\}', full_response)
            if json_match:
                parsed = json.loads(json_match.group(0))
                # Ensure risk evaluation is merged
                additional_risks = self.evaluate_risk(email_data.get('subject', ''), email_data.get('body', ''))
                merged_risks = list(set(parsed.get("risk_reasons", []) + additional_risks))
                parsed["risk_reasons"] = merged_risks
                if merged_risks:
                    parsed["requires_human_review"] = True

                if parsed.get("classification") == "RESUME_REQUEST":
                    parsed["suggested_resume_version_id"] = "resume-v2026-sathya-architect-tailored"

                return parsed
        except Exception as e:
            print(f"[EMAIL_CLASSIFIER] LLM error, using fallback: {e}")

        return baseline

email_classification_service = EmailClassificationService()
