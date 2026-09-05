from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the analytics engine (all from the environment)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "finsight-analytics"
    environment: str = "development"

    # Shared secret Django presents as ``Authorization: Bearer <token>``.
    fastapi_service_token: str = "dev-service-token"
    # When false, requests are accepted without the bearer token (local dev only).
    require_service_token: bool = False

    # Anomaly detection knobs.
    zscore_threshold: float = 3.0
    iqr_multiplier: float = 1.5
    isolation_forest_contamination: float = 0.05
    min_group_size: int = 5
    max_transactions: int = 100_000

    log_level: str = "INFO"


settings = Settings()
