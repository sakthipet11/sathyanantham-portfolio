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
        if SUPABASE_URL and SUPABASE_KEY and callable(create_client):
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
            "email": "v.sathyanantham@gmail.com",
            "phone": "+91 8870956756",
            "location": "Coimbatore, Tamil Nadu, India (Open to Remote / Relocation)",
            "work_authorization": "Authorized in India; Open to Global Sponsorship & Remote",
            "years_of_experience": 13.0,
            "notice_period_days": 30,
            "current_salary": 0.0,
            "expected_salary_min": 140000.0,
            "primary_skills": ["React", "TypeScript", "Micro Frontends", "Next.js", "Module Federation", "Claude Skills", "IBM AI"],
            "secondary_skills": ["Node.js", "Python", "FastAPI", "Spring Boot", "Tailwind CSS", "Docker", "Supabase", "PostgreSQL", "MongoDB"],
            "experience_history": [
                {
                    "company": "Nextuple Inc.",
                    "role": "Lead Software Engineer",
                    "period": "Aug 2023 - Present",
                    "highlights": [
                        "Leading 8 engineers across frontend and backend, establishing engineering standards and architecture.",
                        "Delivered Micro Frontend Architecture with Module Federation across 15+ modules and OMS platforms.",
                        "Pioneered Claude Skills Initiative, reducing common engineering effort from ~20 days to 5 days."
                    ]
                },
                {
                    "company": "Cognizant Technology Solutions",
                    "role": "Senior Associate",
                    "period": "Nov 2018 - Aug 2022",
                    "highlights": [
                        "Architected 30+ global responsive digital platforms for Bayer and US Bank authentication portal."
                    ]
                },
                {
                    "company": "Skava Systems (Infosys)",
                    "role": "Dev Lead",
                    "period": "July 2012 - Nov 2018",
                    "highlights": [
                        "Led Kohl's Omnichannel Mobile & Tablet platforms (m.kohls.com), Toys'R'Us, Adidas, Reebok, and Kraft Foods."
                    ]
                }
            ],
            "education_history": [
                {
                    "degree": "Master of Computer Applications (MCA)",
                    "institution": "Dr. Mahalingam College of Engineering and Technology, Pollachi",
                    "period": "2009 - 2012",
                    "score": "8.28 CGPA / 82.8%"
                },
                {
                    "degree": "Bachelor of Science in Computer Science (B.Sc CS)",
                    "institution": "Nallamuthu Gounder Mahalingam College, Pollachi",
                    "period": "2006 - 2009",
                    "score": "78.51%"
                }
            ],
            "certifications": [{"name": "Introduction to Agent Skills (Claude Certificate)", "year": "2024"}],
            "portfolio_urls": {"github": "https://github.com/sakthipet11", "linkedin": "https://www.linkedin.com/in/sathyanantham-v-646b911b"},
            "answers_to_common_questions": {"require_sponsorship": "No / Open depending on location", "willing_to_relocate": "Yes"}
        }

        self._mock_settings = {
            "id": "00000000-0000-0000-0000-000000000002",
            "user_profile_id": "00000000-0000-0000-0000-000000000001",
            "daily_application_limit": 10,
            "min_ats_score_threshold": 80.0,
            "auto_apply_enabled": False,
            "require_human_review_for_apply": True,
            "require_human_review_for_email": True,
            "target_titles": ["Lead Software Engineer", "Frontend Architect", "Lead Full Stack Engineer", "Principal UI Engineer"],
            "target_locations": ["Remote", "Coimbatore", "Bangalore", "Hybrid", "US Remote"],
            "blacklisted_companies": ["Revature", "CyberCoders"],
            "blacklisted_keywords": ["Unpaid", "Volunteer", "Junior Intern"],
            "is_active": True
        }

        self._mock_audit_logs: List[Dict[str, Any]] = []
        self._mock_chat_sessions: Dict[str, Dict[str, Any]] = {}
        self._mock_chat_messages: Dict[str, List[Dict[str, Any]]] = {}

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
        now_str = datetime.utcnow().isoformat()
        payload = {
            "id": session_id,
            "status": status,
            "visitor_info": visitor_info or {},
            "updated_at": now_str
        }

        # Keep in-memory mock store updated
        if session_id not in self._mock_chat_sessions:
            payload["created_at"] = now_str
            payload["visitor_id"] = (visitor_info or {}).get("name") or f"Visitor ({session_id[:8]})"
            payload["last_message"] = "Session initiated"
            self._mock_chat_sessions[session_id] = payload
        else:
            self._mock_chat_sessions[session_id].update(payload)

        if self.client:
            try:
                res = self.client.table("chat_sessions").upsert(payload).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error upserting chat session: {e}")
                return {"status": "error", "message": str(e), "data": payload}
        return {"status": "mock_success", "message": "Saved session locally in offline mode", "data": payload}

    def insert_chat_message(self, session_id: str, role: str, content: str) -> Dict[str, Any]:
        now_str = datetime.utcnow().isoformat()
        payload = {
            "id": f"msg-{datetime.utcnow().timestamp()}",
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": now_str
        }

        # Keep in-memory message store updated
        if session_id not in self._mock_chat_messages:
            self._mock_chat_messages[session_id] = []
        self._mock_chat_messages[session_id].append(payload)

        # Update parent chat session
        self.upsert_chat_session(session_id)
        if session_id in self._mock_chat_sessions:
            self._mock_chat_sessions[session_id]["last_message"] = content
            self._mock_chat_sessions[session_id]["updated_at"] = now_str

        if self.client:
            try:
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
                "total_chat_sessions": len(self._mock_chat_sessions) or 24,
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
                "total_chat_sessions": chats_res.count or len(self._mock_chat_sessions),
                "recent_views_chart": chart_data
            }
        except Exception as e:
            print(f"Error fetching analytics summary: {e}")
            return {
                "total_page_views": 0,
                "total_resume_downloads": 0,
                "total_contacts": 0,
                "total_chat_sessions": len(self._mock_chat_sessions),
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
                res = self.client.table("chat_sessions").select("*").order("updated_at", desc=True).execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                print(f"Error fetching chat sessions: {e}")
        sessions_list = list(self._mock_chat_sessions.values())
        sessions_list.sort(key=lambda s: s.get("updated_at", ""), reverse=True)
        return sessions_list

    def get_chat_messages(self, session_id: str) -> List[Dict[str, Any]]:
        if self.client:
            try:
                res = self.client.table("chat_messages").select("*").eq("session_id", session_id).order("timestamp", desc=False).execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                print(f"Error fetching chat messages: {e}")
        return self._mock_chat_messages.get(session_id, [])

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
