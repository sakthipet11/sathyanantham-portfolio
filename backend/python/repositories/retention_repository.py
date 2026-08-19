import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

VALID_PIPELINES = {"jobs", "applications", "resumes", "referrals", "emails"}

DEFAULT_POLICIES = {
    "jobs": {"pipeline": "jobs", "enabled": False, "retention_days": 10, "status_filter": None, "last_run_at": None, "next_run_at": None, "last_run_deleted_count": 0, "updated_by": "system"},
    "applications": {"pipeline": "applications", "enabled": False, "retention_days": 10, "status_filter": None, "last_run_at": None, "next_run_at": None, "last_run_deleted_count": 0, "updated_by": "system"},
    "resumes": {"pipeline": "resumes", "enabled": False, "retention_days": 10, "status_filter": None, "last_run_at": None, "next_run_at": None, "last_run_deleted_count": 0, "updated_by": "system"},
    "referrals": {"pipeline": "referrals", "enabled": False, "retention_days": 10, "status_filter": None, "last_run_at": None, "next_run_at": None, "last_run_deleted_count": 0, "updated_by": "system"},
    "emails": {"pipeline": "emails", "enabled": False, "retention_days": 10, "status_filter": None, "last_run_at": None, "next_run_at": None, "last_run_deleted_count": 0, "updated_by": "system"},
}

class RetentionRepository:
    def __init__(self):
        self.db = db_helper
        self._in_memory_policies: Dict[str, Dict[str, Any]] = dict(DEFAULT_POLICIES)

    def get_all_policies(self) -> List[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("retention_policies").select("*").execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                print(f"[RETENTION_REPO] Error querying retention_policies from Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM retention_policies ORDER BY pipeline ASC;")
                    rows = cur.fetchall()
                    if rows:
                        return [dict(r) for r in rows]
            except Exception as e:
                print(f"[RETENTION_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        return list(self._in_memory_policies.values())

    def get_policy(self, pipeline: str) -> Optional[Dict[str, Any]]:
        if pipeline not in VALID_PIPELINES:
            raise ValueError(f"Invalid pipeline: {pipeline}. Must be one of {VALID_PIPELINES}")

        if self.db.client:
            try:
                res = self.db.client.table("retention_policies").select("*").eq("pipeline", pipeline).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[RETENTION_REPO] Error fetching policy for {pipeline}: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM retention_policies WHERE pipeline = %s LIMIT 1;", (pipeline,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[RETENTION_REPO] PG fetch error for {pipeline}: {e}")
            finally:
                pg_conn.close()

        return self._in_memory_policies.get(pipeline)

    def update_policy(
        self,
        pipeline: str,
        enabled: bool,
        retention_days: int,
        status_filter: Optional[List[str]] = None,
        updated_by: str = "admin_user"
    ) -> Dict[str, Any]:
        if pipeline not in VALID_PIPELINES:
            raise ValueError(f"Invalid pipeline: {pipeline}")

        now_iso = datetime.now(timezone.utc).isoformat()
        next_run = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat() if enabled else None

        payload = {
            "pipeline": pipeline,
            "enabled": enabled,
            "retention_days": retention_days,
            "status_filter": status_filter,
            "updated_by": updated_by,
            "updated_at": now_iso
        }
        if enabled:
            payload["next_run_at"] = next_run
        else:
            payload["next_run_at"] = None

        if self.db.client:
            try:
                res = self.db.client.table("retention_policies").upsert(payload, on_conflict="pipeline").execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[RETENTION_REPO] Error updating policy via Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO retention_policies (pipeline, enabled, retention_days, status_filter, updated_by, next_run_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (pipeline) DO UPDATE SET
                            enabled = EXCLUDED.enabled,
                            retention_days = EXCLUDED.retention_days,
                            status_filter = EXCLUDED.status_filter,
                            updated_by = EXCLUDED.updated_by,
                            next_run_at = EXCLUDED.next_run_at,
                            updated_at = EXCLUDED.updated_at
                        RETURNING *;
                    """, (pipeline, enabled, retention_days, status_filter, updated_by, payload["next_run_at"], now_iso))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[RETENTION_REPO] PG upsert error: {e}")
            finally:
                pg_conn.close()

        # Fallback to in-memory
        curr = self._in_memory_policies.get(pipeline, {"pipeline": pipeline})
        curr.update(payload)
        self._in_memory_policies[pipeline] = curr
        return curr

    def set_enabled(self, pipeline: str, enabled: bool, updated_by: str = "admin_user") -> Dict[str, Any]:
        existing = self.get_policy(pipeline) or DEFAULT_POLICIES.get(pipeline, {})
        ret_days = existing.get("retention_days", 10)
        status_flt = existing.get("status_filter")
        return self.update_policy(pipeline, enabled, ret_days, status_flt, updated_by)

    def record_purge_run(self, pipeline: str, deleted_count: int) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        next_run = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        payload = {
            "last_run_at": now_iso,
            "next_run_at": next_run,
            "last_run_deleted_count": deleted_count,
            "updated_at": now_iso
        }

        if self.db.client:
            try:
                res = self.db.client.table("retention_policies").update(payload).eq("pipeline", pipeline).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[RETENTION_REPO] Error recording purge run via Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        UPDATE retention_policies
                        SET last_run_at = %s, next_run_at = %s, last_run_deleted_count = %s, updated_at = %s
                        WHERE pipeline = %s
                        RETURNING *;
                    """, (now_iso, next_run, deleted_count, now_iso, pipeline))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[RETENTION_REPO] PG update run stats error: {e}")
            finally:
                pg_conn.close()

        curr = self._in_memory_policies.get(pipeline, {"pipeline": pipeline})
        curr.update(payload)
        self._in_memory_policies[pipeline] = curr
        return curr

retention_repository = RetentionRepository()
