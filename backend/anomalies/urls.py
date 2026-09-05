from rest_framework.routers import DefaultRouter

from .views import AnomalyViewSet

router = DefaultRouter()
router.register("anomalies", AnomalyViewSet, basename="anomaly")

urlpatterns = router.urls
