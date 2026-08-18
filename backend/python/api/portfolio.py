from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from backend.python.repositories.supabase_repo import db_helper

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

@router.get("/projects")
def get_portfolio_projects():
    """Fetch all portfolio projects directly from the database."""
    projects = db_helper.get_portfolio_content("projects")
    return {"status": "success", "count": len(projects), "projects": projects}

@router.get("/experience")
def get_portfolio_experience():
    """Fetch all work experience milestones directly from the database."""
    experience = db_helper.get_portfolio_content("experience")
    return {"status": "success", "count": len(experience), "experience": experience}

@router.get("/skills")
def get_portfolio_skills():
    """Fetch all technical skills directly from the database."""
    skills = db_helper.get_portfolio_content("skills")
    return {"status": "success", "count": len(skills), "skills": skills}

@router.get("/education")
def get_portfolio_education():
    """Fetch education records directly from the database."""
    education = db_helper.get_portfolio_content("education")
    return {"status": "success", "count": len(education), "education": education}

@router.get("/certificates")
def get_portfolio_certificates():
    """Fetch certificate records directly from the database."""
    certificates = db_helper.get_portfolio_content("certificates")
    return {"status": "success", "count": len(certificates), "certificates": certificates}

@router.get("/profile")
def get_candidate_profile():
    """Fetch Sathyanantham V verified candidate profile directly from the database."""
    profile = db_helper.get_user_profile()
    return {"status": "success", "profile": profile}
