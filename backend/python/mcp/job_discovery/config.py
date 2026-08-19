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
    # Remotive (free, no API key required)
    remotive_enabled: bool = True
    remotive_base_url: str = "https://remotive.com/api"
    remotive_rate_limit_rpm: int = 30
    remotive_cache_ttl: int = 1800  # 30 min

    # Himalayas (free tier)
    himalayas_enabled: bool = True
    himalayas_base_url: str = "https://himalayas.app/jobs/api"
    himalayas_rate_limit_rpm: int = 30
    himalayas_cache_ttl: int = 1800

    # Adzuna (requires credentials)
    adzuna_enabled: bool = False
    adzuna_app_id: Optional[str] = None
    adzuna_api_key: Optional[str] = None
    adzuna_base_url: str = "https://api.adzuna.com/v1/api"
    adzuna_country: str = "us"
    adzuna_rate_limit_rpm: int = 60
    adzuna_cache_ttl: int = 3600

    # Greenhouse (public board API, company-configurable)
    greenhouse_enabled: bool = True
    greenhouse_board_tokens: str = Field(
        default="",
        description="Comma-separated Greenhouse board tokens e.g. 'figma,stripe,airbnb'"
    )
    greenhouse_rate_limit_rpm: int = 30
    greenhouse_cache_ttl: int = 3600

    # Lever (public postings API, company-configurable)
    lever_enabled: bool = True
    lever_companies: str = Field(
        default="",
        description="Comma-separated Lever company slugs e.g. 'stripe,netlify'"
    )
    lever_rate_limit_rpm: int = 30
    lever_cache_ttl: int = 3600

    # JobSpy (optional adapter)
    jobspy_enabled: bool = False
    jobspy_rate_limit_rpm: int = 10
    jobspy_cache_ttl: int = 3600

    # ── Additional Major Portals ──────────────────────────────────────────
    # LinkedIn (live public guest jobs search)
    linkedin_enabled: bool = True
    linkedin_rate_limit_rpm: int = 20
    linkedin_cache_ttl: int = 1800

    # RemoteOK (live tech jobs API)
    remoteok_enabled: bool = True
    remoteok_rate_limit_rpm: int = 30
    remoteok_cache_ttl: int = 1800

    # Arbeitnow (live EU/US/Remote tech jobs API)
    arbeitnow_enabled: bool = True
    arbeitnow_rate_limit_rpm: int = 30
    arbeitnow_cache_ttl: int = 1800

    # The Muse (public tech & enterprise API)
    themuse_enabled: bool = True
    themuse_rate_limit_rpm: int = 30
    themuse_cache_ttl: int = 3600

    # Indeed
    indeed_enabled: bool = True
    indeed_rate_limit_rpm: int = 20
    indeed_cache_ttl: int = 1800

    # Naukri
    naukri_enabled: bool = True
    naukri_rate_limit_rpm: int = 20
    naukri_cache_ttl: int = 1800

    # ── Logging ──────────────────────────────────────────────────────────
    log_level: str = "INFO"
    log_format: str = "json"  # json | text

    # ── Allowed URL Domains (security allowlist) ─────────────────────────
    allowed_domains: str = Field(
        default="remotive.com,himalayas.app,api.adzuna.com,boards-api.greenhouse.io,api.lever.co,linkedin.com,remoteok.com,arbeitnow.com,themuse.com,naukri.com,indeed.com",
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
            "remotive": ProviderConfig(
                enabled=self.remotive_enabled,
                base_url=self.remotive_base_url,
                rate_limit_rpm=self.remotive_rate_limit_rpm,
                cache_ttl_seconds=self.remotive_cache_ttl,
            ),
            "himalayas": ProviderConfig(
                enabled=self.himalayas_enabled,
                base_url=self.himalayas_base_url,
                rate_limit_rpm=self.himalayas_rate_limit_rpm,
                cache_ttl_seconds=self.himalayas_cache_ttl,
            ),
            "linkedin": ProviderConfig(
                enabled=self.linkedin_enabled,
                rate_limit_rpm=self.linkedin_rate_limit_rpm,
                cache_ttl_seconds=self.linkedin_cache_ttl,
            ),
            "remoteok": ProviderConfig(
                enabled=self.remoteok_enabled,
                base_url="https://remoteok.com/api",
                rate_limit_rpm=self.remoteok_rate_limit_rpm,
                cache_ttl_seconds=self.remoteok_cache_ttl,
            ),
            "arbeitnow": ProviderConfig(
                enabled=self.arbeitnow_enabled,
                base_url="https://www.arbeitnow.com/api/job-board-api",
                rate_limit_rpm=self.arbeitnow_rate_limit_rpm,
                cache_ttl_seconds=self.arbeitnow_cache_ttl,
            ),
            "themuse": ProviderConfig(
                enabled=self.themuse_enabled,
                base_url="https://www.themuse.com/api/public/jobs",
                rate_limit_rpm=self.themuse_rate_limit_rpm,
                cache_ttl_seconds=self.themuse_cache_ttl,
            ),
            "indeed": ProviderConfig(
                enabled=self.indeed_enabled,
                rate_limit_rpm=self.indeed_rate_limit_rpm,
                cache_ttl_seconds=self.indeed_cache_ttl,
            ),
            "naukri": ProviderConfig(
                enabled=self.naukri_enabled,
                rate_limit_rpm=self.naukri_rate_limit_rpm,
                cache_ttl_seconds=self.naukri_cache_ttl,
            ),
            "adzuna": ProviderConfig(
                enabled=self.adzuna_enabled and bool(self.adzuna_app_id) and bool(self.adzuna_api_key),
                api_key=self.adzuna_api_key,
                api_id=self.adzuna_app_id,
                base_url=self.adzuna_base_url,
                rate_limit_rpm=self.adzuna_rate_limit_rpm,
                cache_ttl_seconds=self.adzuna_cache_ttl,
                extra={"country": self.adzuna_country},
            ),
            "greenhouse": ProviderConfig(
                enabled=self.greenhouse_enabled and bool(self.greenhouse_board_tokens),
                base_url="https://boards-api.greenhouse.io/v1",
                rate_limit_rpm=self.greenhouse_rate_limit_rpm,
                cache_ttl_seconds=self.greenhouse_cache_ttl,
                extra={"board_tokens": [t.strip() for t in self.greenhouse_board_tokens.split(",") if t.strip()]},
            ),
            "lever": ProviderConfig(
                enabled=self.lever_enabled and bool(self.lever_companies),
                base_url="https://api.lever.co/v0",
                rate_limit_rpm=self.lever_rate_limit_rpm,
                cache_ttl_seconds=self.lever_cache_ttl,
                extra={"companies": [c.strip() for c in self.lever_companies.split(",") if c.strip()]},
            ),
            "jobspy": ProviderConfig(
                enabled=self.jobspy_enabled,
                rate_limit_rpm=self.jobspy_rate_limit_rpm,
                cache_ttl_seconds=self.jobspy_cache_ttl,
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
