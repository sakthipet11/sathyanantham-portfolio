"""
Bearer token authentication for MCP HTTP transport.

Designed so it can be swapped for OAuth/OIDC later without rewriting tools.
"""

import logging
from typing import Optional

from backend.python.mcp.job_discovery.config import settings

logger = logging.getLogger("job_discovery.auth")


class AuthError(Exception):
    """Raised when authentication fails."""
    pass


def verify_bearer_token(token: Optional[str]) -> bool:
    """
    Verify a bearer token against the configured secret.

    In stdio mode (dev), auth is skipped entirely.
    In HTTP mode (production), a valid token is required.
    """
    if settings.transport == "stdio":
        return True

    if not settings.mcp_bearer_token:
        logger.warning(
            "No MCP_BEARER_TOKEN configured — HTTP transport is unprotected. "
            "Set JOB_DISCOVERY_MCP_BEARER_TOKEN in .env for production."
        )
        return True  # Allow in dev if no token is configured

    if not token:
        raise AuthError("Missing Authorization header")

    # Strip 'Bearer ' prefix if present
    if token.startswith("Bearer "):
        token = token[7:]
    elif token.startswith("bearer "):
        token = token[7:]

    if token != settings.mcp_bearer_token:
        raise AuthError("Invalid bearer token")

    return True
