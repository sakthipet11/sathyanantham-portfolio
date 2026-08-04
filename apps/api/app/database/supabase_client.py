import os
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
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
                    # Workaround for newer Supabase key formats on Python 3.8 SDK versions
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

    def is_configured(self) -> bool:
        return self.client is not None

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

    # =========================================================================
    # ADMIN & CMS EXTENSIONS
    # =========================================================================

    def get_analytics_summary(self) -> Dict[str, Any]:
        """
        Gathers count stats and logs for the admin dashboard.
        """
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
            # Count records
            views_res = self.client.table("visitor_events").select("id", count="exact").eq("event_type", "page_view").execute()
            downloads_res = self.client.table("visitor_events").select("id", count="exact").eq("event_type", "resume_download").execute()
            contacts_res = self.client.table("contacts").select("id", count="exact").execute()
            chats_res = self.client.table("chat_sessions").select("id", count="exact").execute()

            # For daily chart: retrieve last 50 events
            events = self.client.table("visitor_events").select("created_at").order("created_at", desc=True).limit(50).execute().data
            
            # Simple day grouping for dashboard UI
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
        """
        Lists all visitor contact requests.
        """
        if self.client:
            try:
                res = self.client.table("contacts").select("*").order("created_at", desc=True).execute()
                return res.data
            except Exception as e:
                print(f"Error fetching contacts: {e}")
                return []
        return []

    def get_chat_sessions(self) -> List[Dict[str, Any]]:
        """
        Lists all chat sessions.
        """
        if self.client:
            try:
                res = self.client.table("chat_sessions").select("*").order("created_at", desc=True).execute()
                return res.data
            except Exception as e:
                print(f"Error fetching chat sessions: {e}")
                return []
        return []

    def get_chat_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all chat messages for a specific session.
        """
        if self.client:
            try:
                res = self.client.table("chat_messages").select("*").eq("session_id", session_id).order("timestamp", desc=False).execute()
                return res.data
            except Exception as e:
                print(f"Error fetching chat messages: {e}")
                return []
        return []

    def upsert_portfolio_item(self, table_name: str, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates or updates a portfolio item in the specified table (skills, experience, projects).
        """
        if self.client:
            try:
                res = self.client.table(table_name).upsert(item).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error upserting portfolio item into {table_name}: {e}")
                return {"status": "error", "message": str(e)}
        return {"status": "mock_success", "message": "CMS update mocked", "data": item}

    def delete_portfolio_item(self, table_name: str, item_id: int) -> Dict[str, Any]:
        """
        Deletes a portfolio item in the specified table.
        """
        if self.client:
            try:
                res = self.client.table(table_name).delete().eq("id", item_id).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error deleting from {table_name}: {e}")
                return {"status": "error", "message": str(e)}
        return {"status": "mock_success", "message": "CMS delete mocked"}

db_helper = SupabaseHelper()
