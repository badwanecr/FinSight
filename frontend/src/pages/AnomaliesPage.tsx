import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import DoneIcon from "@mui/icons-material/CheckCircleOutline";
import BlockIcon from "@mui/icons-material/DoNotDisturbOnOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import { useSnackbar } from "notistack";
import PageHeader from "@/components/common/PageHeader";
import SeverityChip from "@/components/common/SeverityChip";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import {
  useDetectAnomaliesMutation,
  useIgnoreAnomalyMutation,
  useListAnomaliesQuery,
  useReopenAnomalyMutation,
  useReviewAnomalyMutation,
} from "@/services/anomaliesApi";
import type { AnomalyStatus, Severity } from "@/types";
import { DETECTION_METHOD_LABELS } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/format";
import { errorMessage } from "@/services/api";

const STATUS_CHIP: Record<AnomalyStatus, { label: string; color: "default" | "success" | "warning" }> = {
  OPEN: { label: "Open", color: "warning" },
  REVIEWED: { label: "Reviewed", color: "success" },
  IGNORED: { label: "Ignored", color: "default" },
};

export default function AnomaliesPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [severity, setSeverity] = useState<Severity | "">("");
  const [status, setStatus] = useState<AnomalyStatus | "">("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [ordering, setOrdering] = useState("anomaly_score");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isFetching, isError, refetch } = useListAnomaliesQuery({
    severity: severity || undefined,
    status: status || undefined,
    category: category || undefined,
    start_date: startDate || undefined,
    ordering,
    page,
    page_size: pageSize,
  });

  const [detect, { isLoading: detecting }] = useDetectAnomaliesMutation();
  const [review] = useReviewAnomalyMutation();
  const [ignore] = useIgnoreAnomalyMutation();
  const [reopen] = useReopenAnomalyMutation();

  const runDetection = async () => {
    try {
      const res = await detect({ method: "ALL" }).unwrap();
      enqueueSnackbar(`Detection complete — ${res.detected} flagged.`, { variant: "success" });
    } catch (err) {
      enqueueSnackbar(errorMessage(err, "Analytics are temporarily unavailable."), {
        variant: "warning",
      });
    }
  };

  const act = async (fn: (id: number) => Promise<unknown>, id: number, label: string) => {
    try {
      await fn(id);
      enqueueSnackbar(label, { variant: "success" });
    } catch (err) {
      enqueueSnackbar(errorMessage(err), { variant: "error" });
    }
  };

  const toggleSort = (field: string) =>
    setOrdering((o) => (o === field ? `-${field}` : field));
  const sortDir = (field: string): "asc" | "desc" | false =>
    ordering === field ? "asc" : ordering === `-${field}` ? "desc" : false;

  const rows = data?.results ?? [];

  return (
    <Box>
      <PageHeader
        title="Anomalies"
        subtitle="Transactions that look unusual for your spending history"
        actions={
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={runDetection}
            disabled={detecting}
          >
            {detecting ? "Running…" : "Run detection"}
          </Button>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr) auto" },
          alignItems: "center",
          mb: 2,
        }}
      >
        <TextField size="small" select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "")}>
          <MenuItem value="">All</MenuItem>
          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value as AnomalyStatus | "")}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="OPEN">Open</MenuItem>
          <MenuItem value="REVIEWED">Reviewed</MenuItem>
          <MenuItem value="IGNORED">Ignored</MenuItem>
        </TextField>
        <TextField size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <TextField
          size="small"
          label="From date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </Box>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : isError ? (
          <Box sx={{ p: 3 }}>
            <ErrorState
              severity="warning"
              title="Couldn't load anomalies"
              message="Analytics may be temporarily unavailable. Your transactions are safe."
              onRetry={refetch}
            />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <EmptyState
              title="No unusual spending detected."
              description="Run detection after adding more transactions to spot outliers."
            />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={sortDir("transaction_date")}>
                      <TableSortLabel
                        active={!!sortDir("transaction_date")}
                        direction={sortDir("transaction_date") || "desc"}
                        onClick={() => toggleSort("transaction_date")}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Merchant</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell sortDirection={sortDir("anomaly_score")}>
                      <TableSortLabel
                        active={!!sortDir("anomaly_score")}
                        direction={sortDir("anomaly_score") || "asc"}
                        onClick={() => toggleSort("anomaly_score")}
                      >
                        Severity
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={{ opacity: isFetching ? 0.6 : 1 }}>
                  {rows.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell>{formatDate(a.transaction_date)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{a.merchant || "—"}</TableCell>
                      <TableCell>{a.category}</TableCell>
                      <TableCell align="right">{formatCurrency(a.amount)}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {DETECTION_METHOD_LABELS[a.detection_method] ?? a.detection_method}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <SeverityChip severity={a.severity} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" color="text.secondary">
                          {a.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          color={
                            a.status === "REVIEWED"
                              ? "success.main"
                              : a.status === "OPEN"
                              ? "warning.main"
                              : "text.disabled"
                          }
                        >
                          {STATUS_CHIP[a.status].label}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {a.transaction && (
                            <Tooltip title="View transaction">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/transactions?focus=${a.transaction}`)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {a.status !== "REVIEWED" && (
                            <Tooltip title="Mark reviewed">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => act((id) => review(id).unwrap(), a.id, "Marked as reviewed.")}
                              >
                                <DoneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {a.status !== "IGNORED" && (
                            <Tooltip title="Ignore">
                              <IconButton
                                size="small"
                                onClick={() => act((id) => ignore(id).unwrap(), a.id, "Anomaly ignored.")}
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {a.status !== "OPEN" && (
                            <Tooltip title="Reopen">
                              <IconButton
                                size="small"
                                onClick={() => act((id) => reopen(id).unwrap(), a.id, "Anomaly reopened.")}
                              >
                                <UndoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data?.count ?? 0}
              page={page - 1}
              onPageChange={(_e, p) => setPage(p + 1)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </Card>
    </Box>
  );
}
