from __future__ import annotations

from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    transaction_count = serializers.IntegerField(read_only=True)
    total_amount = serializers.DecimalField(
        max_digits=16, decimal_places=2, read_only=True
    )

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "type",
            "icon",
            "is_default",
            "transaction_count",
            "total_amount",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_default", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context["request"]
        name = attrs.get("name", getattr(self.instance, "name", None))
        ctype = attrs.get("type", getattr(self.instance, "type", None))
        qs = Category.objects.filter(user=request.user, name__iexact=name, type=ctype)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"name": "You already have a category with this name and type."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
