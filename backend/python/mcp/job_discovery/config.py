"""
Job Discovery MCP Server — Configuration Module

All configuration is environment-driven. No secrets in code, ever.
Supports local dev (stdio), Docker, staging, and production (HTTP).
"""

import os
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()


class ProviderConfig(BaseModel):
    """Configuration for a single job provider."""
    enabled: bool = True
    api_key: Optional[str] = None
    api_id: Optional[str] = None
    base_url: Optional[str] = None
    rate_limit_rpm: int = 60  # requests per minute
    timeout_seconds: float = 30.0
    max_retries: int = 3
    cache_ttl_seconds: int = 3600  # 1 hour default
    extra: Dict[str, Any] = Field(default_factory=dict)


class MCPServerConfig(BaseSettings):
    """Root configuration for the Job Discovery MCP Server."""

    # ── Server Identity ──────────────────────────────────────────────────
    server_name: str = "job-discovery-mcp"
    server_version: str = "1.0.0"

    # ── Transport ────────────────────────────────────────────────────────
    transport: str = Field(default="stdio", description="stdio | http")
    host: str = "0.0.0.0"
    port: int = 8100

    # ── Auth ─────────────────────────────────────────────────────────────
    mcp_bearer_token: Optional[str] = Field(
        default=None,
        description="Bearer token for production HTTP transport auth"
    )

    # ── Database & Environment (Dynamic: Local PostgreSQL vs Production Supabase)
    environment: str = Field(
        default_factory=lambda: os.getenv("ENVIRONMENT", os.getenv("NODE_ENV", "development")),
        description="Environment: development | staging | production"
    )

    supabase_url: Optional[str] = Field(
        default_factory=lambda: os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL")),
        description="Supabase project URL for production storage and auth"
    )
    supabase_key: Optional[str] = Field(
        default_factory=lambda: os.getenv("SUPABASE_SECRET_KEY", os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")))),
        description="Supabase API key (service role in backend / publishable in client)"
    )

    database_url: str = Field(
        default_factory=lambda: os.getenv("DATABASE_URL") or (
            f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:{os.getenv('POSTGRES_PASSWORD', 'postgres')}@{os.getenv('POSTGRES_HOST', '127.0.0.1')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'postgres')}"
        ),
        description="Dynamically resolved database URL: connects to Supabase in prod or local PostgreSQL in dev"
    )

    # ── Redis (optional, in-memory fallback for dev) ─────────────────────
    redis_url: Optional[str] = Field(
        default=None,
        description="Redis connection URL for caching/rate limiting"
    )

    # ── Feature Flags ────────────────────────────────────────────────────
    job_discovery_use_mcp: bool = Field(
        default=True,
        description="Master switch: when False, falls back to original stubs"
    )

    # ── Search Defaults ──────────────────────────────────────────────────
    default_search_limit: int = 50
    max_search_limit: int = 200
    concurrent_provider_timeout: float = 45.0

    # ── Provider Configurations ──────────────────────────────────────────
    # JSearch / OpenWeb Ninja / Google for Jobs (Primary & Single Provider)
    jsearch_enabled: bool = True
    jsearch_api_key: Optional[str] = Field(
        default_factory=lambda: os.getenv("JSEARCH_API_KEY", os.getenv("OPENWEBNINJA_API_KEY", os.getenv("RAPIDAPI_KEY")))
    )
    jsearch_base_url: str = Field(
        default_factory=lambda: os.getenv("JSEARCH_BASE_URL", "https://api.openwebninja.com/jsearch/search-v2")
    )
    jsearch_rate_limit_rpm: int = 60
    jsearch_cache_ttl: int = 1800  # 30 min
    jsearch_use_mock: bool = Field(
        default_factory=lambda: os.getenv("JSEARCH_USE_MOCK", os.getenv("MOCK_JSEARCH", "false")).lower() in ("true", "1", "yes"),
        description="When True, forces local mock data to avoid hitting real JSearch API rate limits."
    )

    # ── Logging ──────────────────────────────────────────────────────────
    log_level: str = "INFO"
    log_format: str = "json"  # json | text

    # ── Allowed URL Domains (security allowlist) ─────────────────────────
    allowed_domains: str = Field(
        default="jsearch.p.rapidapi.com,api.openwebninja.com,google.com",
        description="Comma-separated allowed external domains"
    )

    model_config = SettingsConfigDict(
        env_prefix="JOB_DISCOVERY_",
        env_file=".env",
        extra="ignore",
    )

    def get_provider_config(self, provider_name: str) -> ProviderConfig:
        """Build a ProviderConfig for a named provider from env settings."""
        configs = {
            "jsearch": ProviderConfig(
                enabled=self.jsearch_enabled,
                api_key=self.jsearch_api_key,
                base_url=self.jsearch_base_url,
                rate_limit_rpm=self.jsearch_rate_limit_rpm,
                cache_ttl_seconds=self.jsearch_cache_ttl,
                extra={"use_mock": self.jsearch_use_mock},
            ),
        }
        return configs.get(provider_name, ProviderConfig(enabled=False))

    @property
    def is_production(self) -> bool:
        """Returns True if running in production or configured with live Supabase."""
        if self.environment.lower() == "production":
            return True
        if self.supabase_url and "supabase.co" in self.supabase_url:
            return True
        return False

    def get_database_connection_url(self) -> str:
        """
        Dynamically returns the appropriate DB URL:
        - In Production: Supabase DB URL or DATABASE_URL
        - In Local Dev: Local PostgreSQL URL
        """
        if self.is_production:
            prod_db = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
            if prod_db and not prod_db.startswith("postgresql://postgres:postgres@127.0.0.1"):
                return prod_db
            return self.database_url or ""
        return self.database_url or "postgresql://postgres:postgres@127.0.0.1:5432/postgres"

    def get_allowed_domains(self) -> List[str]:
        """Parse comma-separated allowed domains into list."""
        return [d.strip().lower() for d in self.allowed_domains.split(",") if d.strip()]


# Singleton — import this everywhere
settings = MCPServerConfig()
