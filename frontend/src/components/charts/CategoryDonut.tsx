import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/utils/format";

const PALETTE = [
  "#0B6BCB",
  "#1E7F4F",
  "#B26A00",
  "#8E24AA",
  "#C62828",
  "#00838F",
  "#5E35B1",
  "#2E7D32",
  "#EF6C00",
  "#455A64",
];

export interface DonutSlice {
  category: string;
  total: number;
}

export default function CategoryDonut({
  data,
  height = 260,
  currency = "INR",
  onSelect,
}: {
  data: DonutSlice[];
  height?: number;
  currency?: string;
  onSelect?: (category: string) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          innerRadius="58%"
          outerRadius="90%"
          paddingAngle={2}
          onClick={(entry: DonutSlice) => onSelect?.(entry.category)}
          cursor={onSelect ? "pointer" : "default"}
        >
          {data.map((entry, i) => (
            <Cell key={entry.category} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, name) => [formatCurrency(v, currency), name as string]}
          contentStyle={{ borderRadius: 10, border: "1px solid #E3E8EF" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export { PALETTE as CATEGORY_PALETTE };
