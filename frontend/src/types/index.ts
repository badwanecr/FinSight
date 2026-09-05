// Shared domain types — mirror the Django/DRF payloads.

export type AccountType =
  | "BANK"
  | "CASH"
  | "CREDIT_CARD"
  | "WALLET"
  | "INVESTMENT"
  | "OTHER";

export type TransactionType = "INCOME" | "EXPENSE";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DetectionMethod = "ZSCORE" | "IQR" | "ISOLATION_FOREST";

export type AnomalyStatus = "OPEN" | "REVIEWED" | "IGNORED";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  error_code: string | null;
}

export interface Paginated<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  currency: string;
  default_account: number | null;
  notify_anomalies: boolean;
  notify_weekly_summary: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface Account {
  id: number;
  account_name: string;
  account_type: AccountType;
  balance: string;
  currency: string;
  is_active: boolean;
  transaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  is_default: boolean;
  transaction_count: number;
  total_amount: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  account: number;
  account_name: string;
  category: number;
  category_name: string;
  category_icon: string;
  amount: string;
  transaction_type: TransactionType;
  description: string;
  merchant: string;
  transaction_date: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionInput {
  account: number;
  category: number;
  amount: number;
  transaction_type: TransactionType;
  description?: string;
  merchant?: string;
  transaction_date: string;
}

export interface TransactionQuery {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  type?: TransactionType;
  account?: number;
  category?: number;
  category_name?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface Statement {
  month: number;
  year: number;
  period_start: string;
  period_end: string;
  account_id: number | null;
  account_name: string;
  currency: string;
  opening_balance: string;
  total_income: string;
  total_expenses: string;
  net_savings: string;
  closing_balance: string;
  transaction_count: number;
  transactions: Array<{
    id: number;
    transaction_date: string;
    merchant: string;
    description: string;
    category: string;
    account: string;
    transaction_type: TransactionType;
    amount: string;
  }>;
}

export interface DashboardSummary {
  period: { year: number; month: number; start: string; end: string };
  currency: string;
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  savings_rate: number;
  transaction_count: number;
}

export interface TrendBucket {
  label: string;
  month: string;
  expense: number;
  income: number;
}

export interface CategoryBreakdownRow {
  category_id: number;
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface TopExpense {
  id: number;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  account: string;
}

export interface RecentTransaction {
  id: number;
  date: string;
  merchant: string;
  category: string;
  account: string;
  type: TransactionType;
  amount: number;
}

export interface AnomalyAlert {
  transaction_id: number;
  amount: number;
  category: string;
  merchant?: string;
  date: string;
  detection_method: DetectionMethod;
  anomaly_score: number;
  severity: Severity;
  reason: string;
}

export interface Dashboard {
  summary: DashboardSummary;
  spending_trend: TrendBucket[];
  category_breakdown: CategoryBreakdownRow[];
  top_expenses: TopExpense[];
  recent_transactions: RecentTransaction[];
  analytics_available: boolean;
  anomaly_alerts: AnomalyAlert[];
}

export interface AnalyticsSummary {
  user_id: number;
  total_spending: number;
  total_income: number;
  average_transaction: number;
  median_transaction: number;
  smallest_transaction: number;
  largest_transaction: number;
  transaction_count: number;
  expense_count: number;
  monthly_average_spending: number;
  savings: number;
  savings_rate: number;
  period_start: string | null;
  period_end: string | null;
}

export interface AnalyticsTrends {
  user_id: number;
  granularity: "daily" | "weekly" | "monthly";
  points: Array<{
    period: string;
    spending: number;
    income: number;
    net: number;
    transaction_count: number;
  }>;
  average_monthly_spending: number;
  month_over_month_growth_pct: number | null;
  trend: "increasing" | "decreasing" | "stable";
}

export interface AnalyticsCategories {
  user_id: number;
  total_spending: number;
  largest_category: string | null;
  categories: Array<{
    category: string;
    total: number;
    percentage: number;
    count: number;
    average: number;
    maximum: number;
  }>;
}

export interface AnalyticsAnomalies {
  user_id: number;
  method: string;
  analysed_count: number;
  anomaly_count: number;
  anomalies: AnomalyAlert[];
}

export interface AnalyzeResult {
  user_id: number;
  summary: AnalyticsSummary;
  trends: AnalyticsTrends;
  categories: AnalyticsCategories;
  anomalies: AnalyticsAnomalies;
  insights: string[];
}

export interface Anomaly {
  id: number;
  transaction: number | null;
  detection_method: DetectionMethod;
  anomaly_score: number;
  severity: Severity;
  reason: string;
  amount: string;
  category: string;
  merchant: string;
  account: string;
  transaction_date: string | null;
  status: AnomalyStatus;
  reviewed: boolean;
  detected_at: string;
  updated_at: string;
}
