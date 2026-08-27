import unittest
import os
import openpyxl
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.python.main import app
from backend.python.api.admin import generate_admin_token, get_admin_password
from backend.python.services.gdrive_sync_service import (
    gdrive_sync_service,
    parse_fitness_score,
    parse_sheet_date,
    normalize_sheet_status,
    DEFAULT_GDRIVE_FOLDER_URL,
    DEFAULT_GDRIVE_FOLDER_ID
)
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.supabase_repo import db_helper

class TestGDriveSyncJob(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        token = generate_admin_token(get_admin_password())
        self.admin_headers = {"X-Admin-Token": token}
        self.today_str = datetime.now().strftime("%Y-%m-%d")
        self.target_folder_url = "https://drive.google.com/drive/u/1/folders/1AtZo2n7TYsavZrw6cG1quek3je0K3hkO"

    def test_01_fitness_score_conversion(self):
        """Tests converting various string formats like '96% Fit', '88.5%', 94 to float numbers."""
        self.assertEqual(parse_fitness_score("96% Fit"), 96.0)
        self.assertEqual(parse_fitness_score("96%"), 96.0)
        self.assertEqual(parse_fitness_score("88.5% Fit"), 88.5)
        self.assertEqual(parse_fitness_score("Score: 92/100"), 92.0)
        self.assertEqual(parse_fitness_score(94), 94.0)
        self.assertEqual(parse_fitness_score(0.95), 95.0)
        self.assertIsNone(parse_fitness_score(""))
        self.assertIsNone(parse_fitness_score(None))

    def test_02_parse_sheet_date(self):
        """Tests parsing dates in various formats into clean ISO dates."""
        self.assertEqual(parse_sheet_date("2026-08-27"), "2026-08-27")
        self.assertEqual(parse_sheet_date("2026/08/27"), "2026-08-27")
        self.assertEqual(parse_sheet_date("27/08/2026"), "2026-08-27")
        self.assertIsNone(parse_sheet_date(None))

    def test_03_extract_folder_id(self):
        """Tests Google Drive folder ID extraction from URL formats."""
        folder_id = gdrive_sync_service.extract_folder_id(self.target_folder_url)
        self.assertEqual(folder_id, "1AtZo2n7TYsavZrw6cG1quek3je0K3hkO")
        self.assertEqual(gdrive_sync_service.extract_folder_id("1AtZo2n7TYsavZrw6cG1quek3je0K3hkO"), "1AtZo2n7TYsavZrw6cG1quek3je0K3hkO")

    def test_04_no_fake_mock_file_created_on_locate(self):
        """Tests that locate_excel_file does NOT inject fake mock files when none exist."""
        non_existent_date = "1999-01-01"
        file_path = gdrive_sync_service.locate_excel_file(non_existent_date, folder_url_or_id=DEFAULT_GDRIVE_FOLDER_ID)
        self.assertIsNone(file_path)

    def test_05_parse_all_21_headline_columns_and_sync_db(self):
        """
        Tests creating and parsing a sheet with all 21 headline columns:
        Date Found, Company, Company Domain, Role, Job ID, Platform, Location, Posted Date,
        Job URL, Fitness Score, Resume Generated, Cover Letter, Status, Date Applied,
        Response Date, Outcome, Interview Stage, Rejection Reason, Notes, Follow-up Date, Next Action
        """
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        downloads_dir = os.path.join(repo_root, "public", "downloads")
        os.makedirs(downloads_dir, exist_ok=True)
        test_date = "2026-08-28"
        today_file = os.path.join(downloads_dir, f"job_tracker_{test_date}.xlsx")

        headers = [
            "Date Found", "Company", "Company Domain", "Role", "Job ID", "Platform",
            "Location", "Posted Date", "Job URL", "Fitness Score", "Resume Generated",
            "Cover Letter", "Status", "Date Applied", "Response Date", "Outcome",
            "Interview Stage", "Rejection Reason", "Notes", "Follow-up Date", "Next Action"
        ]

        test_row = [
            "2026-08-28",
            "Anthropic AI Systems",
            "anthropic.com",
            "Lead Staff React Architect",
            "REQ-99482",
            "LinkedIn",
            "San Francisco / Remote",
            "Today (4h ago)",
            "https://jobs.anthropic.com/role/99482",
            "98% Fit",
            "Generated",
            "Custom Cover Letter Ready",
            "Applied",
            "2026-08-28",
            "2026-08-30",
            "Under Review",
            "Screening Scheduled",
            "",
            "High priority role focusing on Claude code web platform.",
            "2026-09-02",
            "Prepare system architecture presentation"
        ]

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Tracker"
        ws.append(headers)
        ws.append(test_row)
        wb.save(today_file)

        try:
            res = gdrive_sync_service.run_sync(
                date_str=test_date,
                folder_url=self.target_folder_url,
                triggered_by="TEST_RUNNER"
            )
            self.assertEqual(res["status"], "SUCCESS")
            self.assertEqual(res["folder_id"], "1AtZo2n7TYsavZrw6cG1quek3je0K3hkO")
            self.assertEqual(res["file_name"], f"job_tracker_{test_date}.xlsx")
            self.assertEqual(res["jobs_processed"], 1)

            # Verify in DB table jobs
            all_jobs = job_repository.list_jobs(limit=50)
            anthropic_job = next((j for j in all_jobs if "Anthropic" in (j.get("company") or "")), None)
            self.assertIsNotNone(anthropic_job)
            self.assertEqual(anthropic_job.get("company_domain"), "anthropic.com")
            self.assertEqual(anthropic_job.get("title"), "Lead Staff React Architect")
            # Verify numeric score converted from '98% Fit' -> 98.0
            self.assertEqual(float(anthropic_job.get("match_score", 0)), 98.0)
            self.assertEqual(anthropic_job.get("status"), "APPLIED")

            # Verify in DB table job_scores
            job_score = job_repository.get_job_score(anthropic_job["id"])
            if job_score:
                self.assertEqual(float(job_score.get("overall_score", 0)), 98.0)
        finally:
            if os.path.exists(today_file):
                os.remove(today_file)

    def test_06_run_sync_when_no_file_returns_not_found(self):
        """Tests that run_sync returns NOT_FOUND when no file exists for a specified date."""
        res = gdrive_sync_service.run_sync(
            date_str="2099-12-31",
            folder_url=self.target_folder_url,
            triggered_by="TEST_RUNNER"
        )
        self.assertEqual(res["status"], "NOT_FOUND")
        self.assertEqual(res["jobs_processed"], 0)
        self.assertIn("job_tracker_2099-12-31.xlsx", res["file_name"])

    def test_07_admin_api_folder_and_schedule_setting_updates(self):
        """Tests Admin API schedule and folder config updates."""
        update_payload = {
            "gdrive_folder_url": "https://drive.google.com/drive/u/1/folders/1AtZo2n7TYsavZrw6cG1quek3je0K3hkO",
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
        self.assertEqual(settings.get("gdrive_folder_url"), "https://drive.google.com/drive/u/1/folders/1AtZo2n7TYsavZrw6cG1quek3je0K3hkO")

    def test_08_run_now_endpoint_trigger_with_folder(self):
        """Tests the Run Now manual trigger endpoint returns live execution structure."""
        resp = self.client.post(
            f"/api/admin/gdrive-sync/run?folder_url={self.target_folder_url}",
            headers=self.admin_headers
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn(data["status"], ["SUCCESS", "NOT_FOUND"])
        self.assertEqual(data.get("folder_id"), "1AtZo2n7TYsavZrw6cG1quek3je0K3hkO")

if __name__ == "__main__":
    unittest.main()
