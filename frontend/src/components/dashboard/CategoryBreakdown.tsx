import { Box, Stack, Typography } from "@mui/material";
import type { CategoryBreakdownRow } from "@/types";
import CategoryDonut, { CATEGORY_PALETTE } from "@/components/charts/CategoryDonut";
import { formatCurrency } from "@/utils/format";
import { EmptyState } from "@/components/common/states";

export default function CategoryBreakdown({
  rows,
  currency = "INR",
  onSelect,
}: {
  rows: CategoryBreakdownRow[];
  currency?: string;
  onSelect?: (category: string) => void;
}) {
  if (!rows.length) {
    return <EmptyState title="No spending to break down yet" />;
  }

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
      <Box sx={{ width: { xs: "100%", md: 240 }, flexShrink: 0 }}>
        <CategoryDonut
          data={rows.map((r) => ({ category: r.category, total: r.total }))}
          currency={currency}
          onSelect={onSelect}
        />
      </Box>
      <Stack spacing={1} sx={{ flexGrow: 1, width: "100%" }}>
        {rows.slice(0, 6).map((r, i) => (
          <Stack
            key={r.category_id}
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ cursor: onSelect ? "pointer" : "default" }}
            onClick={() => onSelect?.(r.category)}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
                flexShrink: 0,
              }}
            />
            <Typography sx={{ flexGrow: 1 }} fontWeight={600} noWrap>
              {r.category}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {r.count} txn · {r.percentage.toFixed(1)}%
            </Typography>
            <Typography fontWeight={700} sx={{ minWidth: 88, textAlign: "right" }}>
              {formatCurrency(r.total, currency)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
