import re
from typing import Dict, Any, List, Optional
from datetime import datetime

class JobNormalizationService:
    """
    Normalizes diverse raw job listings from scrapers, APIs, and portals
    into a strictly uniform schema.
    """
    
    @staticmethod
    def clean_text(raw_text: Optional[str]) -> str:
        if not raw_text:
            return ""
        # Strip HTML tags
        clean = re.sub(r'<[^>]+>', ' ', raw_text)
        # Normalize excessive whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean

    @staticmethod
    def extract_location_type(location: str, description: str) -> str:
        combined = f"{location} {description}".lower()
        if "remote" in combined or "work from home" in combined or "anywhere" in combined:
            return "Remote"
        if "hybrid" in combined or "flexible" in combined:
            return "Hybrid"
        return "Onsite"

    @staticmethod
    def extract_salary(raw_salary: Optional[str], description: str) -> Dict[str, Any]:
        text = f"{raw_salary or ''} {description}"
        salary_match = re.search(r'\$(\d{2,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:-|to)\s*\$?(\d{2,3}(?:,\d{3})*(?:\.\d{2})?)', text, re.IGNORECASE)
        
        if salary_match:
            min_val = float(salary_match.group(1).replace(',', ''))
            max_val = float(salary_match.group(2).replace(',', ''))
            # If annual salaries like 140k -> 140000
            if min_val < 1000:
                min_val *= 1000
            if max_val < 1000:
                max_val *= 1000
            return {
                "salary_min": min_val,
                "salary_max": max_val,
                "salary_currency": "USD",
                "salary_raw": f"${min_val:,.0f} - ${max_val:,.0f}"
            }
        return {
            "salary_min": None,
            "salary_max": None,
            "salary_currency": "USD",
            "salary_raw": raw_salary or "Competitive / Not Disclosed"
        }

    @staticmethod
    def extract_skills_and_keywords(description: str) -> List[str]:
        known_tech = [
            "React", "TypeScript", "JavaScript", "Micro Frontends", "Module Federation",
            "Next.js", "Vue.js", "Angular", "Node.js", "Python", "FastAPI", "GraphQL",
            "REST API", "Tailwind CSS", "Redux", "Zustand", "Webpack", "Vite", "Docker",
            "Kubernetes", "AWS", "GCP", "Azure", "CI/CD", "Jest", "Cypress", "Playwright",
            "Web Performance", "Core Web Vitals", "Design Systems", "AI Agents", "LLM"
        ]
        found = []
        desc_lower = description.lower()
        for tech in known_tech:
            pattern = rf'\b{re.escape(tech.lower())}\b'
            if re.search(pattern, desc_lower):
                found.append(tech)
        return found

    def normalize(self, raw_job: Dict[str, Any], source: str = "generic") -> Dict[str, Any]:
        company = self.clean_text(raw_job.get("company", "Unknown Enterprise"))
        title = self.clean_text(raw_job.get("title", "Frontend Engineer"))
        location = self.clean_text(raw_job.get("location", "Remote"))
        description = self.clean_text(raw_job.get("description", raw_job.get("description_raw", "")))
        requirements = self.clean_text(raw_job.get("requirements", raw_job.get("requirements_clean", "")))
        responsibilities = self.clean_text(raw_job.get("responsibilities", ""))
        
        location_type = raw_job.get("location_type") or self.extract_location_type(location, description)
        salary_info = self.extract_salary(raw_job.get("salary"), description)
        tech_stack = raw_job.get("tech_stack") or self.extract_skills_and_keywords(f"{description} {requirements}")

        source_job_id = str(raw_job.get("source_job_id") or raw_job.get("job_id") or raw_job.get("id") or "")
        job_url = raw_job.get("job_url") or raw_job.get("apply_url") or "https://careers.example.com"
        apply_url = raw_job.get("apply_url") or job_url
        portal_type = raw_job.get("portal_type") or source.lower()

        status = raw_job.get("status", "DISCOVERED")

        return {
            "source": source,
            "source_job_id": source_job_id,
            "company": company,
            "title": title,
            "location": location,
            "location_type": location_type,
            "employment_type": raw_job.get("employment_type", "Full-time"),
            "salary_min": salary_info["salary_min"],
            "salary_max": salary_info["salary_max"],
            "salary_currency": salary_info["salary_currency"],
            "description_raw": description or f"{title} at {company}",
            "requirements_clean": requirements,
            "responsibilities": responsibilities,
            "tech_stack": tech_stack,
            "job_url": job_url,
            "apply_url": apply_url,
            "portal_type": portal_type,
            "status": status,
            "posted_date": raw_job.get("posted_date") or datetime.utcnow().strftime("%Y-%m-%d"),
            "discovered_at": raw_job.get("discovered_at") or datetime.utcnow().isoformat()
        }

job_normalization_service = JobNormalizationService()
