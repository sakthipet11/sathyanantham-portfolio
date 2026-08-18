import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.supabase_repo import db_helper

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
        return self._in_memory_jobs.get(job_id)

    def save_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        job_data["updated_at"] = datetime.utcnow().isoformat()
        if not job_data.get("discovered_at"):
            job_data["discovered_at"] = datetime.utcnow().isoformat()

        job_id = job_data.get("id") or f"job-{hashlib.md5((job_data.get('idempotency_key') or str(datetime.utcnow().timestamp())).encode()).hexdigest()[:12]}"
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
        return self._in_memory_scores.get(job_id)

    def list_jobs(self, status: Optional[str] = None, source: Optional[str] = None, min_score: Optional[float] = None, limit: int = 50) -> List[Dict[str, Any]]:
        all_jobs: List[Dict[str, Any]] = []
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
                all_jobs = list(self._in_memory_jobs.values())
        else:
            all_jobs = list(self._in_memory_jobs.values())

        # Attach score data
        results = []
        for job in all_jobs:
            score = self.get_job_score(job["id"])
            job_copy = dict(job)
            job_copy["score_details"] = score
            job_copy["match_score"] = score.get("overall_score") if score else None
            
            if min_score is not None:
                if not job_copy["match_score"] or job_copy["match_score"] < min_score:
                    continue
            results.append(job_copy)

        return results[:limit]

    def get_job_metrics(self) -> Dict[str, Any]:
        jobs = list(self._in_memory_jobs.values())
        if self.db.client:
            try:
                res = self.db.client.table("jobs").select("id, status, discovered_at").execute()
                if res.data:
                    jobs = res.data
            except Exception:
                pass

        total_discovered = len(jobs)
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        discovered_today = sum(1 for j in jobs if (j.get("discovered_at") or "").startswith(today_str))
        
        scores = list(self._in_memory_scores.values())
        if self.db.client:
            try:
                s_res = self.db.client.table("job_scores").select("overall_score").execute()
                if s_res.data:
                    scores = s_res.data
            except Exception:
                pass

        score_values = [s.get("overall_score", 0) for s in scores if s.get("overall_score") is not None]
        avg_score = round(sum(score_values) / len(score_values), 1) if score_values else 0.0
        excellent_matches = sum(1 for s in score_values if s >= 90)
        strong_matches = sum(1 for s in score_values if 85 <= s < 90)
        qualified_jobs = sum(1 for s in score_values if s >= 80)
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
        return self._in_memory_runs.get(run_id, update_data)

job_repository = JobRepository()
