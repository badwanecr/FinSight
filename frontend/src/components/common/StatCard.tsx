import { ReactNode } from "react";
import { Card, CardContent, Stack, Typography } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

interface Props {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  icon?: ReactNode;
  delta?: number | null;
  deltaGoodWhenPositive?: boolean;
}

export default function StatCard({
  label,
  value,
  hint,
  accent,
  icon,
  delta,
  deltaGoodWhenPositive = true,
}: Props) {
  const showDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;
  const good = positive === deltaGoodWhenPositive;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.4 }}>
            {label}
          </Typography>
          {icon && <span style={{ color: accent }}>{icon}</span>}
        </Stack>
        <Typography variant="h2" sx={{ mt: 0.5, color: accent }}>
          {value}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, minHeight: 22 }}>
          {showDelta && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.25}
              sx={{ color: good ? "success.main" : "error.main", fontSize: 13, fontWeight: 700 }}
            >
              {positive ? (
                <ArrowUpwardIcon sx={{ fontSize: 14 }} />
              ) : (
                <ArrowDownwardIcon sx={{ fontSize: 14 }} />
              )}
              {Math.abs(delta as number).toFixed(1)}%
            </Stack>
          )}
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
