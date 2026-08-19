from fastapi import APIRouter
from backend.python.models.pydantic_models import (
    JobDiscoveryQuery, JobEvaluationRequest, TailorResumeRequest, ApplicationSubmitRequest
)
from backend.python.agents.job_discovery_agent import job_discovery_agent
from backend.python.agents.job_scoring_agent import job_scoring_agent
from backend.python.agents.resume_agent import resume_agent
from backend.python.agents.application_agent import application_agent
from backend.python.workflows.multi_agent_workflow import multi_agent_workflow

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.post("/discover")
def discover_jobs(query: JobDiscoveryQuery):
    jobs = job_discovery_agent.discover_jobs(query.title, query.location)
    return {"query": query.title, "count": len(jobs), "jobs": jobs}

@router.post("/evaluate")
def evaluate_job(req: JobEvaluationRequest):
    score = job_scoring_agent.score_job({
        "job_id": req.job_id,
        "title": req.title,
        "company": req.company,
        "description": req.description
    })
    return score

@router.post("/tailor-resume")
def tailor_resume(req: TailorResumeRequest):
    res = resume_agent.tailor_resume(req.job_description, req.target_role)
    return res

@router.post("/apply")
def submit_application(req: ApplicationSubmitRequest):
    res = application_agent.submit_application(req.job_url, req.custom_resume_url or "")
    return res

@router.post("/workflow/run")
def trigger_workflow(target_role: str = "Lead Frontend Architect"):
    res = multi_agent_workflow.run_end_to_end_pipeline(target_role)
    return res
