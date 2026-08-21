"""
Fingerprint-based deduplication for the MCP server.

Produces canonical fingerprints that are compatible with the existing
job_deduplication_service's idempotency_key strategy. Both strategies
run through the same pipeline — they are unified, not competing.
"""

import hashlib
import re
import logging
from typing import List, Set, Dict, Tuple
from backend.python.mcp.job_discovery.models.normalized_job import NormalizedJob

logger = logging.getLogger("job_discovery.dedup")


class DeduplicationService:
    """
    In-memory, per-search deduplication using canonical fingerprints.

    This service prevents the same job from appearing twice in a single
    search result (cross-provider dedup). It does NOT replace the existing
    job_deduplication_service which handles database-level dedup via
    idempotency_key — both run in sequence.

    Fingerprint = SHA256(normalized_company + normalized_title +
                         normalized_location + apply_url)
    """

    def __init__(self):
        self._seen_fingerprints: Set[str] = set()

    @staticmethod
    def _normalize_text(text: str) -> str:
        """Lowercase, strip punctuation and excess whitespace."""
        clean = re.sub(r'[^a-zA-Z0-9\s]', '', text.lower())
        return re.sub(r'\s+', ' ', clean).strip()

    @staticmethod
    def compute_fingerprint(job: NormalizedJob) -> str:
        """
        Compute canonical dedup fingerprint.

        Uses company + normalized title + normalized location + apply_url
        rather than provider job ID, because the same job posted on multiple
        providers will have different provider IDs.
        """
        company = DeduplicationService._normalize_text(job.company)
        title = DeduplicationService._normalize_text(job.title)
        location = DeduplicationService._normalize_text(job.location or "remote")
        apply_url = (job.apply_url or "").lower().strip()

        raw_key = f"{company}|{title}|{location}|{apply_url}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    @staticmethod
    def compute_idempotency_key(job: NormalizedJob) -> str:
        """
        Compute idempotency key compatible with the existing
        job_deduplication_service strategy:
          - Primary: source + source_job_id
          - Fallback: company + normalized_title + apply_url
        """
        source = (job.source or "generic").lower().strip()
        source_job_id = (job.source_job_id or "").strip()

        if source_job_id and source_job_id != "None":
            raw_key = f"{source}:{source_job_id}"
            return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

        company = DeduplicationService._normalize_text(job.company)
        title = DeduplicationService._normalize_text(job.title)
        apply_url = (job.apply_url or "").lower().strip()

        raw_key = f"{company}:{title}:{apply_url}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def deduplicate(self, jobs: List[NormalizedJob]) -> Tuple[List[NormalizedJob], int]:
        """
        Remove duplicates from a list of jobs.

        Returns (deduplicated_jobs, removed_count).
        Each job gets its fingerprint and idempotency_key set.
        """
        unique_jobs: List[NormalizedJob] = []
        duplicates_removed = 0

        for job in jobs:
            fingerprint = self.compute_fingerprint(job)
            idempotency_key = self.compute_idempotency_key(job)

            if fingerprint in self._seen_fingerprints:
                duplicates_removed += 1
                logger.debug(
                    f"Dedup: removed duplicate '{job.title}' at '{job.company}' "
                    f"from provider '{job.source}'"
                )
                continue

            self._seen_fingerprints.add(fingerprint)
            job.fingerprint = fingerprint
            job.idempotency_key = idempotency_key
            unique_jobs.append(job)

        if duplicates_removed > 0:
            logger.info(
                f"Deduplication: {duplicates_removed} duplicates removed, "
                f"{len(unique_jobs)} unique jobs retained"
            )

        return unique_jobs, duplicates_removed

    def reset(self):
        """Clear seen fingerprints for a new search session."""
        self._seen_fingerprints.clear()
