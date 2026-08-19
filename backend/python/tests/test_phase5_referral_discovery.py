import unittest
import asyncio
import uuid
from backend.python.services.referral_ranking_service import referral_ranking_service
from backend.python.services.referral_messaging_service import referral_messaging_service
from backend.python.services.referral_discovery_service import referral_discovery_service
from backend.python.repositories.referral_repository import referral_repository

class TestPhase5ReferralDiscovery(unittest.TestCase):

    def test_referral_candidate_ranking_and_evidence(self):
        job = {
            "title": "Lead UI Platform Architect",
            "company": "Figma",
            "ats_score": 96
        }

        # 1. 1st-degree LinkedIn Connection (VP of Engineering)
        contact_1st = {
            "person_name": "Marcus Vance",
            "company": "Figma",
            "role": "VP of Core Product Engineering",
            "profile_url": "https://linkedin.com/in/marcus-vance-figma",
            "connection_type": "1ST_DEGREE_LINKEDIN",
            "connected_since": "2022",
            "skills": ["Micro Frontends", "React", "Design Systems"]
        }
        res_1st = referral_ranking_service.rank_contact(job, contact_1st)
        self.assertGreaterEqual(res_1st["referral_score"], 90)
        self.assertTrue(res_1st["recommended_contact"])
        self.assertIn("1st-Degree LinkedIn connection", res_1st["relationship_evidence"])

        # 2. Public Directory Contact (Zero Relationship Fabrication)
        contact_public = {
            "person_name": "David Lindqvist",
            "company": "Linear",
            "role": "Principal Systems Engineer",
            "profile_url": "https://linkedin.com/in/david-lindqvist-linear",
            "connection_type": "PUBLIC_DIRECTORY",
            "skills": ["TypeScript", "Frontend Systems"]
        }
        res_pub = referral_ranking_service.rank_contact(job, contact_public)
        # Should not claim 1st degree connection
        self.assertNotIn("1st-Degree", res_pub["relationship_evidence"])
        self.assertIn("Public employee directory", res_pub["relationship_evidence"])

    def test_personalized_message_generation(self):
        job = {
            "title": "Lead UI Platform Architect",
            "company": "Figma",
            "ats_score": 96
        }

        # Warm message for 1st-degree contact
        contact_1st = {
            "person_name": "Marcus Vance",
            "company": "Figma",
            "connection_type": "1ST_DEGREE_LINKEDIN"
        }
        msg_1st = referral_messaging_service.deterministic_generate(job, contact_1st, include_twin_demo=True)
        self.assertIn("Marcus", msg_1st["body"])
        self.assertIn("13.5+", msg_1st["body"])
        self.assertIn("Micro Frontend", msg_1st["body"])
        self.assertIn("https://sathyanantham.dev", msg_1st["body"])
        self.assertIn("openTwin=true", msg_1st["body"])
        self.assertIn("Hope you're having a great week", msg_1st["body"])

        # Cold introductory message for public directory
        contact_pub = {
            "person_name": "David Lindqvist",
            "company": "Linear",
            "connection_type": "PUBLIC_DIRECTORY"
        }
        msg_pub = referral_messaging_service.deterministic_generate(job, contact_pub, include_twin_demo=False)
        self.assertIn("I came across your profile while researching", msg_pub["body"])
        self.assertNotIn("openTwin=true", msg_pub["body"])

    def test_end_to_end_referral_discovery_and_human_approval_send(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # 1. Discover referral opportunities for jobs with ATS >= 90
        discovered = loop.run_until_complete(
            referral_discovery_service.discover_referral_opportunities(threshold=90)
        )
        self.assertIsInstance(discovered, list)

        # Create test referral record
        ref_id = f"ref-test-{uuid.uuid4().hex[:8]}"
        test_ref = {
            "id": ref_id,
            "job_id": "job-test-01",
            "job_title": "Lead Architect",
            "job_ats_score": 95,
            "company": "Figma",
            "person_name": "Marcus Vance",
            "role": "VP Engineering",
            "connection_type": "1ST_DEGREE_LINKEDIN",
            "referral_score": 96,
            "relationship_evidence": "1st-Degree LinkedIn connection",
            "message": "Hi Marcus, referral request test.",
            "status": "READY_FOR_REVIEW"
        }
        saved_ref = referral_repository.save_referral(test_ref)
        self.assertEqual(saved_ref["id"], ref_id)

        # 2. Human Approval Gate
        app_res = referral_discovery_service.approve_referral(ref_id, approved_by="HUMAN_ADMIN_TESTER")
        self.assertEqual(app_res["status"], "SUCCESS")
        self.assertEqual(app_res["referral"]["status"], "APPROVED")

        # 3. Dispatch Outbound Referral
        send_res = loop.run_until_complete(
            referral_discovery_service.send_referral(ref_id, sent_by="HUMAN_ADMIN_TESTER")
        )
        self.assertEqual(send_res["status"], "SENT")
        self.assertEqual(send_res["referral"]["status"], "SENT")
        self.assertIsNotNone(send_res["referral"].get("sent_at"))

        loop.close()

if __name__ == "__main__":
    unittest.main()
