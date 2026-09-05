import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { RecentTransaction } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";
import { EmptyState } from "@/components/common/states";

export default function RecentTransactionsTable({
  items,
  currency = "INR",
}: {
  items: RecentTransaction[];
  currency?: string;
}) {
  if (!items.length) {
    return (
      <EmptyState
        title="No transactions yet"
        description="Add your first transaction to start tracking your finances."
      />
    );
  }

  return (
    <TableContainer sx={{ maxHeight: 360 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Merchant</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Account</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((t) => (
            <TableRow key={t.id} hover>
              <TableCell>{formatDate(t.date, "DD MMM")}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t.merchant}</TableCell>
              <TableCell>{t.category}</TableCell>
              <TableCell>{t.account}</TableCell>
              <TableCell align="right">
                <Typography
                  component="span"
                  fontWeight={700}
                  color={t.type === "INCOME" ? "success.main" : "error.main"}
                >
                  {t.type === "INCOME" ? "+" : "−"} {formatCurrency(Math.abs(t.amount), currency)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
