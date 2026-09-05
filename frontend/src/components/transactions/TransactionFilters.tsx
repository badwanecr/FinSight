import { Box, Button, MenuItem, TextField } from "@mui/material";
import ClearIcon from "@mui/icons-material/Close";
import type { TransactionQuery } from "@/types";
import { useListAccountsQuery } from "@/services/accountsApi";
import { useListCategoriesQuery } from "@/services/categoriesApi";

interface Props {
  value: TransactionQuery;
  onChange: (patch: Partial<TransactionQuery>) => void;
  onReset: () => void;
}

export default function TransactionFilters({ value, onChange, onReset }: Props) {
  const { data: accounts } = useListAccountsQuery();
  const { data: categories } = useListCategoriesQuery();

  const hasFilters = Boolean(
    value.search ||
      value.type ||
      value.account ||
      value.category ||
      value.start_date ||
      value.end_date ||
      value.min_amount ||
      value.max_amount,
  );

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: {
          xs: "1fr 1fr",
          sm: "repeat(3, 1fr)",
          md: "2fr 1fr 1fr 1fr 1fr 1fr",
        },
        alignItems: "center",
        mb: 2,
      }}
    >
      <TextField
        size="small"
        label="Search merchant / description"
        value={value.search ?? ""}
        onChange={(e) => onChange({ search: e.target.value })}
        sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
      />
      <TextField
        size="small"
        select
        label="Type"
        value={value.type ?? ""}
        onChange={(e) => onChange({ type: (e.target.value || undefined) as TransactionQuery["type"] })}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="EXPENSE">Expense</MenuItem>
        <MenuItem value="INCOME">Income</MenuItem>
      </TextField>
      <TextField
        size="small"
        select
        label="Account"
        value={value.account ?? ""}
        onChange={(e) => onChange({ account: e.target.value ? Number(e.target.value) : undefined })}
      >
        <MenuItem value="">All</MenuItem>
        {(accounts?.results ?? []).map((a) => (
          <MenuItem key={a.id} value={a.id}>
            {a.account_name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        select
        label="Category"
        value={value.category ?? ""}
        onChange={(e) => onChange({ category: e.target.value ? Number(e.target.value) : undefined })}
      >
        <MenuItem value="">All</MenuItem>
        {(categories?.results ?? []).map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name} ({c.type === "INCOME" ? "In" : "Ex"})
          </MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        label="From"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={value.start_date ?? ""}
        onChange={(e) => onChange({ start_date: e.target.value || undefined })}
      />
      <TextField
        size="small"
        label="To"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={value.end_date ?? ""}
        onChange={(e) => onChange({ end_date: e.target.value || undefined })}
      />
      {hasFilters && (
        <Button
          size="small"
          startIcon={<ClearIcon />}
          onClick={onReset}
          sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, justifySelf: "start" }}
        >
          Clear filters
        </Button>
      )}
    </Box>
  );
}
