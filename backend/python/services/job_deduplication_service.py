import hashlib
import re
from typing import Dict, Any, Tuple
from backend.python.repositories.job_repository import job_repository

class JobDeduplicationService:
    """
    Computes deterministic idempotency keys and detects duplicates.
    """

    @staticmethod
    def normalize_title(title: str) -> str:
        # Standardize title for comparison: 'Lead Frontend Architect' -> 'lead frontend architect'
        clean = re.sub(r'[^a-zA-Z0-9\s]', '', title).lower()
        return re.sub(r'\s+', ' ', clean).strip()

    def generate_idempotency_key(self, job_data: Dict[str, Any]) -> str:
        source = (job_data.get("source") or "generic").lower().strip()
        source_job_id = str(job_data.get("source_job_id") or "").strip()
        
        # Primary strategy: source + source_job_id
        if source_job_id and source_job_id != "None" and source_job_id != "":
            raw_key = f"{source}:{source_job_id}"
            return hashlib.sha256(raw_key.encode()).hexdigest()
        
        # Fallback strategy: company + normalized_title + apply_url
        company = (job_data.get("company") or "").lower().strip()
        norm_title = self.normalize_title(job_data.get("title") or "")
        apply_url = (job_data.get("apply_url") or job_data.get("job_url") or "").lower().strip()
        
        raw_key = f"{company}:{norm_title}:{apply_url}"
        return hashlib.sha256(raw_key.encode()).hexdigest()

    def is_duplicate(self, job_data: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        idempotency_key = self.generate_idempotency_key(job_data)
        existing = job_repository.get_job_by_idempotency_key(idempotency_key)
        if existing:
            return True, idempotency_key, existing
        return False, idempotency_key, {}

job_deduplication_service = JobDeduplicationService()
