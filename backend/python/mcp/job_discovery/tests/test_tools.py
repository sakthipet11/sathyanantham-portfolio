"""
Unit tests for Provider Registry and MCP tools.
"""

import pytest
import asyncio
from backend.python.mcp.job_discovery.config import settings, ProviderConfig
from backend.python.mcp.job_discovery.providers.registry import initialize_providers, provider_registry
from backend.python.mcp.job_discovery.services.cache_service import CacheService
from backend.python.mcp.job_discovery.services.search_service import SearchService
from backend.python.mcp.job_discovery.tools.job_tools import JobDiscoveryTools


@pytest.fixture
def tools_instance():
    initialize_providers()
    cache = CacheService()
    search_service = SearchService(cache)
    return JobDiscoveryTools(search_service=search_service, cache=cache)


@pytest.mark.asyncio
async def test_provider_status_tool(tools_instance):
    res = await tools_instance.get_provider_status()
    assert res["status"] == "success"
    assert "providers" in res
    assert res["total_count"] >= 4
    
    # Check Remotive is listed and enabled
    remotive_status = next((p for p in res["providers"] if p["provider"] == "remotive"), None)
    assert remotive_status is not None
    assert remotive_status["enabled"] is True


@pytest.mark.asyncio
async def test_save_job_is_inert(tools_instance):
    # Verify save_job tool is explicitly documented as inert and does not write to DB
    job_payload = {
        "source": "test",
        "source_job_id": "test-1",
        "title": "Senior Frontend Engineer",
        "company": "Enterprise AI",
        "description_raw": "Test description",
        "apply_url": "https://example.com/apply",
    }
    res = await tools_instance.save_job(job_payload)
    assert res["status"] == "validated"
    assert "INERT by design" in res["message"]
    assert res["job"]["title"] == "Senior Frontend Engineer"


@pytest.mark.asyncio
async def test_health_check_tool(tools_instance):
    res = await tools_instance.health_check()
    assert "server_status" in res
    assert "providers" in res
    assert res["cache_connected"] is True
