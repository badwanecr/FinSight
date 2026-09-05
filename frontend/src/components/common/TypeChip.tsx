import { Chip } from "@mui/material";
import type { TransactionType } from "@/types";

export default function TypeChip({ type }: { type: TransactionType }) {
  return (
    <Chip
      size="small"
      label={type === "INCOME" ? "Income" : "Expense"}
      color={type === "INCOME" ? "success" : "default"}
      variant="outlined"
      sx={type === "EXPENSE" ? { color: "error.main", borderColor: "error.light" } : undefined}
    />
  );
}
