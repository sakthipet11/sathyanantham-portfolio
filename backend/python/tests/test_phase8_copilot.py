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

    def test_copilot_inbox_intent(self):
        result = ai_job_copilot_service.process_chat_message("Summarize my recruiter inbox")
        self.assertEqual(result["type"], "INBOX_SUMMARY_RESULT")
        self.assertIn("items", result)

    def test_api_copilot_endpoints(self):
        # 1. Chat endpoint
        res = self.client.post("/api/v2/copilot/chat", json={
            "message": "Find the best 10 jobs for me today"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["data"]["type"], "JOB_DISCOVERY_RESULT")

        # 2. Suggestions endpoint
        sug_res = self.client.get("/api/v2/copilot/suggestions")
        self.assertEqual(sug_res.status_code, 200)
        self.assertIn("suggestions", sug_res.json())

        # 3. Batch action endpoint
        act_res = self.client.post("/api/v2/copilot/execute-action", json={
            "action_id": "APPROVE_ALL_STAGED"
        })
        self.assertEqual(act_res.status_code, 200)
        self.assertIn("approved", act_res.json()["message"].lower())

if __name__ == "__main__":
    unittest.main()
