import dayjs from "dayjs";

const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

export function formatCurrency(
  value: number | string | null | undefined,
  currency = "INR",
  options: Intl.NumberFormatOptions = {},
): string {
  const num = typeof value === "string" ? parseFloat(value) : value ?? 0;
  const safe = Number.isFinite(num) ? (num as number) : 0;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || "en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      ...options,
    }).format(safe);
  } catch {
    return `${currency} ${safe.toFixed(0)}`;
  }
}

export function formatNumber(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat("en-IN").format(Number.isFinite(num) ? (num as number) : 0);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatDate(value: string | null | undefined, fmt = "DD MMM YYYY"): string {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format(fmt) : "—";
}

export function monthLabel(year: number, month: number): string {
  return dayjs(`${year}-${String(month).padStart(2, "0")}-01`).format("MMMM YYYY");
}

export function signedAmount(type: "INCOME" | "EXPENSE", amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const sign = type === "INCOME" ? "+" : "−";
  return `${sign} ${formatCurrency(Math.abs(num))}`;
}
