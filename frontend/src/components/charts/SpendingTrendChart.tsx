import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SEMANTIC_COLORS } from "@/utils/constants";
import { formatCurrency } from "@/utils/format";

interface Point {
  label: string;
  expense: number;
  income?: number;
}

export default function SpendingTrendChart({
  data,
  height = 300,
  currency = "INR",
  showIncome = false,
}: {
  data: Point[];
  height?: number;
  currency?: string;
  showIncome?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SEMANTIC_COLORS.expense} stopOpacity={0.28} />
            <stop offset="100%" stopColor={SEMANTIC_COLORS.expense} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SEMANTIC_COLORS.income} stopOpacity={0.22} />
            <stop offset="100%" stopColor={SEMANTIC_COLORS.income} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F6" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={72}
          tickFormatter={(v) => formatCurrency(v, currency, { notation: "compact" })}
        />
        <Tooltip
          formatter={(v: number) => formatCurrency(v, currency)}
          contentStyle={{ borderRadius: 10, border: "1px solid #E3E8EF" }}
        />
        {showIncome && (
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke={SEMANTIC_COLORS.income}
            strokeWidth={2}
            fill="url(#incomeGrad)"
          />
        )}
        <Area
          type="monotone"
          dataKey="expense"
          name="Spending"
          stroke={SEMANTIC_COLORS.expense}
          strokeWidth={2}
          fill="url(#spendGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
