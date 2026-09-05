import DashboardIcon from "@mui/icons-material/SpaceDashboardOutlined";
import ReceiptIcon from "@mui/icons-material/ReceiptLongOutlined";
import AccountsIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import StatementIcon from "@mui/icons-material/DescriptionOutlined";
import AnalyticsIcon from "@mui/icons-material/InsightsOutlined";
import AnomalyIcon from "@mui/icons-material/WarningAmberOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export interface NavItem {
  label: string;
  to: string;
  icon: SvgIconComponent;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: DashboardIcon },
  { label: "Transactions", to: "/transactions", icon: ReceiptIcon },
  { label: "Accounts", to: "/accounts", icon: AccountsIcon },
  { label: "Categories", to: "/categories", icon: CategoryIcon },
  { label: "Statements", to: "/statements", icon: StatementIcon },
  { label: "Analytics", to: "/analytics", icon: AnalyticsIcon },
  { label: "Anomalies", to: "/anomalies", icon: AnomalyIcon },
  { label: "Settings", to: "/settings", icon: SettingsIcon },
];
