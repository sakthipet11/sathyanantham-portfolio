import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.python.repositories.retention_repository import retention_repository, VALID_PIPELINES
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.application_repository import application_repository
from backend.python.repositories.resume_repository import resume_repository
from backend.python.repositories.referral_repository import referral_repository
from backend.python.repositories.email_repository import email_repository

class RetentionService:
    def __init__(self):
        self.retention_repo = retention_repository
        self.active_locks: set = set()

    def get_repository_for_pipeline(self, pipeline: str):
        if pipeline == "jobs":
            return job_repository
        elif pipeline == "applications":
            return application_repository
        elif pipeline == "resumes":
            return resume_repository
        elif pipeline == "referrals":
            return referral_repository
        elif pipeline == "emails":
            return email_repository
        else:
            raise ValueError(f"Unknown pipeline enum: {pipeline}")

    def get_expired_rows(self, pipeline: str, retention_days: int, status_filter: Optional[List[str]]) -> List[Dict[str, Any]]:
        repo = self.get_repository_for_pipeline(pipeline)
        if pipeline == "jobs":
            return repo.get_expired_jobs(retention_days, status_filter)
        elif pipeline == "applications":
            return repo.get_expired_applications(retention_days, status_filter)
        elif pipeline == "resumes":
            return repo.get_expired_resumes(retention_days, status_filter)
        elif pipeline == "referrals":
            return repo.get_expired_referrals(retention_days, status_filter)
        elif pipeline == "emails":
            return repo.get_expired_emails(retention_days, status_filter)
        return []

    def preview_pipeline_purge(self, pipeline: str, retention_days: int, status_filter: Optional[List[str]] = None) -> Dict[str, Any]:
        if pipeline not in VALID_PIPELINES:
            raise ValueError(f"Invalid pipeline: {pipeline}")
        
        expired = self.get_expired_rows(pipeline, retention_days, status_filter)
        return {
            "pipeline": pipeline,
            "retention_days": retention_days,
            "status_filter": status_filter,
            "preview_delete_count": len(expired),
            "sample_expired_ids": [r.get("id") for r in expired[:10]]
        }

    def run_pipeline_purge(self, pipeline: str, actor: str = "scheduler", manual_override: bool = False) -> Dict[str, Any]:
        if pipeline not in VALID_PIPELINES:
            raise ValueError(f"Invalid pipeline: {pipeline}")

        if pipeline in self.active_locks:
            return {
                "status": "rejected",
                "message": f"Retention purge for pipeline '{pipeline}' is already in progress.",
                "pipeline": pipeline,
                "deleted_count": 0
            }

        # Lock pipeline
        self.active_locks.add(pipeline)
        run_id = f"run-retention-{pipeline}-{uuid.uuid4().hex[:8]}"

        try:
            policy = self.retention_repo.get_policy(pipeline)
            if not policy:
                return {"status": "error", "message": f"Policy not found for pipeline {pipeline}"}

            if not policy.get("enabled") and not manual_override:
                return {
                    "status": "skipped",
                    "message": f"Retention policy for '{pipeline}' is disabled.",
                    "pipeline": pipeline,
                    "deleted_count": 0
                }

            retention_days = policy.get("retention_days", 10)
            status_filter = policy.get("status_filter")

            # Load expired rows
            expired = self.get_expired_rows(pipeline, retention_days, status_filter)
            repo = self.get_repository_for_pipeline(pipeline)
            action = "AUTO_PURGE_DELETE" if actor == "scheduler" else "MANUAL_PURGE_DELETE"

            deleted_count = 0
            failed_count = 0

            for row in expired:
                r_id = row.get("id")
                if not r_id:
                    continue
                success = repo.delete_by_id(str(r_id), actor=actor, action=action)
                if success:
                    deleted_count += 1
                else:
                    failed_count += 1

            # Record stats in policy table
            self.retention_repo.record_purge_run(pipeline, deleted_count)

            # Record automation run
            job_repository.create_automation_run(
                run_id=run_id,
                workflow_type=f"RETENTION_PURGE_{pipeline.upper()}",
                triggered_by=actor
            )
            job_repository.complete_automation_run(
                run_id=run_id,
                processed=len(expired),
                succeeded=deleted_count,
                failed=failed_count,
                error_summary=f"Purged {deleted_count} old records (cutoff {retention_days} days)"
            )

            return {
                "status": "completed",
                "pipeline": pipeline,
                "rows_evaluated": len(expired),
                "deleted_count": deleted_count,
                "failed_count": failed_count,
                "run_id": run_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            print(f"[RETENTION_SERVICE] Error purging pipeline '{pipeline}': {e}")
            return {
                "status": "error",
                "pipeline": pipeline,
                "message": str(e),
                "deleted_count": 0
            }
        finally:
            self.active_locks.discard(pipeline)

    def run_all_enabled_purges(self, actor: str = "scheduler") -> Dict[str, Any]:
        policies = self.retention_repo.get_all_policies()
        results = {}
        total_deleted = 0

        for pol in policies:
            pipe = pol.get("pipeline")
            if not pipe or pipe not in VALID_PIPELINES:
                continue
            if not pol.get("enabled"):
                results[pipe] = {"status": "skipped", "message": "Policy disabled", "deleted_count": 0}
                continue

            # Trapped execution per pipeline so one failure doesn't abort others
            try:
                res = self.run_pipeline_purge(pipe, actor=actor)
                results[pipe] = res
                total_deleted += res.get("deleted_count", 0)
            except Exception as e:
                results[pipe] = {"status": "error", "message": str(e), "deleted_count": 0}

        return {
            "status": "completed",
            "triggered_by": actor,
            "total_deleted": total_deleted,
            "pipelines": results,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

retention_service = RetentionService()
