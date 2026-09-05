import type { AccountType, Severity } from "@/types";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: "Bank",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
  WALLET: "Wallet",
  INVESTMENT: "Investment",
  OTHER: "Other",
};

export const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as AccountType, label }),
);

export const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP"];

/** Consistent visual semantics (design language §48). */
export const SEMANTIC_COLORS = {
  income: "#1E7F4F",
  expense: "#C62828",
  savings: "#0B6BCB",
  warning: "#B26A00",
  anomaly: "#8E24AA",
  neutral: "#5B6B7C",
};

export const SEVERITY_COLOR: Record<Severity, "default" | "info" | "warning" | "error"> = {
  LOW: "info",
  MEDIUM: "warning",
  HIGH: "error",
  CRITICAL: "error",
};

export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const DETECTION_METHOD_LABELS: Record<string, string> = {
  ZSCORE: "Z-Score",
  IQR: "IQR",
  ISOLATION_FOREST: "Isolation Forest",
};

export const TREND_WINDOWS = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "3m", label: "3 months", days: 90 },
  { value: "6m", label: "6 months", days: 180 },
  { value: "12m", label: "12 months", days: 365 },
];
