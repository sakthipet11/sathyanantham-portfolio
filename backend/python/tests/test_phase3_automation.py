import unittest
import asyncio
import uuid
from backend.python.services.candidate_profile_service import candidate_profile_service
from backend.python.services.application_automation_service import application_automation_service
from backend.python.repositories.application_repository import application_repository
from backend.python.repositories.job_repository import job_repository

class TestPhase3ApplicationAutomation(unittest.TestCase):

    def setUp(self):
        # Create fresh unique test jobs for each test to avoid state collision across test cases
        self.unique_id = uuid.uuid4().hex[:8]
        self.test_job = {
            "id": f"job-test-{self.unique_id}",
            "source": "greenhouse",
            "source_job_id": f"GH-TEST-{self.unique_id}",
            "company": f"TestCorp-{self.unique_id}",
            "title": "Lead UI Architect",
            "apply_url": f"https://boards.greenhouse.io/testcorp-{self.unique_id}/jobs/101",
            "portal_type": "greenhouse",
            "status": "QUALIFIED"
        }
        job_repository.save_job(self.test_job)

    def test_candidate_profile_verified_field_gating(self):
        # Verified field access
        name_val = candidate_profile_service.get_verified_field_value("name")
        self.assertIsNotNone(name_val)
        self.assertIn("Sathyanantham", name_val)

        email_val = candidate_profile_service.get_verified_field_value("email")
        self.assertIsNotNone(email_val)
        self.assertIn("@", email_val)

        # Unverified / non-existent field must return None (blocked)
        unverified_val = candidate_profile_service.get_verified_field_value("unverified_secret_clearance")
        self.assertIsNone(unverified_val)

    def test_semantic_field_mapping_confidence(self):
        # 1. Standard Full Name Input
        name_field = {"name": "candidate_full_name", "label": "Full Name", "type": "text"}
        mapped_name = application_automation_service.map_form_field(name_field)
        self.assertEqual(mapped_name["status"], "MAPPED")
        self.assertGreaterEqual(mapped_name["confidence"], 0.85)
        self.assertTrue(mapped_name["is_verified"])
        self.assertIsNotNone(mapped_name["value"])

        # 2. Unknown Custom Question (Must NOT guess or invent info)
        custom_question = {"name": "custom_q_123", "label": "Describe in 500 words your experience managing AWS CDK v2 pipelines", "type": "textarea"}
        mapped_custom = application_automation_service.map_form_field(custom_question)
        self.assertEqual(mapped_custom["status"], "UNKNOWN_FIELD")
        self.assertFalse(mapped_custom["is_verified"])
        self.assertIsNone(mapped_custom["value"])

    def test_anti_bot_captcha_and_mfa_detection(self):
        # Cloudflare Turnstile detection
        cf_html = '<div class="cf-turnstile" data-sitekey="xyz"></div>'
        res_cf = application_automation_service.detect_security_challenges(cf_html, "greenhouse")
        self.assertIsNotNone(res_cf)
        self.assertEqual(res_cf["type"], "CAPTCHA_DETECTED")

        # reCAPTCHA detection
        recaptcha_html = '<div class="g-recaptcha" data-sitekey="abc"></div>'
        res_rc = application_automation_service.detect_security_challenges(recaptcha_html, "lever")
        self.assertIsNotNone(res_rc)
        self.assertEqual(res_rc["type"], "CAPTCHA_DETECTED")

        # Workday Sentinel
        res_wd = application_automation_service.detect_security_challenges("<html><body>Workday</body></html>", "workday")
        self.assertIsNotNone(res_wd)
        self.assertEqual(res_wd["type"], "CAPTCHA_DETECTED")

    def test_end_to_end_preparation_and_approval_gate(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Stage 1: Preparation (Form Mapping -> READY_FOR_REVIEW)
        prep_res = loop.run_until_complete(
            application_automation_service.prepare_application(job_id=self.test_job["id"])
        )
        self.assertEqual(prep_res["status"], "READY_FOR_REVIEW")
        app_id = prep_res["application_id"]

        # Verify application record state
        app_record = application_repository.get_application_by_id(app_id)
        self.assertIsNotNone(app_record)
        self.assertEqual(app_record["status"], "READY_FOR_REVIEW")

        # Verify events logged
        events = application_repository.get_events_for_application(app_id)
        event_types = [e["event_type"] for e in events]
        self.assertIn("APPLICATION_STARTED", event_types)
        self.assertIn("FIELD_FILLED", event_types)
        self.assertIn("RESUME_UPLOADED", event_types)
        self.assertIn("APPLICATION_READY_FOR_REVIEW", event_types)

        # Stage 2: Approval Gate (Human Grants Approval -> SUBMITTED)
        submit_res = loop.run_until_complete(
            application_automation_service.submit_application_with_approval(
                application_id=app_id,
                approved_by="HUMAN_ADMIN_TESTER",
                notes="Verified candidate info matches test requirements."
            )
        )
        self.assertEqual(submit_res["status"], "SUBMITTED")
        self.assertTrue(submit_res["confirmation_id"].startswith("CONF-"))

        # Verify state transition in repositories
        final_app = application_repository.get_application_by_id(app_id)
        self.assertEqual(final_app["status"], "SUBMITTED")
        self.assertIsNotNone(final_app["submitted_at"])

        final_job = job_repository.get_job_by_id(self.test_job["id"])
        self.assertEqual(final_job["status"], "APPLIED")

        loop.close()

    def test_duplicate_application_prevention(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # First preparation & submission
        first_prep = loop.run_until_complete(
            application_automation_service.prepare_application(job_id=self.test_job["id"])
        )
        app_id = first_prep["application_id"]
        loop.run_until_complete(
            application_automation_service.submit_application_with_approval(app_id)
        )

        # Attempt to apply to the same job a second time (must be blocked)
        second_prep = loop.run_until_complete(
            application_automation_service.prepare_application(job_id=self.test_job["id"])
        )
        self.assertEqual(second_prep["status"], "DUPLICATE_BLOCKED")
        self.assertIn("already exists", second_prep["message"])

        loop.close()

if __name__ == "__main__":
    unittest.main()
