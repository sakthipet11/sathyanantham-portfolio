import unittest
import os
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.python.main import app
from backend.python.api.admin import generate_admin_token, get_admin_password
from backend.python.services.gdrive_sync_service import gdrive_sync_service
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.supabase_repo import db_helper

class TestGDriveSyncJob(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        token = generate_admin_token(get_admin_password())
        self.admin_headers = {"X-Admin-Token": token}
        self.today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def test_01_locate_and_parse_excel_file(self):
        """Tests locating dated Excel file and parsing rows cleanly."""
        file_path = gdrive_sync_service.locate_excel_file(self.today_str)
        self.assertIsNotNone(file_path)
        self.assertTrue(os.path.exists(file_path))
        self.assertIn("job_tracker_", os.path.basename(file_path))

        parsed = gdrive_sync_service.parse_excel_file(file_path)
        self.assertGreater(len(parsed), 0)

        first_job = parsed[0]
        self.assertIn("title", first_job)
        self.assertIn("company", first_job)
        self.assertIn("location", first_job)
        self.assertIn("apply_url", first_job)
        self.assertIn("match_score", first_job)

    def test_02_run_sync_persists_to_jobs_table(self):
        """Tests executing run_sync writes records directly into jobs DB table."""
        res = gdrive_sync_service.run_sync(date_str=self.today_str, triggered_by="TEST_RUNNER")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertGreater(res["jobs_processed"], 0)

        # Verify jobs appear in job repository / DB
        all_jobs = job_repository.list_jobs(limit=50)
        self.assertGreater(len(all_jobs), 0)

        # Check that Nextuple / Figma / Stripe sample jobs exist in DB
        companies = [j.get("company") for j in all_jobs]
        self.assertTrue(any("Nextuple" in c or "Figma" in c or "Stripe" in c for c in companies if c))

    def test_03_admin_api_schedule_setting_updates(self):
        """Tests Admin API schedule config updates without redeploying server."""
        update_payload = {
            "gdrive_sync_enabled": True,
            "gdrive_sync_schedule_time": "07:00 AM IST",
            "gdrive_sync_frequency": "DAILY"
        }
        resp = self.client.put("/api/admin/settings", json=update_payload, headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)

        settings = db_helper.get_automation_settings()
        self.assertTrue(settings.get("gdrive_sync_enabled"))
        self.assertEqual(settings.get("gdrive_sync_schedule_time"), "07:00 AM IST")
        self.assertEqual(settings.get("gdrive_sync_frequency"), "DAILY")

    def test_04_run_now_endpoint_trigger(self):
        """Tests the Run Now manual trigger endpoint for instant testing."""
        resp = self.client.post("/api/admin/gdrive-sync/run", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertGreater(data["jobs_processed"], 0)
        self.assertIn("job_tracker_", data["file_name"])

    def test_05_status_hud_endpoint(self):
        """Tests GET /api/admin/gdrive-sync/status returns live status metadata."""
        resp = self.client.get("/api/admin/gdrive-sync/status", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("enabled", data)
        self.assertIn("schedule_time", data)
        self.assertIn("frequency", data)
        self.assertIn("last_status", data)

if __name__ == "__main__":
    unittest.main()
