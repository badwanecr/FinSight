from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.analytics import router as analytics_router
from app.config import settings

logging.basicConfig(
    level=settings.log_level,
    format="level=%(levelname)s logger=%(name)s msg=%(message)s",
)
logger = logging.getLogger("finsight.analytics")

app = FastAPI(
    title="FinSight Analytics Engine",
    version="1.0.0",
    description="Stateless spending analytics and anomaly detection for FinSight.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # only Django talks to this service; it is not public.
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("invalid_input path=%s errors=%s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "message": "Invalid analytics payload", "detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("analytics_processing_error path=%s", request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": "Analytics processing failed"},
    )


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "service": settings.service_name, "environment": settings.environment}


app.include_router(analytics_router)
