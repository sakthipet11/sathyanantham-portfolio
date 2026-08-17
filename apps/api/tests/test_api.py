import os
import unittest
from fastapi.testclient import TestClient

# Import FastAPI app from apps.api.main
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app, generate_admin_token, ADMIN_PASSWORD

class TestAdminSecurityAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.valid_token = generate_admin_token(ADMIN_PASSWORD)

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")

    def test_admin_login_success(self):
        response = self.client.post("/api/admin/login", json={"password": ADMIN_PASSWORD})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("token", data)

    def test_admin_login_failure(self):
        response = self.client.post("/api/admin/login", json={"password": "wrong_password_123"})
        self.assertEqual(response.status_code, 401)

    def test_admin_unauthorized_without_token(self):
        response = self.client.get("/api/admin/analytics")
        self.assertEqual(response.status_code, 401)

    def test_admin_unauthorized_with_bad_token(self):
        response = self.client.get("/api/admin/analytics", headers={"X-Admin-Token": "invalid_token"})
        self.assertEqual(response.status_code, 401)

    def test_admin_authorized_analytics(self):
        response = self.client.get("/api/admin/analytics", headers={"X-Admin-Token": self.valid_token})
        self.assertEqual(response.status_code, 200)

    def test_cms_upsert_whitelisting(self):
        headers = {"X-Admin-Token": self.valid_token}

        # Valid table
        valid_res = self.client.post(
            "/api/admin/cms/upsert",
            json={"table_name": "skills", "item": {"name": "Test Skill", "category": "frontend", "proficiency": "expert"}},
            headers=headers
        )
        self.assertEqual(valid_res.status_code, 200)

        # Invalid table (e.g. system or non-whitelisted table)
        invalid_res = self.client.post(
            "/api/admin/cms/upsert",
            json={"table_name": "users", "item": {"username": "hacker"}},
            headers=headers
        )
        self.assertEqual(invalid_res.status_code, 400)
        self.assertIn("not in allowed CMS tables list", invalid_res.json()["detail"])

    def test_cms_delete_whitelisting(self):
        headers = {"X-Admin-Token": self.valid_token}

        # Valid table
        valid_res = self.client.post(
            "/api/admin/cms/delete",
            json={"table_name": "skills", "item_id": 1},
            headers=headers
        )
        self.assertEqual(valid_res.status_code, 200)

        # Invalid table
        invalid_res = self.client.post(
            "/api/admin/cms/delete",
            json={"table_name": "contacts", "item_id": 1},
            headers=headers
        )
        self.assertEqual(invalid_res.status_code, 400)

    def test_delete_chat_sessions_endpoint(self):
        headers = {"X-Admin-Token": self.valid_token}
        response = self.client.delete("/api/admin/chat/sessions?session_id=test-session-123", headers=headers)
        self.assertEqual(response.status_code, 200)

if __name__ == "__main__":
    unittest.main()
