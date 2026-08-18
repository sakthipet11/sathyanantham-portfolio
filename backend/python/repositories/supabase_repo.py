import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from dotenv import load_dotenv
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = Any

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY", os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", ""))))

class SupabaseHelper:
    def __init__(self):
        self.client: Optional[Client] = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                import re
                is_jwt = re.match(r"^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$", SUPABASE_KEY)
                if is_jwt:
                    self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
                else:
                    dummy_jwt = "dummy.jwt.token"
                    self.client = create_client(SUPABASE_URL, dummy_jwt)
                    self.client.supabase_key = SUPABASE_KEY
                    self.client.options.headers["apiKey"] = SUPABASE_KEY
                    self.client.options.headers["Authorization"] = f"Bearer {SUPABASE_KEY}"
                print("Supabase client initialized successfully.")
            except Exception as e:
                print(f"Failed to initialize Supabase client: {e}")
        else:
            print("SUPABASE_URL or SUPABASE_KEY missing. Database helper will run in Mock/Offline Mode.")

        # In-memory mock stores for offline development / test resilience
        self._mock_profile = {
            "id": "00000000-0000-0000-0000-000000000001",
            "full_name": "Sathyanantham V",
            "email": "sakthipet111@gmail.com",
            "phone": "+91-XXXXXXXXXX",
            "location": "Bangalore, India (Open to Remote / Relocation)",
            "work_authorization": "Authorized in India; Open to Global Sponsorship & Remote",
            "years_of_experience": 13.5,
            "notice_period_days": 30,
            "current_salary": 0.0,
            "expected_salary_min": 140000.0,
            "primary_skills": ["React", "TypeScript", "Micro Frontends", "Next.js", "System Architecture", "Module Federation"],
            "secondary_skills": ["Node.js", "Python", "FastAPI", "Tailwind CSS", "Docker", "Supabase", "AWS", "GCP"],
            "experience_history": [
                {
                    "company": "Enterprise Tech Solutions",
                    "role": "Lead Frontend Architect",
                    "period": "2021 - Present",
                    "highlights": [
                        "Architected large-scale Micro Frontend platform serving 5M+ monthly active users with Module Federation.",
                        "Spearheaded UI design system adoption across 14 engineering pods, cutting time-to-market by 35%."
                    ]
                }
            ],
            "education_history": [
                {
                    "degree": "Bachelor of Engineering in Computer Science & Engineering",
                    "institution": "Anna University",
                    "period": "2007 - 2011"
                }
            ],
            "certifications": [{"name": "AWS Certified Solutions Architect", "year": "2023"}],
            "portfolio_urls": {"github": "https://github.com/sakthipet11", "portfolio": "https://sathya-ai.studio"},
            "answers_to_common_questions": {"require_sponsorship": "No / Yes depending on location", "willing_to_relocate": "Yes"}
        }

        self._mock_settings = {
            "id": "00000000-0000-0000-0000-000000000002",
            "user_profile_id": "00000000-0000-0000-0000-000000000001",
            "daily_application_limit": 10,
            "min_ats_score_threshold": 80.0,
            "auto_apply_enabled": False,
            "require_human_review_for_apply": True,
            "require_human_review_for_email": True,
            "target_titles": ["Lead Frontend Architect", "Principal UI Platform Engineer", "Staff Micro Frontend Architect"],
            "target_locations": ["Remote", "Hybrid", "Bangalore", "US Remote"],
            "blacklisted_companies": ["Revature", "CyberCoders"],
            "blacklisted_keywords": ["Unpaid", "Volunteer", "Junior Intern"],
            "is_active": True
        }

        self._mock_audit_logs: List[Dict[str, Any]] = []

    def is_configured(self) -> bool:
        return self.client is not None

    # =========================================================================
    # Phase 1: Candidate Truth Store & Settings
    # =========================================================================
    def get_user_profile(self) -> Dict[str, Any]:
        if self.client:
            try:
                res = self.client.table("user_profile").select("*").limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Error fetching user profile from Supabase: {e}")
        return self._mock_profile

    def update_user_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        profile_data["updated_at"] = datetime.utcnow().isoformat()
        if self.client:
            try:
                # Upsert profile record
                existing = self.get_user_profile()
                target_id = existing.get("id") or self._mock_profile["id"]
                profile_data["id"] = target_id
                res = self.client.table("user_profile").upsert(profile_data).execute()
                return {"status": "success", "data": res.data[0] if res.data else profile_data}
            except Exception as e:
                print(f"Error updating user profile in Supabase: {e}")
                return {"status": "error", "message": str(e)}
        self._mock_profile.update(profile_data)
        return {"status": "mock_success", "data": self._mock_profile}

    def get_automation_settings(self) -> Dict[str, Any]:
        if self.client:
            try:
                res = self.client.table("automation_settings").select("*").limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Error fetching automation settings from Supabase: {e}")
        return self._mock_settings

    def update_automation_settings(self, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        settings_data["updated_at"] = datetime.utcnow().isoformat()
        if self.client:
            try:
                existing = self.get_automation_settings()
                target_id = existing.get("id") or self._mock_settings["id"]
                settings_data["id"] = target_id
                res = self.client.table("automation_settings").upsert(settings_data).execute()
                return {"status": "success", "data": res.data[0] if res.data else settings_data}
            except Exception as e:
                print(f"Error updating automation settings in Supabase: {e}")
                return {"status": "error", "message": str(e)}
        self._mock_settings.update(settings_data)
        return {"status": "mock_success", "data": self._mock_settings}

    # =========================================================================
    # Phase 1: Audit Logging Vault
    # =========================================================================
    def insert_audit_log(self, actor_type: str, actor_id: str, action: str, entity_type: str, entity_id: str, before_state: Dict[str, Any] = None, after_state: Dict[str, Any] = None, justification: str = None, ip_address: str = None) -> Dict[str, Any]:
        payload = {
            "actor_type": actor_type,
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "before_state": before_state or {},
            "after_state": after_state or {},
            "justification_rationale": justification or "",
            "ip_address": ip_address or "127.0.0.1",
            "timestamp": datetime.utcnow().isoformat()
        }
        if self.client:
            try:
                res = self.client.table("audit_logs").insert(payload).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error persisting audit log to Supabase: {e}")
        self._mock_audit_logs.insert(0, payload)
        return {"status": "mock_success", "data": payload}

    def get_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        if self.client:
            try:
                res = self.client.table("audit_logs").select("*").order("timestamp", desc=True).limit(limit).execute()
                return res.data
            except Exception as e:
                print(f"Error fetching audit logs: {e}")
        return self._mock_audit_logs[:limit]

    # =========================================================================
    # Core Portfolio & Contacts (Existing)
    # =========================================================================
    def insert_contact(self, name: str, email: str, message: str, company: str = "", budget: str = "", purpose: str = "") -> Dict[str, Any]:
        payload = {
            "name": name,
            "email": email,
            "message": message,
            "company": company,
            "budget": budget,
            "purpose": purpose
        }
        if self.client:
            try:
                res = self.client.table("contacts").insert(payload).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error inserting contact into Supabase: {e}")
                return {"status": "error", "message": str(e), "data": payload}
        return {"status": "mock_success", "message": "Saved locally in offline mode", "data": payload}

    def insert_visitor_event(self, session_id: str, event_type: str, details: Dict[str, Any] = None, country: str = None, city: str = None, browser: str = None, os_name: str = None) -> Dict[str, Any]:
        payload = {
            "session_id": session_id,
            "event_type": event_type,
            "event_details": details or {},
            "country": country or "Unknown",
            "city": city or "Unknown",
            "browser": browser or "Unknown",
            "os": os_name or "Unknown"
        }
        if self.client:
            try:
                res = self.client.table("visitor_events").insert(payload).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error inserting visitor event: {e}")
                return {"status": "error", "message": str(e), "data": payload}
        return {"status": "mock_success", "message": "Saved event locally in offline mode", "data": payload}

    def upsert_chat_session(self, session_id: str, status: str = "ai_twin", visitor_info: Dict[str, Any] = None) -> Dict[str, Any]:
        payload = {
            "id": session_id,
            "status": status,
            "visitor_info": visitor_info or {}
        }
        if self.client:
            try:
                res = self.client.table("chat_sessions").upsert(payload).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error upserting chat session: {e}")
                return {"status": "error", "message": str(e), "data": payload}
        return {"status": "mock_success", "message": "Saved session locally in offline mode", "data": payload}

    def insert_chat_message(self, session_id: str, role: str, content: str) -> Dict[str, Any]:
        payload = {
            "session_id": session_id,
            "role": role,
            "content": content
        }
        if self.client:
            try:
                self.upsert_chat_session(session_id)
                res = self.client.table("chat_messages").insert(payload).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error inserting chat message: {e}")
                return {"status": "error", "message": str(e), "data": payload}
        return {"status": "mock_success", "message": "Saved message locally in offline mode", "data": payload}

    def get_portfolio_content(self, table_name: str) -> List[Dict[str, Any]]:
        if self.client:
            try:
                res = self.client.table(table_name).select("*").order("display_order").execute()
                return res.data
            except Exception as e:
                print(f"Error reading {table_name} from Supabase: {e}")
                return []
        return []

    def get_analytics_summary(self) -> Dict[str, Any]:
        if not self.client:
            return {
                "total_page_views": 128,
                "total_resume_downloads": 42,
                "total_contacts": 12,
                "total_chat_sessions": 24,
                "recent_views_chart": [
                    {"date": "Mon", "views": 25},
                    {"date": "Tue", "views": 32},
                    {"date": "Wed", "views": 21},
                    {"date": "Thu", "views": 45},
                    {"date": "Fri", "views": 30},
                    {"date": "Sat", "views": 15},
                    {"date": "Sun", "views": 18}
                ]
            }

        try:
            views_res = self.client.table("visitor_events").select("id", count="exact").eq("event_type", "page_view").execute()
            downloads_res = self.client.table("visitor_events").select("id", count="exact").eq("event_type", "resume_download").execute()
            contacts_res = self.client.table("contacts").select("id", count="exact").execute()
            chats_res = self.client.table("chat_sessions").select("id", count="exact").execute()

            events = self.client.table("visitor_events").select("created_at").order("created_at", desc=True).limit(50).execute().data
            chart_data = [{"date": "Today", "views": len(events)}]

            return {
                "total_page_views": views_res.count or 0,
                "total_resume_downloads": downloads_res.count or 0,
                "total_contacts": contacts_res.count or 0,
                "total_chat_sessions": chats_res.count or 0,
                "recent_views_chart": chart_data
            }
        except Exception as e:
            print(f"Error fetching analytics summary: {e}")
            return {
                "total_page_views": 0,
                "total_resume_downloads": 0,
                "total_contacts": 0,
                "total_chat_sessions": 0,
                "recent_views_chart": []
            }

    def get_contacts(self) -> List[Dict[str, Any]]:
        if self.client:
            try:
                res = self.client.table("contacts").select("*").order("created_at", desc=True).execute()
                return res.data
            except Exception as e:
                print(f"Error fetching contacts: {e}")
                return []
        return []

    def get_chat_sessions(self) -> List[Dict[str, Any]]:
        if self.client:
            try:
                res = self.client.table("chat_sessions").select("*").order("created_at", desc=True).execute()
                return res.data
            except Exception as e:
                print(f"Error fetching chat sessions: {e}")
                return []
        return []

    def get_chat_messages(self, session_id: str) -> List[Dict[str, Any]]:
        if self.client:
            try:
                res = self.client.table("chat_messages").select("*").eq("session_id", session_id).order("timestamp", desc=False).execute()
                return res.data
            except Exception as e:
                print(f"Error fetching chat messages: {e}")
                return []
        return []

    def upsert_portfolio_item(self, table_name: str, item: Dict[str, Any]) -> Dict[str, Any]:
        allowed = {"skills", "experience", "projects", "education", "certificates"}
        if table_name not in allowed:
            return {"status": "error", "message": f"Table '{table_name}' not allowed"}

        if self.client:
            try:
                res = self.client.table(table_name).upsert(item).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error upserting portfolio item into {table_name}: {e}")
                return {"status": "error", "message": str(e)}
        return {"status": "mock_success", "message": "CMS update mocked", "data": item}

    def delete_portfolio_item(self, table_name: str, item_id: int) -> Dict[str, Any]:
        allowed = {"skills", "experience", "projects", "education", "certificates"}
        if table_name not in allowed:
            return {"status": "error", "message": f"Table '{table_name}' not allowed"}

        if self.client:
            try:
                res = self.client.table(table_name).delete().eq("id", item_id).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error deleting from {table_name}: {e}")
                return {"status": "error", "message": str(e)}
        return {"status": "mock_success", "message": "CMS delete mocked"}

    def delete_chat_session(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        if self.client:
            try:
                if session_id:
                    res = self.client.table("chat_sessions").delete().eq("id", session_id).execute()
                    return {"status": "success", "message": f"Deleted session {session_id}"}
                else:
                    res = self.client.table("chat_sessions").delete().neq("id", "keep_all").execute()
                    return {"status": "success", "message": "Cleared all chat sessions"}
            except Exception as e:
                print(f"Error deleting chat session(s): {e}")
                return {"status": "error", "message": str(e)}
        return {"status": "mock_success", "message": "Mock session deleted"}

db_helper = SupabaseHelper()
