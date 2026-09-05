from __future__ import annotations

from django.db.models import Count, Sum
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from common.permissions import IsOwnerOrReadOnlyDefault

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsOwnerOrReadOnlyDefault]
    filterset_fields = ["type", "is_default"]
    search_fields = ["name"]
    ordering_fields = ["name", "type", "created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Category.objects.none()
        return (
            Category.objects.filter(user=self.request.user)
            .annotate(
                transaction_count=Count("transactions"),
                total_amount=Sum("transactions__amount"),
            )
        )

    def perform_destroy(self, instance):
        if instance.is_default:
            raise ValidationError("Default categories cannot be deleted.")
        if instance.transactions.exists():
            raise ValidationError(
                "This category is used by transactions. Reassign them via "
                "?reassign_to=<category_id> before deleting."
            )
        instance.delete()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        reassign_to = request.query_params.get("reassign_to")
        if reassign_to and not instance.is_default:
            target = Category.objects.filter(
                user=request.user, pk=reassign_to, type=instance.type
            ).first()
            if not target:
                raise ValidationError(
                    {"reassign_to": "Target category not found or type mismatch."}
                )
            instance.transactions.update(category=target)
            instance.delete()
            return Response(status=204)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def defaults(self, request):
        qs = self.get_queryset().filter(is_default=True)
        return Response(self.get_serializer(qs, many=True).data)
