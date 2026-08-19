# Ownership Decision Record: Job Discovery MCP Server Integration

## Context
Prior to this implementation, job discovery relied on placeholder stubs. The persistence, scoring, normalization, and deduplication layers—specifically `job_repository.py`, `job_scoring_service.py`, `job_deduplication_service.py`, and `app/admin/jobs/page.tsx`—were already fully built, deeply integrated with PostgreSQL (`jobs`, `job_scores`), and actively consumed by 13 distinct platform callers.

## Final Architecture & Decision

1. **Persistence Ownership Boundary**:
   - **`job_repository.py` is the canonical owner of the persistence write path** for `jobs` and `job_scores`.
   - The Job Discovery MCP Server (`backend/python/mcp/job_discovery`) is strictly scoped to **external data retrieval, live provider query dispatch, cross-provider deduplication, and normalized data structuring**.
   - The MCP tool `save_job` is maintained for protocol completeness but is marked as **INERT** (validates and formats, does not duplicate DB writes).

2. **100% Real Live Data — Zero Stubs**:
   - All legacy fallback stubs (`scan_greenhouse_api`, `scan_lever_api`, `scan_linkedin_source`, `scan_workday_source`, `_discover_via_stubs`) have been **completely purged** from `job_discovery_service.py`.
   - `JobDiscoveryAgent` (`agent.py`) is wired directly to live MCP discovery without hardcoded mock jobs.
   - `PostgresMCPServer` executes real PostgreSQL queries via the database connection pool.
   - `ai_job_copilot_service.py` runs live discovery rather than inserting fake seed records.

3. **Schema Compatibility**:
   - Migration `005_job_discovery_mcp_support.sql` applies non-breaking additive extensions (`source`, `job_url`, `posted_date`, `responsibilities`, `fingerprint`) to the existing `jobs` table, alongside audit tables (`job_search_runs`, `job_source_records`, `provider_health`).

4. **Zero Frontend Regressions**:
   - `/admin/jobs` continues to fetch from `/api/v2/jobs` and `/api/v2/jobs/metrics` without requiring frontend modifications.
