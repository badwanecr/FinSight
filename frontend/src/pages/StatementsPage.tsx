import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import PageHeader from "@/components/common/PageHeader";
import SectionCard from "@/components/common/SectionCard";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { downloadStatementCsv, useGetStatementQuery } from "@/services/statementsApi";
import { useListAccountsQuery } from "@/services/accountsApi";
import { useAuth } from "@/hooks";
import { formatCurrency, formatDate, monthLabel } from "@/utils/format";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: dayjs().month(i).format("MMMM"),
}));

const now = dayjs();
const YEARS = Array.from({ length: 6 }, (_, i) => now.year() - i);

export default function StatementsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { access } = useAuth();
  const { data: accounts } = useListAccountsQuery();

  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [account, setAccount] = useState<number | "">("");

  const { data, isLoading, isFetching, isError, refetch } = useGetStatementQuery({
    year,
    month,
    account: account || undefined,
  });

  const summaryRows = data
    ? [
        { label: "Opening Balance", value: data.opening_balance },
        { label: "Total Income", value: data.total_income, color: "success.main" },
        { label: "Total Expenses", value: data.total_expenses, color: "error.main" },
        { label: "Net Savings", value: data.net_savings, color: Number(data.net_savings) >= 0 ? "success.main" : "error.main" },
        { label: "Closing Balance", value: data.closing_balance },
      ]
    : [];

  const handleExport = async () => {
    try {
      await downloadStatementCsv({ year, month, account: account || undefined }, access);
      enqueueSnackbar("Statement exported.", { variant: "success" });
    } catch {
      enqueueSnackbar("Unable to export statement", { variant: "error" });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Statements"
        subtitle={monthLabel(year, month)}
        actions={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={!data || data.transaction_count === 0}
          >
            Export CSV
          </Button>
        }
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} fullWidth>
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} fullWidth>
              {YEARS.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Account"
              value={account}
              onChange={(e) => setAccount(e.target.value ? Number(e.target.value) : "")}
              fullWidth
            >
              <MenuItem value="">All accounts</MenuItem>
              {(accounts?.results ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {isLoading ? (
        <CardSkeleton height={200} />
      ) : isError ? (
        <ErrorState message="We couldn't load this statement." onRetry={refetch} />
      ) : data ? (
        <>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" },
              mb: 2,
              opacity: isFetching ? 0.6 : 1,
            }}
          >
            {summaryRows.map((r) => (
              <Card key={r.label}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    {r.label}
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 0.5, color: r.color }}>
                    {formatCurrency(r.value, data.currency)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <SectionCard title="Transactions" subtitle={`${data.transaction_count} in ${monthLabel(year, month)}`} dense>
            {data.transactions.length === 0 ? (
              <EmptyState title="No transactions in this period" />
            ) : (
              <TableContainer>
                <Table sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Merchant</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Account</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.transactions.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell>{formatDate(t.transaction_date)}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t.merchant || "—"}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>{t.account}</TableCell>
                        <TableCell>{t.transaction_type === "INCOME" ? "Income" : "Expense"}</TableCell>
                        <TableCell align="right">
                          <Typography
                            component="span"
                            fontWeight={700}
                            color={t.transaction_type === "INCOME" ? "success.main" : "error.main"}
                          >
                            {t.transaction_type === "INCOME" ? "+" : "−"}{" "}
                            {formatCurrency(Math.abs(Number(t.amount)), data.currency)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </>
      ) : null}
    </Box>
  );
}
