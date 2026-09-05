"""Root URL configuration for the FinSight backend."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.permissions import AllowAny


def healthcheck(_request):
    return JsonResponse({"success": True, "data": {"status": "ok"}, "message": "healthy"})


api_patterns = [
    path("auth/", include("users.urls")),
    path("", include("accounts.urls")),
    path("", include("categories.urls")),
    path("", include("transactions.urls")),
    path("", include("statements.urls")),
    path("", include("analytics.urls")),
    path("", include("anomalies.urls")),
]

schema_view = SpectacularAPIView.as_view(permission_classes=[AllowAny])

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck),
    # OpenAPI schema + interactive docs
    path("api/schema/", schema_view, name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny]),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema", permission_classes=[AllowAny]),
        name="redoc",
    ),
    path("api/", include(api_patterns)),
]
