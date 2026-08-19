"""
Security middleware — URL allowlisting, input validation, size limits.
"""

import logging
from urllib.parse import urlparse
from typing import List

from backend.python.mcp.job_discovery.config import settings

logger = logging.getLogger("job_discovery.security")

# Maximum sizes to prevent abuse
MAX_QUERY_LENGTH = 500
MAX_LOCATION_LENGTH = 200
MAX_TECH_STACK_ITEMS = 20
MAX_PROVIDERS_PER_REQUEST = 10
MAX_BOARD_TOKENS = 50
MAX_RESULT_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_url_domain(url: str) -> bool:
    """
    Check if a URL's domain is in the allowed list.
    Prevents arbitrary URL fetching — only allowlisted provider domains.
    """
    try:
        parsed = urlparse(url)
        domain = parsed.hostname or ""
        allowed = settings.get_allowed_domains()
        return any(domain.endswith(d) for d in allowed)
    except Exception:
        return False


def sanitize_query(query: str) -> str:
    """Sanitize search query input."""
    if not query:
        return ""
    # Truncate to max length
    query = query[:MAX_QUERY_LENGTH]
    # Remove control characters
    query = "".join(c for c in query if c.isprintable() or c in ("\n", "\t"))
    return query.strip()


def sanitize_location(location: str) -> str:
    """Sanitize location input."""
    if not location:
        return ""
    return location[:MAX_LOCATION_LENGTH].strip()


def validate_tech_stack(tech_stack: List[str]) -> List[str]:
    """Validate and sanitize tech stack filter."""
    if not tech_stack:
        return []
    return [t.strip()[:100] for t in tech_stack[:MAX_TECH_STACK_ITEMS] if t.strip()]


def validate_provider_list(providers: List[str]) -> List[str]:
    """Validate provider name list."""
    if not providers:
        return []
    known_providers = {
        "remotive", "himalayas", "linkedin", "remoteok", "arbeitnow", 
        "themuse", "adzuna", "greenhouse", "lever", "indeed", "naukri", "jobspy"
    }
    valid = [p.lower().strip() for p in providers[:MAX_PROVIDERS_PER_REQUEST]]
    return [p for p in valid if p in known_providers]
