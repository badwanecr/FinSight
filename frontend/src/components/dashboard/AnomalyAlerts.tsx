import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { AnomalyAlert } from "@/types";
import SeverityChip from "@/components/common/SeverityChip";
import { formatCurrency } from "@/utils/format";
import { DETECTION_METHOD_LABELS } from "@/utils/constants";

export default function AnomalyAlerts({
  alerts,
  available,
}: {
  alerts: AnomalyAlert[];
  available: boolean;
}) {
  const navigate = useNavigate();

  if (!available) {
    return (
      <Alert severity="info" variant="outlined">
        Analytics are temporarily unavailable. Your transactions are safe.
      </Alert>
    );
  }

  if (!alerts.length) {
    return (
      <Alert severity="success" variant="outlined">
        No unusual spending detected.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      {alerts.map((a) => (
        <Alert
          key={`${a.transaction_id}-${a.detection_method}`}
          severity={a.severity === "CRITICAL" || a.severity === "HIGH" ? "warning" : "info"}
          variant="outlined"
          icon={false}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <SeverityChip severity={a.severity} />
                <Typography variant="caption" color="text.secondary">
                  {DETECTION_METHOD_LABELS[a.detection_method] ?? a.detection_method} ·{" "}
                  {a.category} · {formatCurrency(a.amount)}
                </Typography>
              </Stack>
              <Typography variant="body2">{a.reason}</Typography>
            </Box>
          </Stack>
        </Alert>
      ))}
      <Button size="small" onClick={() => navigate("/anomalies")} sx={{ alignSelf: "flex-start" }}>
        Review all anomalies
      </Button>
    </Stack>
  );
}
