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

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY", os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", ""))))
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/postgres")

class SupabaseHelper:
    def __init__(self):
        self.client: Optional[Client] = None
        self.pg_url: str = DATABASE_URL
        
        # 1. Try Supabase Client
        if SUPABASE_URL and SUPABASE_KEY and callable(create_client) and not SUPABASE_URL.startswith("http://127.0.0.1"):
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

        # 2. Check direct PostgreSQL availability
        if not self.client and psycopg2:
            try:
                conn = psycopg2.connect(self.pg_url, connect_timeout=3)
                conn.close()
                print(f"Direct PostgreSQL database connection active on {self.pg_url}.")
            except Exception as e:
                print(f"Direct PostgreSQL connection notice: {e}")

        # Baseline fallback data structure for uninitialized DB state
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
            "min_ats_score_threshold": 75.0,
            "profile_ats_threshold": 75.0,
            "jd_match_threshold": 50.0,
            "auto_apply_enabled": False,
            "require_human_review_for_apply": True,
            "require_human_review_for_email": True,
            "target_titles": ["Lead Frontend Architect", "Principal UI Platform Engineer", "Senior UI Developer", "React Developer", "AI Engineer"],
            "target_roles": ["Senior UI Developer", "React Developer", "Lead Software Engineer", "AI Engineer"],
            "target_locations": ["Coimbatore", "Bangalore", "Chennai", "India", "Remote"],
            "remote_preference": "Local + Remote",
            "experience_levels": ["Senior", "Lead"],
            "employment_types": ["Full-time", "Contract"],
            "job_recency_hours": 24,
            "daily_schedule_time": "08:00 AM IST",
            "blacklisted_companies": ["Revature", "CyberCoders"],
            "blacklisted_keywords": ["Unpaid", "Volunteer", "Junior Intern"],
            "is_active": True,
            "gdrive_folder_url": "https://drive.google.com/drive/u/1/folders/1AtZo2n7TYsavZrw6cG1quek3je0K3hkO",
            "gdrive_folder_id": "1AtZo2n7TYsavZrw6cG1quek3je0K3hkO",
            "gdrive_sync_enabled": True,
            "gdrive_sync_schedule_time": "07:00 AM IST",
            "gdrive_sync_frequency": "DAILY",
            "gdrive_sync_last_run": None,
            "gdrive_sync_last_status": "IDLE",
            "gdrive_sync_last_file": f"job_tracker_{datetime.now().strftime('%Y-%m-%d')}.xlsx",
            "gdrive_sync_last_jobs_count": 0
        }

        self._mock_audit_logs: List[Dict[str, Any]] = []
        self._mock_chat_sessions: Dict[str, Dict[str, Any]] = {}
        self._mock_chat_messages: Dict[str, List[Dict[str, Any]]] = {}

    def _get_pg_connection(self):
        if not psycopg2:
            return None
        try:
            conn = psycopg2.connect(self.pg_url, connect_timeout=3)
            return conn
        except Exception as e:
            return None

    def is_configured(self) -> bool:
        return self.client is not None or self._get_pg_connection() is not None

    # =========================================================================
    # Candidate Truth Store & Settings
    # =========================================================================
    def get_user_profile(self) -> Dict[str, Any]:
        if self.client:
            try:
                res = self.client.table("user_profile").select("*").limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Error fetching user profile from Supabase: {e}")
        
        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM user_profile LIMIT 1;")
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"PostgreSQL user profile query error: {e}")
            finally:
                pg_conn.close()

        return self._mock_profile

    def update_user_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        profile_data["updated_at"] = datetime.utcnow().isoformat()
        if self.client:
            try:
                existing = self.get_user_profile()
                target_id = existing.get("id") or self._mock_profile["id"]
                profile_data["id"] = target_id
                res = self.client.table("user_profile").upsert(profile_data).execute()
                return {"status": "success", "data": res.data[0] if res.data else profile_data}
            except Exception as e:
                print(f"Error updating user profile in Supabase: {e}")
                return {"status": "error", "message": str(e)}

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                existing = self.get_user_profile()
                target_id = existing.get("id") or self._mock_profile["id"]
                profile_data["id"] = target_id
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO user_profile (id, full_name, email, phone, location, years_of_experience, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            full_name = EXCLUDED.full_name,
                            email = EXCLUDED.email,
                            phone = EXCLUDED.phone,
                            location = EXCLUDED.location,
                            years_of_experience = EXCLUDED.years_of_experience,
                            updated_at = NOW()
                        RETURNING *;
                    """, (
                        target_id,
                        profile_data.get("full_name"),
                        profile_data.get("email"),
                        profile_data.get("phone"),
                        profile_data.get("location"),
                        profile_data.get("years_of_experience", 13.0)
                    ))
                    row = cur.fetchone()
                    return {"status": "success", "data": dict(row) if row else profile_data}
            except Exception as e:
                print(f"PostgreSQL profile update error: {e}")
            finally:
                pg_conn.close()

        self._mock_profile.update(profile_data)
        return {"status": "mock_success", "data": self._mock_profile}

    def get_automation_settings(self) -> Dict[str, Any]:
        merged_settings = dict(self._mock_settings)
        if self.client:
            try:
                res = self.client.table("automation_settings").select("*").limit(1).execute()
                if res.data and len(res.data) > 0:
                    merged_settings.update(res.data[0])
                    return merged_settings
            except Exception as e:
                print(f"Error fetching automation settings from Supabase: {e}")

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM automation_settings LIMIT 1;")
                    row = cur.fetchone()
                    if row:
                        merged_settings.update(dict(row))
                        return merged_settings
            except Exception as e:
                print(f"PostgreSQL automation settings query error: {e}")
            finally:
                pg_conn.close()

        return merged_settings

    def update_automation_settings(self, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        settings_data["updated_at"] = datetime.utcnow().isoformat()
        if self.client:
            try:
                existing = self.get_automation_settings()
                target_id = existing.get("id") or self._mock_settings["id"]
                settings_data["id"] = target_id
                res = self.client.table("automation_settings").upsert(settings_data).execute()
                saved = res.data[0] if res.data else settings_data
                self._mock_settings.update(saved)
                return {"status": "success", "data": saved}
            except Exception as e:
                print(f"Error updating automation settings in Supabase: {e}")

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                existing = self.get_automation_settings()
                target_id = existing.get("id") or self._mock_settings["id"]
                settings_data["id"] = target_id
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO automation_settings (
                            id, user_profile_id, daily_application_limit, min_ats_score_threshold,
                            profile_ats_threshold, jd_match_threshold, auto_apply_enabled,
                            require_human_review_for_apply, require_human_review_for_email,
                            target_titles, target_roles, target_locations, remote_preference,
                            experience_levels, employment_types, job_recency_hours, daily_schedule_time,
                            blacklisted_companies, blacklisted_keywords, is_active, updated_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            min_ats_score_threshold = COALESCE(EXCLUDED.min_ats_score_threshold, automation_settings.min_ats_score_threshold),
                            profile_ats_threshold = COALESCE(EXCLUDED.profile_ats_threshold, automation_settings.profile_ats_threshold),
                            jd_match_threshold = COALESCE(EXCLUDED.jd_match_threshold, automation_settings.jd_match_threshold),
                            daily_application_limit = COALESCE(EXCLUDED.daily_application_limit, automation_settings.daily_application_limit),
                            auto_apply_enabled = COALESCE(EXCLUDED.auto_apply_enabled, automation_settings.auto_apply_enabled),
                            target_titles = COALESCE(EXCLUDED.target_titles, automation_settings.target_titles),
                            target_roles = COALESCE(EXCLUDED.target_roles, automation_settings.target_roles),
                            target_locations = COALESCE(EXCLUDED.target_locations, automation_settings.target_locations),
                            remote_preference = COALESCE(EXCLUDED.remote_preference, automation_settings.remote_preference),
                            experience_levels = COALESCE(EXCLUDED.experience_levels, automation_settings.experience_levels),
                            employment_types = COALESCE(EXCLUDED.employment_types, automation_settings.employment_types),
                            job_recency_hours = COALESCE(EXCLUDED.job_recency_hours, automation_settings.job_recency_hours),
                            daily_schedule_time = COALESCE(EXCLUDED.daily_schedule_time, automation_settings.daily_schedule_time),
                            blacklisted_companies = COALESCE(EXCLUDED.blacklisted_companies, automation_settings.blacklisted_companies),
                            blacklisted_keywords = COALESCE(EXCLUDED.blacklisted_keywords, automation_settings.blacklisted_keywords),
                            is_active = COALESCE(EXCLUDED.is_active, automation_settings.is_active),
                            updated_at = NOW()
                        RETURNING *;
                    """, (
                        target_id,
                        settings_data.get("user_profile_id", "00000000-0000-0000-0000-000000000001"),
                        settings_data.get("daily_application_limit", 10),
                        settings_data.get("min_ats_score_threshold", settings_data.get("profile_ats_threshold", 75.0)),
                        settings_data.get("profile_ats_threshold", 75.0),
                        settings_data.get("jd_match_threshold", 50.0),
                        settings_data.get("auto_apply_enabled", False),
                        settings_data.get("require_human_review_for_apply", True),
                        settings_data.get("require_human_review_for_email", True),
                        settings_data.get("target_titles", ["Senior UI Developer", "React Developer", "Lead Software Engineer", "AI Engineer"]),
                        settings_data.get("target_roles", ["Senior UI Developer", "React Developer", "Lead Software Engineer", "AI Engineer"]),
                        settings_data.get("target_locations", ["Coimbatore", "Bangalore", "Chennai", "India", "Remote"]),
                        settings_data.get("remote_preference", "Local + Remote"),
                        settings_data.get("experience_levels", ["Senior", "Lead"]),
                        settings_data.get("employment_types", ["Full-time", "Contract"]),
                        settings_data.get("job_recency_hours", 24),
                        settings_data.get("daily_schedule_time", "08:00 AM IST"),
                        settings_data.get("blacklisted_companies", []),
                        settings_data.get("blacklisted_keywords", []),
                        settings_data.get("is_active", True)
                    ))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        saved = dict(row)
                        saved.update(settings_data)
                        self._mock_settings.update(saved)
                        return {"status": "success", "data": self._mock_settings}
            except Exception as e:
                print(f"PostgreSQL settings update error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        self._mock_settings.update(settings_data)
        return {"status": "mock_success", "data": self._mock_settings}

    # =========================================================================
    # Audit Logging Vault
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

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, justification_rationale, ip_address)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *;
                    """, (
                        actor_type, actor_id, action, entity_type, str(entity_id),
                        json.dumps(before_state or {}, default=str), json.dumps(after_state or {}, default=str),
                        justification or "", ip_address or "127.0.0.1"
                    ))
                    row = cur.fetchone()
                    return {"status": "success", "data": dict(row) if row else payload}
            except Exception as e:
                print(f"PostgreSQL audit log insert error: {e}")
            finally:
                pg_conn.close()

        self._mock_audit_logs.insert(0, payload)
        return {"status": "mock_success", "data": payload}

    def get_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        if self.client:
            try:
                res = self.client.table("audit_logs").select("*").order("timestamp", desc=True).limit(limit).execute()
                return res.data
            except Exception as e:
                print(f"Error fetching audit logs: {e}")

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT %s;", (limit,))
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
            except Exception as e:
                print(f"PostgreSQL audit logs query error: {e}")
            finally:
                pg_conn.close()

        return self._mock_audit_logs[:limit]

    # =========================================================================
    # Portfolio & Contacts
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

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO contacts (name, email, message, company, budget, purpose)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING *;
                    """, (name, email, message, company, budget, purpose))
                    row = cur.fetchone()
                    return {"status": "success", "data": dict(row) if row else payload}
            except Exception as e:
                print(f"PostgreSQL insert contact error: {e}")
            finally:
                pg_conn.close()

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

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO visitor_events (session_id, event_type, event_details, country, city, browser, os)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING *;
                    """, (session_id, event_type, json.dumps(details or {}), country or "Unknown", city or "Unknown", browser or "Unknown", os_name or "Unknown"))
                    row = cur.fetchone()
                    return {"status": "success", "data": dict(row) if row else payload}
            except Exception as e:
                print(f"PostgreSQL insert visitor event error: {e}")
            finally:
                pg_conn.close()

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

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO chat_sessions (id, status, visitor_info)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            status = EXCLUDED.status,
                            visitor_info = EXCLUDED.visitor_info
                        RETURNING *;
                    """, (session_id, status, json.dumps(visitor_info or {})))
                    row = cur.fetchone()
                    return {"status": "success", "data": dict(row) if row else payload}
            except Exception as e:
                print(f"PostgreSQL upsert chat session error: {e}")
            finally:
                pg_conn.close()

        return {"status": "mock_success", "message": "Saved session locally in offline mode", "data": payload}

    def insert_chat_message(self, session_id: str, role: str, content: str) -> Dict[str, Any]:
        # Always ensure the parent chat session exists first
        self.upsert_chat_session(session_id)

        now_str = datetime.utcnow().isoformat()
        payload = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": now_str
        }

        if self.client:
            try:
                res = self.client.table("chat_messages").insert(payload).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"Error inserting chat message: {e}")

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                self.upsert_chat_session(session_id)
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO chat_messages (session_id, role, content)
                        VALUES (%s, %s, %s)
                        RETURNING *;
                    """, (session_id, role, content))
                    row = cur.fetchone()
                    return {"status": "success", "data": dict(row) if row else payload}
            except Exception as e:
                print(f"PostgreSQL insert chat message error: {e}")
            finally:
                pg_conn.close()

        return {"status": "mock_success", "message": "Saved message locally in offline mode", "data": payload}

    def get_portfolio_content(self, table_name: str) -> List[Dict[str, Any]]:
        allowed = {"skills", "experience", "projects", "education", "certificates", "profiles"}
        if table_name not in allowed:
            return []

        if self.client:
            try:
                res = self.client.table(table_name).select("*").execute()
                return res.data
            except Exception as e:
                print(f"Error reading {table_name} from Supabase: {e}")

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    order_clause = " ORDER BY display_order ASC" if table_name in {"projects", "experience", "skills", "education", "certificates"} else ""
                    cur.execute(f"SELECT * FROM {table_name}{order_clause};")
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
            except Exception as e:
                print(f"PostgreSQL query error for {table_name}: {e}")
            finally:
                pg_conn.close()

        return []

    def get_analytics_summary(self) -> Dict[str, Any]:
        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM visitor_events WHERE event_type = 'page_view';")
                    views = cur.fetchone()[0]
                    cur.execute("SELECT COUNT(*) FROM visitor_events WHERE event_type = 'resume_download';")
                    downloads = cur.fetchone()[0]
                    cur.execute("SELECT COUNT(*) FROM contacts;")
                    contacts = cur.fetchone()[0]
                    cur.execute("SELECT COUNT(*) FROM chat_sessions;")
                    chats = cur.fetchone()[0]
                    return {
                        "total_page_views": views or 0,
                        "total_resume_downloads": downloads or 0,
                        "total_contacts": contacts or 0,
                        "total_chat_sessions": chats or 0,
                        "recent_views_chart": [{"date": "Today", "views": views or 0}]
                    }
            except Exception as e:
                print(f"PostgreSQL analytics summary error: {e}")
            finally:
                pg_conn.close()

        return {
            "total_page_views": 0,
            "total_resume_downloads": 0,
            "total_contacts": 0,
            "total_chat_sessions": 0,
            "recent_views_chart": []
        }

    def get_contacts(self) -> List[Dict[str, Any]]:
        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM contacts ORDER BY created_at DESC;")
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
            except Exception as e:
                print(f"PostgreSQL get contacts error: {e}")
            finally:
                pg_conn.close()
        return []

    def get_chat_sessions(self) -> List[Dict[str, Any]]:
        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM chat_sessions ORDER BY created_at DESC;")
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
            except Exception as e:
                print(f"PostgreSQL get chat sessions error: {e}")
            finally:
                pg_conn.close()
        return []

    def get_chat_messages(self, session_id: str) -> List[Dict[str, Any]]:
        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM chat_messages WHERE session_id = %s ORDER BY timestamp ASC;", (session_id,))
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
            except Exception as e:
                print(f"PostgreSQL get chat messages error: {e}")
            finally:
                pg_conn.close()
        return []

    def write_audit_log(self, actor_type: str, actor_id: str, action: str, entity_type: str, entity_id: str, before_state: Any = None, after_state: Any = None, justification: str = None) -> Dict[str, Any]:
        def safe_json(obj):
            if obj is None:
                return None
            try:
                if hasattr(obj, '__dict__'):
                    obj = dict(obj)
                return json.dumps(obj, default=str)
            except Exception:
                return json.dumps({"raw_repr": str(obj)})

        before_json = safe_json(before_state)
        after_json = safe_json(after_state)

        payload = {
            "actor_type": actor_type,
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id is not None else None,
            "before_state": before_json,
            "after_state": after_json,
            "justification_rationale": justification or f"Data lifecycle operation: {action}"
        }
        if self.client:
            try:
                res = self.client.table("audit_logs").insert(payload).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                print(f"[AUDIT_LOG] Supabase insert error: {e}")

        pg_conn = self._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, justification_rationale)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *;
                    """, (
                        actor_type,
                        actor_id,
                        action,
                        entity_type,
                        str(entity_id) if entity_id is not None else None,
                        before_json,
                        after_json,
                        justification or f"Data lifecycle operation: {action}"
                    ))
                    row = cur.fetchone()
                    return {"status": "success", "data": dict(row) if row else payload}
            except Exception as e:
                print(f"[AUDIT_LOG] PG insert error: {e}")
            finally:
                pg_conn.close()

        self._mock_audit_logs.append(payload)
        return {"status": "mock_success", "data": payload}

db_helper = SupabaseHelper()
