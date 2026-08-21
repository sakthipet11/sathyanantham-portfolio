import sys
import os
sys.path.insert(0, os.path.abspath("."))
import pytest
import asyncio
from backend.python.mcp.job_discovery.providers.jsearch import JSearchProvider
from backend.python.mcp.job_discovery.config import ProviderConfig

SAMPLE_JSEARCH_RESPONSE = {
    "status": "OK",
    "request_id": "d8041984-8ef0-4d04-9670-33c05704814e",
    "parameters": {
        "query": "Lead Front end developer",
        "num_pages": 1,
        "date_posted": "today",
        "work_from_home": True,
        "employment_types": ["FULLTIME"],
        "exclude_job_publishers": ["linkedin"],
        "country": "india",
        "language": "en"
    },
    "data": {
        "jobs": [
            {
                "job_id": "Slo1N203RExQR0JzQlBtTkFBQUFBQT09",
                "job_title": "Remote Front-End Developer for Seamless UI",
                "employer_name": "Everglade Works",
                "employer_logo": "https://jobmesh.io/logo.png",
                "employer_website": None,
                "job_publisher": "JobMESH",
                "job_employment_type": "Full-time",
                "job_employment_types": ["FULLTIME"],
                "job_apply_link": "https://jobmesh.io/job/a3793543-9367-42df-9b09-b75224de4c74",
                "job_apply_is_direct": False,
                "apply_options": [{"apply_link": "https://jobmesh.io/job/a3793543-9367-42df-9b09-b75224de4c74", "is_direct": False, "publisher": "JobMESH"}],
                "job_description": "A leading technology company is seeking a Front-End Developer (React.js, TypeScript).",
                "job_is_remote": True,
                "job_posted_at": "16 hours ago",
                "job_posted_at_timestamp": 1787140800,
                "job_posted_at_datetime_utc": "2026-08-19T12:00:00.000Z",
                "job_location": "Anywhere",
                "job_city": None,
                "job_state": None,
                "job_country": None,
                "job_salary": None,
                "job_salary_string": "85.3K–171K a year",
                "job_min_salary": 85300,
                "job_max_salary": 171000,
                "job_salary_period": "YEAR",
                "job_highlights": {"Qualifications": ["React.js", "TypeScript"]},
                "job_google_link": "https://www.google.com/search?q=jobs"
            },
            {
                "job_id": "RHE0ZVVHTGZlS0FIeEpkWEFBQUFBQT09",
                "job_title": "HTML Email Developer (Contract)",
                "employer_name": "The Dorm",
                "employer_logo": "https://encrypted-tbn0.gstatic.com/logo.png",
                "employer_website": "https://www.dormco.com",
                "job_publisher": "ZipRecruiter",
                "job_employment_type": "Full-time",
                "job_employment_types": ["FULLTIME"],
                "job_apply_link": "https://www.ziprecruiter.com/c/Dorm/Job",
                "job_apply_is_direct": False,
                "job_description": "We are looking for a skilled contract Email Developer with HTML, CSS, JavaScript.",
                "job_is_remote": True,
                "job_posted_at": "7 hours ago",
                "job_posted_at_timestamp": 1787173200,
                "job_posted_at_datetime_utc": "2026-08-19T21:00:00.000Z",
                "job_location": "Remote, US",
                "job_city": "Remote",
                "job_state": None,
                "job_country": "US",
                "job_salary": 40,
                "job_salary_string": "40 an hour",
                "job_min_salary": None,
                "job_max_salary": None,
                "job_salary_period": "HOUR",
                "job_highlights": {"Qualifications": ["HTML", "CSS"]},
                "job_google_link": "https://www.google.com/search?q=jobs"
            }
        ]
    }
}

def test_jsearch_normalization():
    provider = JSearchProvider(config=ProviderConfig(enabled=True, api_key="dummy_key"))
    
    raw_jobs = SAMPLE_JSEARCH_RESPONSE["data"]["jobs"]
    normalized_jobs = [provider._normalize_job(j) for j in raw_jobs]

    assert len(normalized_jobs) == 2
    
    job1 = normalized_jobs[0]
    assert job1 is not None
    assert job1.title == "Remote Front-End Developer for Seamless UI"
    assert job1.company == "Everglade Works"
    assert str(job1.location_type) == "Remote"
    assert job1.salary_min == 85300
    assert job1.salary_max == 171000
    assert job1.apply_url == "https://jobmesh.io/job/a3793543-9367-42df-9b09-b75224de4c74"
    assert "React" in job1.tech_stack or "React.js" in job1.tech_stack
    assert job1.posted_date == "2026-08-19"
    
    # Test repository dict conversion
    repo_dict = job1.to_repository_dict()
    assert repo_dict["title"] == "Remote Front-End Developer for Seamless UI"
    assert repo_dict["company"] == "Everglade Works"
    assert repo_dict["location_type"] == "Remote"

    job2 = normalized_jobs[1]
    assert job2 is not None
    assert job2.title == "HTML Email Developer (Contract)"
    assert job2.company == "The Dorm"
    assert job2.location == "Remote, US"
    assert job2.posted_date == "2026-08-19"

if __name__ == "__main__":
    test_jsearch_normalization()
    print("ALL JSEARCH TESTS PASSED!")
