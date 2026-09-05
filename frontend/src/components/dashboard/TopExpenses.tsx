import { useNavigate } from "react-router-dom";
import {
  Avatar,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Typography,
} from "@mui/material";
import ReceiptIcon from "@mui/icons-material/ReceiptOutlined";
import type { TopExpense } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";
import { EmptyState } from "@/components/common/states";

export default function TopExpenses({
  items,
  currency = "INR",
}: {
  items: TopExpense[];
  currency?: string;
}) {
  const navigate = useNavigate();

  if (!items.length) {
    return <EmptyState title="No expenses yet this month" />;
  }

  return (
    <List disablePadding>
      {items.map((e) => (
        <ListItemButton
          key={e.id}
          onClick={() => navigate(`/transactions?focus=${e.id}`)}
          sx={{ borderRadius: 2, px: 1 }}
        >
          <ListItemAvatar>
            <Avatar variant="rounded" sx={{ bgcolor: "grey.100", color: "text.secondary" }}>
              <ReceiptIcon fontSize="small" />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={e.merchant}
            secondary={`${e.category} · ${formatDate(e.date)}`}
            primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
          />
          <Typography fontWeight={700} color="error.main">
            {formatCurrency(e.amount, currency)}
          </Typography>
        </ListItemButton>
      ))}
    </List>
  );
}
