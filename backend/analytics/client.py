"""
Thin HTTP client for the FastAPI analytics engine.

Design rules (see docs/ARCHITECTURE.md):
* Every call has a timeout.
* A FastAPI outage never propagates as a 500 — it raises
  :class:`AnalyticsUnavailable`, which the views translate into a friendly 503.
* Service-to-service auth uses a shared bearer token (``FASTAPI_SERVICE_TOKEN``).
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
from django.conf import settings

logger = logging.getLogger("finsight.analytics")


class AnalyticsUnavailable(Exception):
    """Raised when the analytics engine cannot fulfil a request."""

    default_message = "Analytics service is temporarily unavailable."

    def __init__(self, message: str | None = None):
        super().__init__(message or self.default_message)
        self.message = message or self.default_message


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.FASTAPI_SERVICE_TOKEN}",
        "Content-Type": "application/json",
    }


def call_analytics(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    """POST ``payload`` to ``{FASTAPI_URL}{path}`` and return the parsed JSON."""
    url = f"{settings.FASTAPI_URL.rstrip('/')}{path}"
    try:
        with httpx.Client(timeout=settings.FASTAPI_TIMEOUT_SECONDS) as client:
            response = client.post(url, json=payload, headers=_headers())
    except (httpx.TimeoutException, httpx.TransportError) as exc:
        logger.warning("analytics_call_failed path=%s error=%s", path, exc.__class__.__name__)
        raise AnalyticsUnavailable() from exc

    if response.status_code >= 500:
        logger.error("analytics_upstream_5xx path=%s status=%s", path, response.status_code)
        raise AnalyticsUnavailable()
    if response.status_code >= 400:
        logger.warning("analytics_bad_request path=%s status=%s body=%s", path, response.status_code, response.text[:300])
        raise AnalyticsUnavailable("Analytics request was rejected by the engine.")

    try:
        return response.json()
    except ValueError as exc:
        logger.error("analytics_invalid_json path=%s", path)
        raise AnalyticsUnavailable("Analytics engine returned an invalid response.") from exc


def ping() -> bool:
    try:
        with httpx.Client(timeout=2.0) as client:
            return client.get(f"{settings.FASTAPI_URL.rstrip('/')}/health").status_code == 200
    except httpx.HTTPError:
        return False
