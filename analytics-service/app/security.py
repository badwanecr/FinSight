from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status

from app.config import settings


async def require_service_token(authorization: str | None = Header(default=None)) -> None:
    """Service-to-service auth: Django presents ``Authorization: Bearer <token>``.

    Disabled when ``REQUIRE_SERVICE_TOKEN=false`` (local development only).
    """
    if not settings.require_service_token:
        return

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    presented = authorization.split(" ", 1)[1].strip()
    if not hmac.compare_digest(presented, settings.fastapi_service_token):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid service token")
