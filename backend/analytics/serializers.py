from __future__ import annotations

from datetime import date

from rest_framework import serializers


class DateRangeSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get("start_date") and attrs.get("end_date"):
            if attrs["start_date"] > attrs["end_date"]:
                raise serializers.ValidationError("start_date must be on or before end_date.")
        return attrs


class TrendQuerySerializer(DateRangeSerializer):
    granularity = serializers.ChoiceField(
        choices=["daily", "weekly", "monthly"], default="monthly"
    )
    window = serializers.ChoiceField(
        choices=["7d", "30d", "3m", "6m", "12m", "custom"], default="6m", required=False
    )


class AnomalyQuerySerializer(DateRangeSerializer):
    method = serializers.ChoiceField(
        choices=["ZSCORE", "IQR", "ISOLATION_FOREST", "ALL"], default="ALL"
    )


class DashboardQuerySerializer(serializers.Serializer):
    year = serializers.IntegerField(required=False)
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)

    def validate(self, attrs):
        today = date.today()
        attrs["year"] = attrs.get("year") or today.year
        attrs["month"] = attrs.get("month") or today.month
        return attrs
