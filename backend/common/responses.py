"""
Consistent API response envelope.

Every response — success or error — is shaped as::

    {"success": bool, "data": <payload|null>, "message": str, "error_code": str|null}

Paginated list responses keep their ``count`` / ``next`` / ``previous`` keys
inside ``data`` (see :class:`common.pagination.StandardResultsPagination`).
"""
from __future__ import annotations

from typing import Any

from rest_framework.renderers import JSONRenderer
from rest_framework.views import exception_handler as drf_exception_handler


class EnvelopeJSONRenderer(JSONRenderer):
    """Wrap raw view payloads in the standard success envelope."""

    def render(self, data: Any, accepted_media_type=None, renderer_context=None):
        renderer_context = renderer_context or {}
        response = renderer_context.get("response")
        status_code = getattr(response, "status_code", 200)

        # Already an envelope (e.g. produced by the exception handler) → pass through.
        if isinstance(data, dict) and "success" in data and "message" in data:
            return super().render(data, accepted_media_type, renderer_context)

        if status_code >= 400:
            message = "Unable to process request"
            error_code = None
            if isinstance(data, dict):
                message = _first_error_message(data) or message
                error_code = data.get("error_code")
            envelope = {
                "success": False,
                "data": data,
                "message": message,
                "error_code": error_code,
            }
        else:
            message = "Request successful"
            if isinstance(data, dict) and "detail" in data and len(data) == 1:
                message = str(data["detail"])
                data = None
            envelope = {
                "success": True,
                "data": data,
                "message": message,
                "error_code": None,
            }
        return super().render(envelope, accepted_media_type, renderer_context)


def _first_error_message(data: dict) -> str | None:
    if "detail" in data:
        return str(data["detail"])
    for value in data.values():
        if isinstance(value, (list, tuple)) and value:
            return str(value[0])
        if isinstance(value, str):
            return value
        if isinstance(value, dict):
            nested = _first_error_message(value)
            if nested:
                return nested
    return None


def envelope_exception_handler(exc, context):
    """DRF exception handler that returns the standard error envelope."""
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    message = _first_error_message(detail) if isinstance(detail, dict) else str(detail)
    error_code = getattr(exc, "default_code", None)

    response.data = {
        "success": False,
        "data": detail,
        "message": message or "Unable to process request",
        "error_code": error_code,
    }
    return response
