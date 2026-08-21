import asyncio
from typing import Dict, Any, List
from backend.python.services.job_discovery_service import job_discovery_service


class JobDiscoveryAgent:
    def __init__(self):
        self.name = "job_discovery_agent"
        self.description = "Autonomous job discovery agent that queries live JSearch / Google for Jobs provider for real career postings."

    async def discover_jobs(self, query: str = "Lead Frontend Architect", location: str = "Remote", limit: int = 20) -> List[Dict[str, Any]]:
        print(f"[SEARCH] [{self.name}] Initiating live JSearch discovery for '{query}' in '{location}'...")
        raw_candidates = await job_discovery_service.discover_jobs(target_role=query, limit=limit)
        return [job_dict for source_name, job_dict in raw_candidates]

    def discover_jobs_sync(self, query: str = "Lead Frontend Architect", location: str = "Remote", limit: int = 20) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # In async contexts, use discover_jobs directly
                return []
            return loop.run_until_complete(self.discover_jobs(query=query, location=location, limit=limit))
        except Exception:
            return asyncio.run(self.discover_jobs(query=query, location=location, limit=limit))


job_discovery_agent = JobDiscoveryAgent()
