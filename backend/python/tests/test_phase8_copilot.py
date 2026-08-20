import unittest
from fastapi.testclient import TestClient

from backend.python.main import app
from backend.python.services.ai_job_copilot_service import ai_job_copilot_service

class TestPhase8Copilot(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_copilot_job_discovery_intent(self):
        result = ai_job_copilot_service.process_chat_message("Find the best 10 jobs for me today")
        self.assertEqual(result["type"], "JOB_DISCOVERY_RESULT")
        self.assertIn("funnel", result)
        self.assertIn("recommendations", result)

        # Check funnel structure
        funnel = result["funnel"]
        self.assertEqual(len(funnel), 6)
        stages = [f["stage"] for f in funnel]
        self.assertTrue(any("Discovered" in s for s in stages))
        self.assertTrue(any("Duplicates" in s for s in stages))
        self.assertTrue(any("> 75%" in s for s in stages))
        self.assertTrue(any("≥ 90%" in s for s in stages))

        # Check recommendations
        recs = result["recommendations"]
        self.assertGreater(len(recs), 0)
        for r in recs:
            self.assertIn("company", r)
            self.assertIn("ats_score", r)
            self.assertIn("strengths", r)
            self.assertIn("gaps", r)
            self.assertIn("recommendation", r)

    def test_copilot_prepare_applications_intent(self):
        result = ai_job_copilot_service.process_chat_message("Prepare applications for the top 3")
        self.assertEqual(result["type"], "APPLICATION_PREPARATION_RESULT")
        self.assertIn("staged_items", result)
        self.assertIn("approval_gate", result)

        staged = result["staged_items"]
        self.assertEqual(len(staged), 3)
        for s in staged:
            self.assertEqual(s["status"], "READY_FOR_REVIEW")
            self.assertIn("resume_version", s)
            self.assertIn("tailoring_highlights", s)

        self.assertTrue(result["approval_gate"]["waiting_for_approval"])

    def test_copilot_referral_intent(self):
        result = ai_job_copilot_service.process_chat_message("Find referrals for Figma and Stripe")
        self.assertEqual(result["type"], "REFERRAL_DISCOVERY_RESULT")
        self.assertIn("referrals", result)
        self.assertGreater(len(result["referrals"]), 0)

        for ref in result["referrals"]:
            self.assertIn("openTwin=true", ref["draft_message"])

    def test_copilot_tailor_cv_intent(self):
        result = ai_job_copilot_service.process_chat_message("Tailor CV and resume for Figma")
        self.assertEqual(result["type"], "TAILOR_RESUME_RESULT")
        self.assertIn("resume", result)
        self.assertEqual(result["resume"]["company"], "Figma")
        self.assertIn("download_url", result["resume"])

    def test_copilot_send_hr_email_intent(self):
        result = ai_job_copilot_service.process_chat_message("Send email to HR for Figma")
        self.assertEqual(result["type"], "SEND_HR_EMAIL_RESULT")
        self.assertIn("details", result)
        self.assertEqual(result["details"]["company"], "Figma")
        self.assertEqual(result["details"]["status"], "SENT")

    def test_copilot_apply_job_intent(self):
        result = ai_job_copilot_service.process_chat_message("Apply job for Figma")
        self.assertEqual(result["type"], "APPLY_JOB_RESULT")
        self.assertIn("application", result)
        self.assertEqual(result["application"]["company"], "Figma")
        self.assertEqual(result["application"]["status"], "SUBMITTED")

if __name__ == "__main__":
    unittest.main()
