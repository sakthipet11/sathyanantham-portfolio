import asyncio
from backend.python.mcp.job_discovery.config import ProviderConfig
from backend.python.mcp.job_discovery.providers.jsearch import JSearchProvider
from backend.python.repositories.job_repository import job_repository

async def main():
    cfg = ProviderConfig(provider_name="jsearch", enabled=True)
    p = JSearchProvider(cfg)
    jobs = await p.search_jobs(query="Frontend developer in Bangalore", country="in", date_posted="all", employment_type="Full-time")
    print(f"JSearch fetched: {len(jobs)} jobs")
    for job in jobs[:3]:
        job_dict = job.to_repository_dict()
        saved = job_repository.save_job(job_dict)
        print(f"Saved DB Job -> Company: {saved.get('company')} | Company Domain: {saved.get('company_domain')} | Title: {saved.get('title')}")

if __name__ == '__main__':
    asyncio.run(main())
