"""
Job Discovery MCP Server — Entry Point

This is the first real MCP server in the codebase, using the actual MCP
Python SDK. It supports both stdio (dev) and HTTP (production) transports.

Usage:
  Dev (stdio):   python -m backend.python.mcp.job_discovery.server
  Production:    JOB_DISCOVERY_TRANSPORT=http python -m backend.python.mcp.job_discovery.server
"""

import asyncio
import logging
import sys
import time
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from backend.python.mcp.job_discovery.config import settings
from backend.python.mcp.job_discovery.providers.registry import initialize_providers
from backend.python.mcp.job_discovery.services.cache_service import CacheService
from backend.python.mcp.job_discovery.services.search_service import SearchService
from backend.python.mcp.job_discovery.services.rate_limiter import rate_limiter
from backend.python.mcp.job_discovery.tools.job_tools import JobDiscoveryTools

# ── Logging Setup ────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s"
    if settings.log_format == "text"
    else '{"time":"%(asctime)s","logger":"%(name)s","level":"%(levelname)s","msg":"%(message)s"}',
    stream=sys.stderr,  # MCP stdio uses stdout for protocol; logs go to stderr
)
logger = logging.getLogger("job_discovery.server")

# ── Server Initialization ────────────────────────────────────────────────

SERVER_START_TIME = time.time()

# Create MCP server
app = Server(settings.server_name)

# Initialize services
cache = CacheService(redis_url=settings.redis_url)
search_service = SearchService(cache=cache)
tools = JobDiscoveryTools(search_service=search_service, cache=cache)


def _init_providers():
    """Initialize providers and configure rate limiters."""
    registry = initialize_providers()
    for provider in registry.get_all():
        rate_limiter.configure_provider(
            provider.name,
            provider.config.rate_limit_rpm,
        )
    return registry


# ── Tool Registration ────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    Tool(
        name="search_jobs",
        description=(
            "Search for real job postings across multiple providers (Remotive, Himalayas, Adzuna, etc.). "
            "Returns normalized, deduplicated results with source URLs. Never returns fake data."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Job title or keyword search query"},
                "location": {"type": "string", "description": "Location filter e.g. 'Remote', 'New York'"},
                "remote_only": {"type": "boolean", "default": False},
                "employment_type": {"type": "string", "description": "Full-time, Part-time, Contract"},
                "min_salary": {"type": "number", "description": "Minimum salary (USD)"},
                "max_salary": {"type": "number", "description": "Maximum salary (USD)"},
                "company": {"type": "string", "description": "Filter by company name"},
                "tech_stack": {"type": "array", "items": {"type": "string"}, "description": "Required technologies"},
                "providers": {"type": "array", "items": {"type": "string"}, "description": "Specific providers to search"},
                "limit": {"type": "integer", "default": 50, "minimum": 1, "maximum": 200},
            },
            "required": ["query"],
        },
    ),
    Tool(
        name="get_job",
        description="Fetch a single job by provider name and provider-specific job ID.",
        inputSchema={
            "type": "object",
            "properties": {
                "provider": {"type": "string", "description": "Provider name e.g. 'remotive'"},
                "job_id": {"type": "string", "description": "Provider-specific job ID"},
            },
            "required": ["provider", "job_id"],
        },
    ),
    Tool(
        name="get_jobs",
        description="Batch fetch multiple jobs. Each entry needs provider + job_id.",
        inputSchema={
            "type": "object",
            "properties": {
                "job_ids": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "provider": {"type": "string"},
                            "job_id": {"type": "string"},
                        },
                        "required": ["provider", "job_id"],
                    },
                },
            },
            "required": ["job_ids"],
        },
    ),
    Tool(
        name="get_new_jobs",
        description="Get jobs posted within the last N hours.",
        inputSchema={
            "type": "object",
            "properties": {
                "since_hours": {"type": "integer", "default": 24, "description": "Hours to look back"},
                "query": {"type": "string", "description": "Optional search query"},
                "limit": {"type": "integer", "default": 50},
            },
        },
    ),
    Tool(
        name="search_jobs_for_profile",
        description=(
            "Profile-aware job search: searches multiple target titles across target locations, "
            "filters by blacklisted companies/keywords, and applies salary filters."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "target_titles": {"type": "array", "items": {"type": "string"}},
                "target_locations": {"type": "array", "items": {"type": "string"}},
                "primary_skills": {"type": "array", "items": {"type": "string"}},
                "blacklisted_companies": {"type": "array", "items": {"type": "string"}},
                "blacklisted_keywords": {"type": "array", "items": {"type": "string"}},
                "min_salary": {"type": "number"},
                "providers": {"type": "array", "items": {"type": "string"}},
                "limit": {"type": "integer", "default": 50},
            },
        },
    ),
    Tool(
        name="get_provider_status",
        description="Get health status for one or all job providers.",
        inputSchema={
            "type": "object",
            "properties": {
                "provider": {"type": "string", "description": "Optional: specific provider name"},
            },
        },
    ),
    Tool(
        name="refresh_job",
        description="Re-fetch a job from its provider to get updated data (bypasses cache).",
        inputSchema={
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "job_id": {"type": "string"},
            },
            "required": ["provider", "job_id"],
        },
    ),
    Tool(
        name="save_job",
        description=(
            "INERT — Validates and normalizes job data but does NOT write to the database. "
            "The existing job_repository owns persistence per the Phase 0 ownership decision. "
            "This tool exists for API completeness only."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "job_data": {"type": "object", "description": "Job data to validate"},
            },
            "required": ["job_data"],
        },
    ),
    Tool(
        name="health_check",
        description="Full server health check including all providers, cache, and database status.",
        inputSchema={"type": "object", "properties": {}},
    ),
    Tool(
        name="search_companies",
        description="Search for companies and optionally include their active job listings.",
        inputSchema={
            "type": "object",
            "properties": {
                "company_name": {"type": "string", "description": "Company name to search for"},
                "include_jobs": {"type": "boolean", "default": True},
            },
            "required": ["company_name"],
        },
    ),
]


