import unittest
import asyncio
from backend.python.services.job_normalization_service import job_normalization_service
from backend.python.services.job_deduplication_service import job_deduplication_service
from backend.python.services.job_scoring_service import job_scoring_service
from backend.python.repositories.job_repository import job_repository
from backend.python.services.job_discovery_service import job_discovery_service

class TestPhase1JobPipeline(unittest.TestCase):

    def test_job_normalization(self):
        raw_payload = {
            "company": "<b>Enterprise Corp</b>",
            "title": "  Lead Frontend Architect  ",
            "location": "Remote - US",
            "salary": "$180,000 - $220,000",
            "description": "<p>Seeking a <b>React</b> & <b>TypeScript</b> expert with Micro Frontends and Module Federation experience.</p>",
            "requirements": "10+ years experience with Next.js, Web Performance, and Architecture.",
            "source_job_id": "GH-10023",
            "apply_url": "https://boards.greenhouse.io/enterprise/jobs/10023"
        }
        
        norm = job_normalization_service.normalize(raw_payload, source="greenhouse")
        self.assertEqual(norm["company"], "Enterprise Corp")
        self.assertEqual(norm["title"], "Lead Frontend Architect")
        self.assertEqual(norm["location_type"], "Remote")
        self.assertEqual(norm["salary_min"], 180000.0)
        self.assertEqual(norm["salary_max"], 220000.0)
        self.assertIn("React", norm["tech_stack"])
        self.assertIn("Micro Frontends", norm["tech_stack"])
        self.assertIn("TypeScript", norm["tech_stack"])
        self.assertEqual(norm["source"], "greenhouse")

    def test_job_deduplication_and_idempotency(self):
        job_a = {
            "source": "greenhouse",
            "source_job_id": "GH-999",
            "company": "Acme Inc",
            "title": "Staff Frontend Architect",
            "apply_url": "https://boards.greenhouse.io/acme/999"
        }
        job_b = {
            "source": "greenhouse",
            "source_job_id": "GH-999",
            "company": "Acme Inc (Updated)",
            "title": "Staff Frontend Architect",
            "apply_url": "https://boards.greenhouse.io/acme/999"
        }
        
        key_a = job_deduplication_service.generate_idempotency_key(job_a)
        key_b = job_deduplication_service.generate_idempotency_key(job_b)
        self.assertEqual(key_a, key_b, "Idempotency keys must match for identical source and source_job_id")

        # Fallback key check
        fallback_job_1 = {
            "source": "manual",
            "company": "Stripe",
            "title": "Principal UI Engineer",
            "apply_url": "https://stripe.com/jobs/123"
        }
        fallback_job_2 = {
            "source": "manual",
            "company": "Stripe  ",
            "title": "Principal UI Engineer",
            "apply_url": "https://stripe.com/jobs/123"
        }
        self.assertEqual(
            job_deduplication_service.generate_idempotency_key(fallback_job_1),
            job_deduplication_service.generate_idempotency_key(fallback_job_2)
        )

    def test_ats_match_level_classification(self):
        self.assertEqual(job_scoring_service.classify_match_level(95.0), "EXCELLENT")
        self.assertEqual(job_scoring_service.classify_match_level(87.5), "STRONG")
        self.assertEqual(job_scoring_service.classify_match_level(78.0), "POTENTIAL")
        self.assertEqual(job_scoring_service.classify_match_level(65.0), "LOW")
        self.assertEqual(job_scoring_service.classify_match_level(45.0), "REJECT")

    def test_deterministic_scoring_no_hallucination(self):
        mock_job = {
            "title": "Lead Frontend Architect",
            "company": "Cloud Corp",
            "location_type": "Remote",
            "description_raw": "Seeking Lead Frontend Architect with React, TypeScript, Module Federation, Next.js",
            "requirements_clean": "Micro Frontends, Design Systems, 10+ years experience"
        }
        mock_profile = {
            "full_name": "Sathyanantham V",
            "years_of_experience": 13.5,
            "primary_skills": ["React", "TypeScript", "Micro Frontends", "Module Federation", "Next.js"],
            "secondary_skills": ["Node.js", "Python", "FastAPI"]
        }

        score = job_scoring_service.deterministic_fallback_score(mock_job, mock_profile)
        self.assertGreaterEqual(score["overall_score"], 80.0)
        self.assertIn(score["match_level"], ["STRONG", "EXCELLENT"])
        self.assertIn("React", score["matching_keywords"])
        self.assertTrue(len(score["strengths"]) > 0)
        self.assertFalse(any("invented" in s.lower() for s in score["strengths"]))

    def test_end_to_end_discovery_pipeline(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        res = loop.run_until_complete(
            job_discovery_service.run_discovery_pipeline(
                target_role="Lead Frontend Architect",
                triggered_by="TEST_RUNNER"
            )
        )
        loop.close()

        self.assertEqual(res["status"], "success")
        self.assertGreater(res["jobs_found"], 0)
        self.assertGreater(res["jobs_scored"], 0)
        self.assertEqual(res["jobs_failed"], 0)

        # Check Workday job marked as MANUAL_REQUIRED
        workday_jobs = [j for j in res["jobs"] if j.get("portal_type") == "workday"]
        if workday_jobs:
            self.assertEqual(workday_jobs[0]["status"], "MANUAL_REQUIRED")

        # Verify metrics updated
        metrics = job_repository.get_job_metrics()
        self.assertGreater(metrics["total_jobs"], 0)
        self.assertGreater(metrics["average_ats_score"], 0)

if __name__ == "__main__":
    unittest.main()
