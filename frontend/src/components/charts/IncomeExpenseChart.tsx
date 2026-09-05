import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SEMANTIC_COLORS } from "@/utils/constants";
import { formatCurrency } from "@/utils/format";

interface Point {
  label: string;
  income: number;
  expense: number;
}

export default function IncomeExpenseChart({
  data,
  height = 300,
  currency = "INR",
}: {
  data: Point[];
  height?: number;
  currency?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barGap={4}>
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
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill={SEMANTIC_COLORS.income} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill={SEMANTIC_COLORS.expense} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
