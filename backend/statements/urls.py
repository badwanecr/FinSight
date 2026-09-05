from django.urls import path

from .views import StatementView

urlpatterns = [
    path("statements/", StatementView.as_view(), name="statements"),
]
