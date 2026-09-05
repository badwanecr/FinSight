from __future__ import annotations

import csv
from dataclasses import asdict

from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import StatementQuerySerializer, StatementSerializer
from .services import build_statement


@extend_schema(
    tags=["statements"],
    summary="Monthly statement",
    description="Opening / closing balance, income, expenses, net savings and the line "
    "items for the selected month and (optional) account. `format=csv` streams a "
    "downloadable file instead of JSON.",
    parameters=[StatementQuerySerializer],
    responses={200: StatementSerializer},
)
class StatementView(APIView):
    """GET /api/statements?year=2026&month=8&account=3&format=json|csv"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = StatementQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        data = params.validated_data

        statement = build_statement(
            user=request.user,
            year=data["year"],
            month=data["month"],
            account_id=data.get("account"),
        )

        if data["format"] == "csv":
            return self._csv_response(statement)

        return Response(StatementSerializer(asdict(statement)).data)

    @staticmethod
    def _csv_response(statement) -> HttpResponse:
        response = HttpResponse(content_type="text/csv")
        filename = f"finsight-statement-{statement.year}-{statement.month:02d}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        writer = csv.writer(response)
        writer.writerow(["FinSight statement", statement.account_name])
        writer.writerow(["Period", statement.period_start, "to", statement.period_end])
        writer.writerow(["Opening balance", statement.opening_balance])
        writer.writerow(["Total income", statement.total_income])
        writer.writerow(["Total expenses", statement.total_expenses])
        writer.writerow(["Net savings", statement.net_savings])
        writer.writerow(["Closing balance", statement.closing_balance])
        writer.writerow([])
        writer.writerow(["Date", "Merchant", "Description", "Category", "Account", "Type", "Amount"])
        for line in statement.transactions:
            writer.writerow(
                [
                    line.transaction_date,
                    line.merchant,
                    line.description,
                    line.category,
                    line.account,
                    line.transaction_type,
                    line.amount,
                ]
            )
        return response
