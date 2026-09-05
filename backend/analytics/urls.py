from django.urls import path

from .views import (
    AnalyzeView,
    AnomaliesView,
    CategoriesView,
    DashboardView,
    SummaryView,
    TrendsView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("analytics/summary/", SummaryView.as_view(), name="analytics-summary"),
    path("analytics/trends/", TrendsView.as_view(), name="analytics-trends"),
    path("analytics/categories/", CategoriesView.as_view(), name="analytics-categories"),
    path("analytics/anomalies/", AnomaliesView.as_view(), name="analytics-anomalies"),
    path("analytics/analyze/", AnalyzeView.as_view(), name="analytics-analyze"),
]
