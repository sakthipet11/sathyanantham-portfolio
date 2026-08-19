import unittest
from fastapi.testclient import TestClient
from backend.python.main import app

class TestPhase6ControlCenter(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_overview_kpis(self):
        res = self.client.get("/api/v2/control-center/overview")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        ov = data["overview"]
        
        # Verify 9 Required Overview Metrics
        self.assertIn("jobs_discovered_today", ov)
        self.assertIn("qualified_jobs", ov)
        self.assertIn("average_ats_score", ov)
        self.assertIn("matches_90_plus", ov)
        self.assertIn("applications_pending", ov)
        self.assertIn("applications_submitted", ov)
        self.assertIn("interview_requests", ov)
        self.assertIn("referral_opportunities", ov)
        self.assertIn("recruiter_responses", ov)

        self.assertGreaterEqual(ov["average_ats_score"], 0)
        self.assertLessEqual(ov["average_ats_score"], 100)

    def test_pipeline_stages(self):
        res = self.client.get("/api/v2/control-center/pipeline")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        pipe = data["pipeline"]

        # Verify All Stages
        expected_stages = [
            "DISCOVERED", "SCORED", "QUALIFIED", "TAILORING",
            "READY_FOR_REVIEW", "APPROVED", "APPLYING", "APPLIED", "INTERVIEW"
        ]
        for stage in expected_stages:
            self.assertIn(stage, pipe)
            self.assertIsInstance(pipe[stage], int)

    def test_automation_agents_status(self):
        res = self.client.get("/api/v2/control-center/automation-status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        agents = data["agents"]

        self.assertEqual(len(agents), 6)
        agent_names = [a["name"] for a in agents]
        self.assertIn("Job Discovery Agent", agent_names)
        self.assertIn("ATS Scoring Engine", agent_names)
        self.assertIn("Resume Tailoring Engine", agent_names)
        self.assertIn("Application Automation Agent", agent_names)
        self.assertIn("Gmail / Recruiter Agent", agent_names)
        self.assertIn("Referral Discovery Agent", agent_names)

        for a in agents:
            self.assertIn(a["status"], ["Running", "Completed", "Failed"])
            self.assertIn("last_run", a)
            self.assertIn("next_run", a)

    def test_central_approval_queue(self):
        res = self.client.get("/api/v2/control-center/approval-queue")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("items", data)
        self.assertIsInstance(data["items"], list)

        # Verify structure of queue items
        for item in data["items"]:
            self.assertIn("type", item)
            self.assertIn("company", item)
            self.assertIn("priority", item)
            self.assertIn("ai_recommendation", item)
            self.assertIn("confidence", item)
            self.assertIn("what_will_happen_next", item)

    def test_analytics_metrics(self):
        res = self.client.get("/api/v2/control-center/analytics")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        anal = data["analytics"]

        self.assertIn("applications_per_week", anal)
        self.assertIn("ats_distribution", anal)
        self.assertIn("conversion_rates", anal)
        self.assertIn("top_companies", anal)
        self.assertIn("top_job_sources", anal)

if __name__ == "__main__":
    unittest.main()
