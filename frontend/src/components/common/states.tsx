import { ReactNode } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import InboxIcon from "@mui/icons-material/Inbox";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ py: 8 }}>
      <CircularProgress />
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
    </Stack>
  );
}

export function CardSkeleton({ height = 120 }: { height?: number }) {
  return <Skeleton variant="rounded" height={height} sx={{ borderRadius: 3 }} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={44} />
      ))}
    </Stack>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 6, textAlign: "center", borderStyle: "dashed", bgcolor: "background.default" }}
    >
      <Box sx={{ color: "text.disabled", mb: 1.5 }}>{icon ?? <InboxIcon fontSize="large" />}</Box>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ maxWidth: 420, mx: "auto", mb: 2 }}>
          {description}
        </Typography>
      )}
      {action}
    </Paper>
  );
}

export function ErrorState({
  message = "We couldn't load this right now.",
  onRetry,
  title = "Something went wrong",
  severity = "error",
}: {
  message?: string;
  onRetry?: () => void;
  title?: string;
  severity?: "error" | "warning" | "info";
}) {
  return (
    <Alert
      severity={severity}
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>{title}</AlertTitle>
      {message}
    </Alert>
  );
}
