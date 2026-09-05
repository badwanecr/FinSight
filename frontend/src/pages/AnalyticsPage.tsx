import { useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import PageHeader from "@/components/common/PageHeader";
import SectionCard from "@/components/common/SectionCard";
import StatCard from "@/components/common/StatCard";
import SpendingTrendChart from "@/components/charts/SpendingTrendChart";
import CategoryDonut from "@/components/charts/CategoryDonut";
import SeverityChip from "@/components/common/SeverityChip";
import { CardSkeleton, ErrorState } from "@/components/common/states";
import { useAnalyzeQuery, useGetAnalyticsTrendsQuery } from "@/services/analyticsApi";
import { useAuth } from "@/hooks";
import { errorMessage } from "@/services/api";
import { formatCurrency, formatPercent } from "@/utils/format";
import { SEMANTIC_COLORS } from "@/utils/constants";

type Granularity = "daily" | "weekly" | "monthly";

const TREND_ICON = {
  increasing: <TrendingUpIcon color="error" />,
  decreasing: <TrendingDownIcon color="success" />,
  stable: <TrendingFlatIcon color="disabled" />,
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "INR";
  const [granularity, setGranularity] = useState<Granularity>("monthly");

  const { data, isLoading, isError, error, refetch } = useAnalyzeQuery();
  const { data: trendData } = useGetAnalyticsTrendsQuery({ granularity });

  if (isLoading) {
    return (
      <Box>
        <PageHeader title="Analytics" />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" } }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} height={120} />
          ))}
        </Box>
        <Box sx={{ mt: 2 }}>
          <CardSkeleton height={300} />
        </Box>
      </Box>
    );
  }

  if (isError || !data) {
    const msg = errorMessage(error, "Analytics are temporarily unavailable.");
    return (
      <Box>
        <PageHeader title="Analytics" />
        <ErrorState
          severity="warning"
          title="Analytics unavailable"
          message={`${msg} Your transactions are safe.`}
          onRetry={refetch}
        />
      </Box>
    );
  }

  const { summary, categories, insights, anomalies, trends } = data;
  const trendPoints = (trendData?.points ?? trends.points).map((p) => ({
    label: p.period,
    expense: p.spending,
    income: p.income,
  }));

  return (
    <Box>
      <PageHeader title="Analytics" subtitle="A deeper look at your spending patterns" />

      {/* Overview */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" } }}>
        <StatCard label="Total Spending" value={formatCurrency(summary.total_spending, currency)} accent={SEMANTIC_COLORS.expense} />
        <StatCard label="Average Transaction" value={formatCurrency(summary.average_transaction, currency)} accent={SEMANTIC_COLORS.neutral} />
        <StatCard label="Median Transaction" value={formatCurrency(summary.median_transaction, currency)} accent={SEMANTIC_COLORS.neutral} />
        <StatCard
          label="Savings Rate"
          value={formatPercent(summary.savings_rate)}
          accent={summary.savings_rate >= 0 ? SEMANTIC_COLORS.income : SEMANTIC_COLORS.expense}
          hint={`Saved ${formatCurrency(summary.savings, currency)}`}
        />
      </Box>

      {/* Trends */}
      <Box sx={{ mt: 2 }}>
        <SectionCard
          title="Spending Trends"
          subtitle={`Month-over-month growth ${
            trends.month_over_month_growth_pct === null
              ? "—"
              : formatPercent(trends.month_over_month_growth_pct)
          }`}
          action={
            <ToggleButtonGroup
              size="small"
              exclusive
              value={granularity}
              onChange={(_e, v) => v && setGranularity(v)}
            >
              <ToggleButton value="daily">Daily</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
            </ToggleButtonGroup>
          }
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            {TREND_ICON[trends.trend]}
            <Typography variant="body2" color="text.secondary">
              Overall trend: <strong>{trends.trend}</strong> · avg monthly{" "}
              {formatCurrency(trends.average_monthly_spending, currency)}
            </Typography>
          </Stack>
          <SpendingTrendChart data={trendPoints} currency={currency} />
        </SectionCard>
      </Box>

      {/* Categories */}
      <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" } }}>
        <SectionCard title="Category Comparison">
          <CategoryDonut
            data={categories.categories.map((c) => ({ category: c.category, total: c.total }))}
            currency={currency}
          />
        </SectionCard>
        <SectionCard title="Category Breakdown" dense>
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">%</TableCell>
                  <TableCell align="right">Txns</TableCell>
                  <TableCell align="right">Avg</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.categories.map((c) => (
                  <TableRow key={c.category} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{c.category}</TableCell>
                    <TableCell align="right">{formatCurrency(c.total, currency)}</TableCell>
                    <TableCell align="right">{c.percentage.toFixed(1)}%</TableCell>
                    <TableCell align="right">{c.count}</TableCell>
                    <TableCell align="right">{formatCurrency(c.average, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      </Box>

      {/* Insights */}
      <Box sx={{ mt: 2 }}>
        <SectionCard title="Insights">
          <List dense>
            {insights.map((text, i) => (
              <ListItem key={i} disableGutters>
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <LightbulbIcon fontSize="small" color="warning" />
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Box>

      {/* Anomalies */}
      <Box sx={{ mt: 2 }}>
        <SectionCard
          title="Anomalies"
          subtitle={`${anomalies.anomaly_count} unusual transaction(s) in ${anomalies.analysed_count} analysed`}
        >
          {anomalies.anomalies.length === 0 ? (
            <Alert severity="success" variant="outlined">
              No unusual spending detected.
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {anomalies.anomalies.slice(0, 6).map((a) => (
                <Card key={`${a.transaction_id}-${a.detection_method}`} variant="outlined">
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <SeverityChip severity={a.severity} />
                      <Chip size="small" variant="outlined" label={a.category} />
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(a.amount, currency)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2">{a.reason}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </SectionCard>
      </Box>
    </Box>
  );
}
