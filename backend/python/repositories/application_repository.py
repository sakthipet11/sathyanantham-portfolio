import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.supabase_repo import db_helper

class ApplicationRepository:
    def __init__(self):
        self.db = db_helper
        self._in_memory_apps: Dict[str, Dict[str, Any]] = {}
        self._in_memory_events: List[Dict[str, Any]] = []

    def get_application_by_idempotency_key(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("applications").select("*").eq("idempotency_key", idempotency_key).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[APP_REPO] Error querying application by idempotency key: {e}")
        
        for app in self._in_memory_apps.values():
            if app.get("idempotency_key") == idempotency_key:
                return app
        return None

    def get_application_by_id(self, application_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("applications").select("*").eq("id", application_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[APP_REPO] Error fetching application {application_id}: {e}")
        return self._in_memory_apps.get(application_id)

    def get_application_by_job_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("applications").select("*").eq("job_id", job_id).order("created_at", desc=True).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[APP_REPO] Error fetching application by job_id: {e}")
        for app in self._in_memory_apps.values():
            if app.get("job_id") == job_id:
                return app
        return None

    def save_application(self, app_data: Dict[str, Any]) -> Dict[str, Any]:
        app_data["updated_at"] = datetime.utcnow().isoformat()
        if not app_data.get("created_at"):
            app_data["created_at"] = datetime.utcnow().isoformat()

        app_id = app_data.get("id") or f"app-{hashlib.md5((app_data.get('idempotency_key') or str(datetime.utcnow().timestamp())).encode()).hexdigest()[:12]}"
        app_data["id"] = app_id

        if self.db.client:
            try:
                res = self.db.client.table("applications").upsert(app_data, on_conflict="idempotency_key").execute()
                if res.data and len(res.data) > 0:
                    saved = res.data[0]
                    self._in_memory_apps[saved["id"]] = saved
                    return saved
            except Exception as e:
                print(f"[APP_REPO] Error saving application to Supabase: {e}")

        self._in_memory_apps[app_id] = app_data
        return app_data

    def update_application_status(self, app_id: str, status: str, manual_reason: Optional[str] = None, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        update_fields: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        if manual_reason:
            update_fields["manual_reason"] = manual_reason
        if notes:
            update_fields["human_reviewer_notes"] = notes
        if status == "SUBMITTED":
            update_fields["submitted_at"] = datetime.utcnow().isoformat()

        if self.db.client:
            try:
                res = self.db.client.table("applications").update(update_fields).eq("id", app_id).execute()
                if res.data and len(res.data) > 0:
                    self._in_memory_apps[app_id] = res.data[0]
                    return res.data[0]
            except Exception as e:
                print(f"[APP_REPO] Error updating app status: {e}")

        if app_id in self._in_memory_apps:
            self._in_memory_apps[app_id].update(update_fields)
            return self._in_memory_apps[app_id]
        return None

    def log_event(self, application_id: str, event_type: str, message: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        event_data = {
            "id": f"evt-{hashlib.md5((application_id + event_type + str(datetime.utcnow().timestamp())).encode()).hexdigest()[:12]}",
            "application_id": application_id,
            "event_type": event_type,
            "message": message,
            "payload": payload or {},
            "created_at": datetime.utcnow().isoformat()
        }
        if self.db.client:
            try:
                self.db.client.table("application_events").insert(event_data).execute()
            except Exception as e:
                print(f"[APP_REPO] Error logging application event to Supabase: {e}")

        self._in_memory_events.append(event_data)
        return event_data

    def get_events_for_application(self, application_id: str) -> List[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("application_events").select("*").eq("application_id", application_id).order("created_at", desc=False).execute()
                if res.data:
                    return res.data
            except Exception as e:
                print(f"[APP_REPO] Error getting events: {e}")
        return [e for e in self._in_memory_events if e.get("application_id") == application_id]

    def list_applications(self, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        all_apps: List[Dict[str, Any]] = []
        if self.db.client:
            try:
                query = self.db.client.table("applications").select("*").order("created_at", desc=True).limit(limit)
                if status and status != "ALL":
                    query = query.eq("status", status)
                res = query.execute()
                all_apps = res.data or []
            except Exception as e:
                print(f"[APP_REPO] Error listing applications from Supabase: {e}")
                all_apps = list(self._in_memory_apps.values())
        else:
            all_apps = list(self._in_memory_apps.values())

        if status and status != "ALL" and not self.db.client:
            all_apps = [a for a in all_apps if a.get("status") == status]

        return all_apps[:limit]

    def get_application_metrics(self) -> Dict[str, Any]:
        apps = list(self._in_memory_apps.values())
        if self.db.client:
            try:
                res = self.db.client.table("applications").select("id, status, created_at").execute()
                if res.data:
                    apps = res.data
            except Exception:
                pass

        total = len(apps)
        ready_for_review = sum(1 for a in apps if a.get("status") == "READY_FOR_REVIEW")
        approved = sum(1 for a in apps if a.get("status") == "APPROVED")
        submitted = sum(1 for a in apps if a.get("status") == "SUBMITTED")
        manual_required = sum(1 for a in apps if a.get("status") == "MANUAL_REQUIRED")
        failed = sum(1 for a in apps if a.get("status") == "FAILED")
        
        success_rate = round((submitted / max(submitted + failed, 1)) * 100, 1) if (submitted + failed) > 0 else 100.0

        return {
            "total_applications": total,
            "ready_for_review": ready_for_review,
            "approved": approved,
            "submitted": submitted,
            "manual_required": manual_required,
            "failed": failed,
            "success_rate": success_rate
        }

application_repository = ApplicationRepository()
