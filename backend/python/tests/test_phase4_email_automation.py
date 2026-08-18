import unittest
import asyncio
import uuid
from backend.python.services.email_classification_service import email_classification_service
from backend.python.services.recruiter_automation_service import recruiter_automation_service
from backend.python.repositories.email_repository import email_repository

class TestPhase4EmailAutomation(unittest.TestCase):

    def test_email_classification_types(self):
        # 1. Interview Request
        email_interview = {
            "subject": "Invitation to connect: Lead Frontend Architect at TechCorp",
            "body": "Hi Sathya, we loved your background and would like to schedule a 30-minute phone screen with the engineering manager.",
            "sender": "sarah@techcorp.com",
            "company": "TechCorp"
        }
        res_int = email_classification_service.deterministic_classify(email_interview)
        self.assertEqual(res_int["classification"], "INTERVIEW_REQUEST")
        self.assertGreaterEqual(res_int["confidence"], 0.90)
        self.assertTrue(res_int["requires_human_review"])
        self.assertIn("interview", res_int["draft_reply_body"].lower())

        # 2. Resume Request
        email_resume = {
            "subject": "Resume Request: Principal UI Engineer role",
            "body": "Could you please send your updated resume in PDF format?",
            "sender": "recruiter@stripe.com",
            "company": "Stripe"
        }
        res_res = email_classification_service.deterministic_classify(email_resume)
        self.assertEqual(res_res["classification"], "RESUME_REQUEST")
        self.assertIsNotNone(res_res["suggested_resume_version_id"])

        # 3. Formal Offer
        email_offer = {
            "subject": "Offer Letter - Lead Platform Architect",
            "body": "We are pleased to offer you the position of Lead Platform Architect at Acme Corp.",
            "sender": "hr@acme.com",
            "company": "Acme Corp"
        }
        res_off = email_classification_service.deterministic_classify(email_offer)
        self.assertEqual(res_off["classification"], "OFFER")

        # 4. Rejection
        email_rej = {
            "subject": "Application Update: Senior Architect",
            "body": "Thank you for taking the time to apply. Unfortunately we are not moving forward at this time.",
            "sender": "no-reply@greenhouse-mail.io",
            "company": "Enterprise Inc"
        }
        res_rej = email_classification_service.deterministic_classify(email_rej)
        self.assertEqual(res_rej["classification"], "REJECTION")

    def test_risk_evaluation_and_human_review_gating(self):
        # Email inquiring about salary and visa sponsorship
        email_risky = {
            "subject": "Compensation & Visa check",
            "body": "Hi Sathya, what is your expected base salary and do you require H1B visa sponsorship?",
            "sender": "recruiting@fintech.com",
            "company": "FinTech"
        }
        res = email_classification_service.deterministic_classify(email_risky)
        self.assertTrue(res["requires_human_review"])
        self.assertTrue(len(res["risk_reasons"]) >= 2)
        self.assertTrue(any("Compensation" in r for r in res["risk_reasons"]))
        self.assertTrue(any("Work authorization" in r for r in res["risk_reasons"]))

    def test_end_to_end_inbound_ingestion_and_approval_send(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        msg_id = f"gmsg-test-{uuid.uuid4().hex[:8]}"
        raw_email = {
            "gmail_message_id": msg_id,
            "thread_id": f"th-{msg_id[:8]}",
            "sender": "director.eng@figma.com",
            "sender_name": "Engineering Director",
            "company": "Figma",
            "subject": "Interview Invitation: Lead UI Architect at Figma",
            "body": "Hi Sathya, we would like to invite you for an interview phone screen to discuss our Micro Frontend architecture roadmap."
        }

        # 1. Ingest & Classify
        ingest_res = loop.run_until_complete(
            recruiter_automation_service.process_inbound_email(raw_email)
        )
        self.assertEqual(ingest_res["status"], "SUCCESS")
        saved_email = ingest_res["email"]
        email_id = saved_email["id"]

        self.assertIn(saved_email["classification"], ["INTERVIEW_REQUEST", "RECRUITER_CONTACT"])
        self.assertEqual(saved_email["status"], "DRAFT_READY")
        self.assertIsNotNone(saved_email["draft_reply_body"])

        # 2. Outbound Human Approval Gate
        send_res = loop.run_until_complete(
            recruiter_automation_service.approve_and_send_reply(
                email_id=email_id,
                approved_by="HUMAN_ADMIN_TESTER"
            )
        )
        self.assertEqual(send_res["status"], "SENT")
        self.assertIsNotNone(send_res["sent_message_id"])

        # Verify DB status
        final_em = email_repository.get_email_by_id(email_id)
        self.assertEqual(final_em["status"], "SENT")
        self.assertIsNotNone(final_em.get("sent_at"))

        # 3. Duplicate Ingestion Prevention
        dup_res = loop.run_until_complete(
            recruiter_automation_service.process_inbound_email(raw_email)
        )
        self.assertEqual(dup_res["status"], "DUPLICATE_SKIPPED")

        loop.close()

if __name__ == "__main__":
    unittest.main()
