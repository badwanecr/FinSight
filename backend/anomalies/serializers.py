from __future__ import annotations

from rest_framework import serializers

from .models import Anomaly, AnomalyStatus


class AnomalySerializer(serializers.ModelSerializer):
    account = serializers.CharField(source="transaction.account.account_name", read_only=True, default="")

    class Meta:
        model = Anomaly
        fields = (
            "id",
            "transaction",
            "detection_method",
            "anomaly_score",
            "severity",
            "reason",
            "amount",
            "category",
            "merchant",
            "account",
            "transaction_date",
            "status",
            "reviewed",
            "detected_at",
            "updated_at",
        )
        read_only_fields = fields


class AnomalyStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=AnomalyStatus.choices)

    def save(self, **kwargs):
        anomaly: Anomaly = self.context["anomaly"]
        anomaly.status = self.validated_data["status"]
        anomaly.reviewed = anomaly.status in {AnomalyStatus.REVIEWED, AnomalyStatus.IGNORED}
        anomaly.save(update_fields=["status", "reviewed", "updated_at"])
        return anomaly