@app.list_tools()
async def list_tools() -> list[Tool]:
    """Return all available MCP tools."""
    return TOOL_DEFINITIONS


@app.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Dispatch tool calls to the appropriate handler."""
    import json

    handler_map = {
        "search_jobs": tools.search_jobs,
        "get_job": tools.get_job,
        "get_jobs": tools.get_jobs,
        "get_new_jobs": tools.get_new_jobs,
        "search_jobs_for_profile": tools.search_jobs_for_profile,
        "get_provider_status": tools.get_provider_status,
        "refresh_job": tools.refresh_job,
        "save_job": tools.save_job,
        "health_check": tools.health_check,
        "search_companies": tools.search_companies,
    }

    handler = handler_map.get(name)
    if not handler:
        return [TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))]

    try:
        result = await handler(**arguments)
        return [TextContent(type="text", text=json.dumps(result, default=str))]
    except Exception as e:
        logger.error(f"Tool '{name}' error: {e}", exc_info=True)
        return [
            TextContent(
                type="text",
                text=json.dumps({
                    "status": "error",
                    "tool": name,
                    "error": str(e),
                    "error_type": type(e).__name__,
                }),
            )
        ]


# ── Server Runner ────────────────────────────────────────────────────────

async def run_server():
    """Start the MCP server with configured transport."""
    logger.info(
        f"Starting {settings.server_name} v{settings.server_version} "
        f"(transport={settings.transport})"
    )

    # Initialize providers
    _init_providers()

    if settings.transport == "stdio":
        logger.info("Running in stdio mode (development)")
        async with stdio_server() as (read_stream, write_stream):
            await app.run(read_stream, write_stream, app.create_initialization_options())
    elif settings.transport == "http":
        # HTTP transport via starlette/uvicorn
        try:
            from mcp.server.sse import SseServerTransport
            from starlette.applications import Starlette
            from starlette.routing import Route
            import uvicorn

            sse = SseServerTransport("/messages")

            async def handle_sse(request):
                async with sse.connect_sse(
                    request.scope, request.receive, request._send
                ) as streams:
                    await app.run(
                        streams[0], streams[1], app.create_initialization_options()
                    )

            starlette_app = Starlette(
                routes=[
                    Route("/sse", endpoint=handle_sse),
                    Route("/messages", endpoint=sse.handle_post_message, methods=["POST"]),
                ]
            )

            logger.info(f"Starting HTTP transport on {settings.host}:{settings.port}")
            config = uvicorn.Config(
                starlette_app,
                host=settings.host,
                port=settings.port,
                log_level=settings.log_level.lower(),
            )
            server = uvicorn.Server(config)
            await server.serve()
        except ImportError as e:
            logger.error(f"HTTP transport requires additional dependencies: {e}")
            logger.info("Falling back to stdio transport")
            async with stdio_server() as (read_stream, write_stream):
                await app.run(read_stream, write_stream, app.create_initialization_options())
    else:
        raise ValueError(f"Unknown transport: {settings.transport}")


def main():
    """Entry point for the MCP server."""
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
