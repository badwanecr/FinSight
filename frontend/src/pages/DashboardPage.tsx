import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import WalletIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import IncomeIcon from "@mui/icons-material/SouthWestOutlined";
import ExpenseIcon from "@mui/icons-material/NorthEastOutlined";
import SavingsIcon from "@mui/icons-material/SavingsOutlined";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import SectionCard from "@/components/common/SectionCard";
import SpendingTrendChart from "@/components/charts/SpendingTrendChart";
import IncomeExpenseChart from "@/components/charts/IncomeExpenseChart";
import CategoryBreakdown from "@/components/dashboard/CategoryBreakdown";
import TopExpenses from "@/components/dashboard/TopExpenses";
import RecentTransactionsTable from "@/components/dashboard/RecentTransactionsTable";
import AnomalyAlerts from "@/components/dashboard/AnomalyAlerts";
import { CardSkeleton, ErrorState } from "@/components/common/states";
import { useGetDashboardQuery } from "@/services/analyticsApi";
import { useAuth } from "@/hooks";
import { formatCurrency, formatPercent, monthLabel } from "@/utils/format";
import { SEMANTIC_COLORS } from "@/utils/constants";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useGetDashboardQuery();

  const trendData = useMemo(
    () => (data?.spending_trend ?? []).map((b) => ({ label: b.label, expense: b.expense, income: b.income })),
    [data],
  );

  if (isLoading) {
    return (
      <Box>
        <PageHeader title="Dashboard" />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4,1fr)" } }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} height={130} />
          ))}
        </Box>
        <Box sx={{ mt: 2 }}>
          <CardSkeleton height={320} />
        </Box>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box>
        <PageHeader title="Dashboard" />
        <ErrorState message="We couldn't load your dashboard." onRetry={refetch} />
      </Box>
    );
  }

  const s = data.summary;
  const currency = s.currency || user?.currency || "INR";

  return (
    <Box>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        subtitle={monthLabel(s.period.year, s.period.month)}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/transactions?new=1")}>
            Add transaction
          </Button>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
        }}
      >
        <StatCard
          label="Total Balance"
          value={formatCurrency(s.total_balance, currency)}
          accent={SEMANTIC_COLORS.savings}
          icon={<WalletIcon />}
          hint="Across active accounts"
        />
        <StatCard
          label="Monthly Income"
          value={formatCurrency(s.monthly_income, currency)}
          accent={SEMANTIC_COLORS.income}
          icon={<IncomeIcon />}
        />
        <StatCard
          label="Monthly Expenses"
          value={formatCurrency(s.monthly_expenses, currency)}
          accent={SEMANTIC_COLORS.expense}
          icon={<ExpenseIcon />}
        />
        <StatCard
          label="Monthly Savings"
          value={formatCurrency(s.monthly_savings, currency)}
          accent={s.monthly_savings >= 0 ? SEMANTIC_COLORS.income : SEMANTIC_COLORS.expense}
          icon={<SavingsIcon />}
          hint={`Savings rate ${formatPercent(s.savings_rate)}`}
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <SectionCard title="Spending Trend" subtitle="Last 6 months">
          <SpendingTrendChart data={trendData} currency={currency} showIncome />
        </SectionCard>
      </Box>

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        <SectionCard title="Income vs Expense" subtitle="Monthly comparison">
          <IncomeExpenseChart
            data={data.spending_trend.map((b) => ({ label: b.label, income: b.income, expense: b.expense }))}
            currency={currency}
          />
        </SectionCard>
        <SectionCard title="Category Breakdown" subtitle={monthLabel(s.period.year, s.period.month)}>
          <CategoryBreakdown
            rows={data.category_breakdown}
            currency={currency}
            onSelect={(category) => navigate(`/transactions?category_name=${encodeURIComponent(category)}`)}
          />
        </SectionCard>
      </Box>

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" },
        }}
      >
        <SectionCard title="Top Expenses" subtitle="This month">
          <TopExpenses items={data.top_expenses} currency={currency} />
        </SectionCard>
        <SectionCard
          title="Recent Transactions"
          action={
            <Button size="small" onClick={() => navigate("/transactions")}>
              View all
            </Button>
          }
          dense
        >
          <RecentTransactionsTable items={data.recent_transactions} currency={currency} />
        </SectionCard>
      </Box>

      <Box sx={{ mt: 2 }}>
        <SectionCard title="Anomaly Alerts" subtitle="Unusual activity in your recent spending">
          <AnomalyAlerts alerts={data.anomaly_alerts} available={data.analytics_available} />
        </SectionCard>
      </Box>

      <Stack sx={{ mt: 4, mb: 2 }} alignItems="center">
        <Box sx={{ color: "text.disabled", fontSize: 12 }}>
          FinSight · See your finances clearly. Spend smarter.
        </Box>
      </Stack>
    </Box>
  );
}
