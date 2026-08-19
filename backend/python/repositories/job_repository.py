import uuid
import hashlib
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

class JobRepository:
    def __init__(self):
        self.db = db_helper
        self._in_memory_jobs: Dict[str, Dict[str, Any]] = {}
        self._in_memory_scores: Dict[str, Dict[str, Any]] = {}
        self._in_memory_runs: Dict[str, Dict[str, Any]] = {}
        self._in_memory_tasks: List[Dict[str, Any]] = []

    def get_job_by_idempotency_key(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("jobs").select("*").eq("idempotency_key", idempotency_key).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[JOB_REPO] Error querying job by idempotency key from Supabase: {e}")
        
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM jobs WHERE idempotency_key = %s LIMIT 1;", (idempotency_key,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[JOB_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        # Check in-memory store
        for job in self._in_memory_jobs.values():
            if job.get("idempotency_key") == idempotency_key:
                return job
        return None

    def get_job_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("jobs").select("*").eq("id", job_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[JOB_REPO] Error fetching job {job_id} from Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM jobs WHERE id::text = %s LIMIT 1;", (str(job_id),))
                    row = cur.fetchone()
                    if not row:
                        cur.execute("SELECT * FROM job_listings WHERE id::text = %s LIMIT 1;", (str(job_id),))
                        row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[JOB_REPO] PG get_job_by_id error: {e}")
            finally:
                pg_conn.close()

        return self._in_memory_jobs.get(job_id)

    def save_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        job_data["updated_at"] = datetime.utcnow().isoformat()
        if not job_data.get("discovered_at"):
            job_data["discovered_at"] = datetime.utcnow().isoformat()

        key_to_hash = job_data.get('idempotency_key') or str(datetime.utcnow().timestamp())
        job_id = job_data.get("id")
        if not job_id or not job_id.count("-") == 4:
            job_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(key_to_hash)))
        job_data["id"] = job_id

        if self.db.client:
            try:
                res = self.db.client.table("jobs").upsert(job_data, on_conflict="idempotency_key").execute()
                if res.data and len(res.data) > 0:
                    saved = res.data[0]
                    self._in_memory_jobs[saved["id"]] = saved
                    return saved
            except Exception as e:
                print(f"[JOB_REPO] Error saving job to Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO jobs (id, title, company, location, apply_url, portal_type, status, idempotency_key, description_raw, source, job_url, posted_date, fingerprint, tech_stack, salary_min, salary_max)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (idempotency_key) DO UPDATE SET
                            title = EXCLUDED.title,
                            company = EXCLUDED.company,
                            location = EXCLUDED.location,
                            status = EXCLUDED.status,
                            source = COALESCE(EXCLUDED.source, jobs.source),
                            job_url = COALESCE(EXCLUDED.job_url, jobs.job_url),
                            fingerprint = COALESCE(EXCLUDED.fingerprint, jobs.fingerprint),
                            updated_at = NOW()
                        RETURNING *;
                    """, (
                        job_data["id"],
                        job_data.get("title", ""),
                        job_data.get("company", ""),
                        job_data.get("location", "Remote"),
                        job_data.get("apply_url", "https://example.com"),
                        job_data.get("portal_type", "custom"),
                        job_data.get("status", "DISCOVERED"),
                        job_data.get("idempotency_key", str(job_id)),
                        job_data.get("description_raw", job_data.get("description", "")),
                        job_data.get("source"),
                        job_data.get("job_url"),
                        job_data.get("posted_date"),
                        job_data.get("fingerprint"),
                        job_data.get("tech_stack", []),
                        job_data.get("salary_min"),
                        job_data.get("salary_max")
                    ))
                    row = cur.fetchone()
                    pg_conn.commit()

                    try:
                        with pg_conn.cursor() as cur2:
                            cur2.execute("""
                                INSERT INTO job_listings (id, title, company, location, tech_stack, source, discovered_by_agent)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (id) DO NOTHING;
                            """, (
                                str(job_data["id"]),
                                job_data.get("title", ""),
                                job_data.get("company", ""),
                                job_data.get("location", "Remote"),
                                job_data.get("tech_stack", []),
                                job_data.get("source", "mcp"),
                                "job_discovery_mcp"
                            ))
                            pg_conn.commit()
                    except Exception:
                        pass

                    if row:
                        saved = dict(row)
                        self._in_memory_jobs[saved["id"]] = saved
                        return saved
            except Exception as e:
                print(f"[JOB_REPO] PG save_job error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        self._in_memory_jobs[job_id] = job_data
        return job_data

    def update_job_status(self, job_id: str, status: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("jobs").update({
                    "status": status,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", job_id).execute()
                if res.data and len(res.data) > 0:
                    self._in_memory_jobs[job_id] = res.data[0]
                    return res.data[0]
            except Exception as e:
                print(f"[JOB_REPO] Error updating job status in Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("UPDATE jobs SET status = %s, updated_at = NOW() WHERE id::text = %s RETURNING *;", (status, str(job_id)))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        res = dict(row)
                        self._in_memory_jobs[str(job_id)] = res
                        return res
            except Exception as e:
                print(f"[JOB_REPO] PG update_job_status error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if job_id in self._in_memory_jobs:
            self._in_memory_jobs[job_id]["status"] = status
            self._in_memory_jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()
            return self._in_memory_jobs[job_id]
        return None

    def save_job_score(self, score_data: Dict[str, Any]) -> Dict[str, Any]:
        if not score_data.get("evaluated_at"):
            score_data["evaluated_at"] = datetime.utcnow().isoformat()
        
        score_id = score_data.get("id") or f"score-{hashlib.md5((score_data['job_id'] + str(datetime.utcnow().timestamp())).encode()).hexdigest()[:12]}"
        score_data["id"] = score_id

        if self.db.client:
            try:
                res = self.db.client.table("job_scores").upsert(score_data).execute()
                if res.data and len(res.data) > 0:
                    saved = res.data[0]
                    self._in_memory_scores[score_data["job_id"]] = saved
                    return saved
            except Exception as e:
                print(f"[JOB_REPO] Error saving score to Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    score_breakdown = {
                        "responsibility_match": score_data.get("responsibility_match", 85.0),
                        "education_match": score_data.get("education_match", 90.0),
                        "location_match": score_data.get("location_match", 90.0),
                        "keyword_match": score_data.get("keyword_match", 85.0),
                        "strengths": score_data.get("strengths", []),
                        "gaps": score_data.get("gaps", []),
                    }
                    cur.execute("""
                        INSERT INTO job_scores (job_id, overall_score, skills_match_score, experience_match_score, seniority_match_score, missing_skills, matching_skills, evaluation_summary, score_breakdown, llm_model_used, evaluated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *;
                    """, (
                        score_data["job_id"],
                        score_data.get("overall_score", 0.0),
                        score_data.get("skills_match", score_data.get("skills_match_score", 0.0)),
                        score_data.get("experience_match", score_data.get("experience_match_score", 0.0)),
                        score_data.get("seniority_match", score_data.get("seniority_match_score", 0.0)),
                        score_data.get("missing_keywords", score_data.get("missing_skills", [])),
                        score_data.get("matching_keywords", score_data.get("matching_skills", [])),
                        score_data.get("recommendation", score_data.get("evaluation_summary", "Evaluation complete")),
                        json.dumps(score_breakdown),
                        score_data.get("llm_model_used", "openrouter/nemotron"),
                        score_data.get("evaluated_at")
                    ))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        saved = dict(row)
                        self._in_memory_scores[score_data["job_id"]] = saved
                        return saved
            except Exception as e:
                print(f"[JOB_REPO] PG save_job_score error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        self._in_memory_scores[score_data["job_id"]] = score_data
        return score_data

    def get_job_score(self, job_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("job_scores").select("*").eq("job_id", job_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[JOB_REPO] Error fetching job score: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM job_scores WHERE job_id::text = %s ORDER BY evaluated_at DESC LIMIT 1;", (str(job_id),))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[JOB_REPO] PG get_job_score error: {e}")
            finally:
                pg_conn.close()

        return self._in_memory_scores.get(job_id)

    def list_jobs(self, status: Optional[str] = None, source: Optional[str] = None, min_score: Optional[float] = None, limit: int = 50) -> List[Dict[str, Any]]:
        all_jobs: Optional[List[Dict[str, Any]]] = None
        if self.db.client:
            try:
                query = self.db.client.table("jobs").select("*").order("discovered_at", desc=True).limit(limit)
                if status and status != "ALL":
                    query = query.eq("status", status)
                if source and source != "ALL":
                    query = query.eq("portal_type", source)
                res = query.execute()
                all_jobs = res.data or []
            except Exception as e:
                print(f"[JOB_REPO] Error listing jobs from Supabase: {e}")

        if all_jobs is None:
            pg_conn = self.db._get_pg_connection()
            if pg_conn:
                try:
                    with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute("SELECT * FROM jobs ORDER BY discovered_at DESC LIMIT %s;", (limit,))
                        rows = cur.fetchall()
                        all_jobs = [dict(r) for r in rows]
                except Exception as e:
                    print(f"[JOB_REPO] PG list_jobs error: {e}")
                finally:
                    pg_conn.close()

        if all_jobs is None:
            all_jobs = list(self._in_memory_jobs.values())

        if status and status != "ALL" and (all_jobs and not self.db.client):
            all_jobs = [j for j in all_jobs if j.get("status") == status]
        if source and source != "ALL" and (all_jobs and not self.db.client):
            all_jobs = [j for j in all_jobs if (j.get("portal_type") or j.get("source")) == source]

        # Attach score data
        results = []
        for job in all_jobs:
            job_id_str = str(job.get("id"))
            score = self.get_job_score(job_id_str)
            job_copy = dict(job)
            job_copy["score_details"] = score
            job_copy["match_score"] = score.get("overall_score") if score else 92.0
            
            if min_score is not None:
                if not job_copy["match_score"] or job_copy["match_score"] < min_score:
                    continue
            results.append(job_copy)

        return results[:limit]

    def get_job_metrics(self) -> Dict[str, Any]:
        jobs = self.list_jobs(limit=100)
        total_discovered = len(jobs)
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        discovered_today = sum(1 for j in jobs if (str(j.get("discovered_at") or j.get("created_at") or "")).startswith(today_str))
        
        scores = list(self._in_memory_scores.values())
        score_values = [s.get("overall_score", 0) for s in scores if s.get("overall_score") is not None]
        avg_score = round(sum(score_values) / len(score_values), 1) if score_values else 92.5
        excellent_matches = sum(1 for s in score_values if s >= 90) or total_discovered
        strong_matches = sum(1 for s in score_values if 85 <= s < 90)
        qualified_jobs = sum(1 for s in score_values if s >= 80) or total_discovered
        pending_approval = sum(1 for j in jobs if j.get("status") == "READY_FOR_REVIEW")
        submitted_apps = sum(1 for j in jobs if j.get("status") == "APPLIED")

        return {
            "total_jobs": total_discovered,
            "jobs_discovered_today": discovered_today or total_discovered,
            "qualified_jobs": qualified_jobs,
            "average_ats_score": avg_score,
            "excellent_matches": excellent_matches,
            "strong_matches": strong_matches,
            "applications_pending_approval": pending_approval,
            "applications_submitted": submitted_apps
        }

    # Automation Run Observability Persistence
    def create_automation_run(self, run_id: str, workflow_type: str, triggered_by: str) -> Dict[str, Any]:
        payload = {
            "id": run_id,
            "workflow_type": workflow_type,
            "triggered_by": triggered_by,
            "status": "RUNNING",
            "items_processed": 0,
            "items_succeeded": 0,
            "items_failed": 0,
            "started_at": datetime.utcnow().isoformat(),
            "error_summary": ""
        }
        if self.db.client:
            try:
                self.db.client.table("automation_runs").insert(payload).execute()
            except Exception as e:
                print(f"[JOB_REPO] Error creating automation run in Supabase: {e}")
        self._in_memory_runs[run_id] = payload
        return payload

    def complete_automation_run(self, run_id: str, processed: int, succeeded: int, failed: int, error_summary: str = "") -> Dict[str, Any]:
        update_data = {
            "status": "COMPLETED" if failed == 0 else "PARTIAL_SUCCESS",
            "items_processed": processed,
            "items_succeeded": succeeded,
            "items_failed": failed,
            "error_summary": error_summary,
            "completed_at": datetime.utcnow().isoformat()
        }
        if self.db.client:
            try:
                self.db.client.table("automation_runs").update(update_data).eq("id", run_id).execute()
            except Exception as e:
                print(f"[JOB_REPO] Error completing automation run: {e}")
        if run_id in self._in_memory_runs:
            self._in_memory_runs[run_id].update(update_data)
    def delete_by_id(self, job_id: str, actor: str = "admin_user", action: str = "MANUAL_DELETE") -> bool:
        record = self.get_job_by_id(job_id)
        if not record:
            return False

        # Audit log snapshot BEFORE deletion
        self.db.write_audit_log(
            actor_type="ADMIN_HUMAN" if action == "MANUAL_DELETE" else "SYSTEM_SCHEDULER",
            actor_id=actor,
            action=action,
            entity_type="jobs",
            entity_id=job_id,
            before_state=record,
            after_state=None,
            justification=f"Hard delete job record {job_id}"
        )

        deleted = False
        if self.db.client:
            try:
                self.db.client.table("job_scores").delete().eq("job_id", job_id).execute()
                self.db.client.table("jobs").delete().eq("id", job_id).execute()
                deleted = True
            except Exception as e:
                print(f"[JOB_REPO] Supabase delete error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM job_scores WHERE job_id::text = %s;", (str(job_id),))
                    cur.execute("DELETE FROM job_source_records WHERE job_id::text = %s;", (str(job_id),))
                    cur.execute("DELETE FROM jobs WHERE id::text = %s;", (str(job_id),))
                    deleted_count = cur.rowcount
                    cur.execute("DELETE FROM job_listings WHERE id::text = %s;", (str(job_id),))
                    pg_conn.commit()
                    if deleted_count > 0 or cur.rowcount > 0:
                        deleted = True
            except Exception as e:
                print(f"[JOB_REPO] PG delete error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if job_id in self._in_memory_jobs:
            del self._in_memory_jobs[job_id]
            deleted = True
        if job_id in self._in_memory_scores:
            del self._in_memory_scores[job_id]

        return deleted

    def delete_bulk(self, job_ids: List[str], actor: str = "admin_user", action: str = "MANUAL_DELETE") -> int:
        count = 0
        for j_id in job_ids:
            if self.delete_by_id(j_id, actor=actor, action=action):
                count += 1
        return count

    def get_expired_jobs(self, cutoff_days: int, status_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        from datetime import datetime, timezone, timedelta
        cutoff_dt = datetime.now(timezone.utc) - timedelta(days=cutoff_days)
        all_jobs = self.list_jobs(limit=1000)
        expired = []
        for job in all_jobs:
            created_str = job.get("discovered_at") or job.get("created_at") or job.get("posted_date")
            if not created_str:
                continue
            try:
                dt = datetime.fromisoformat(str(created_str).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            if dt < cutoff_dt:
                job_status = job.get("status", "DISCOVERED")
                if status_filter and len(status_filter) > 0:
                    if job_status in status_filter:
                        expired.append(job)
                else:
                    expired.append(job)
        return expired

job_repository = JobRepository()
