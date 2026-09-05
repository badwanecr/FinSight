import { api } from "./api";
import type { Statement } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const statementsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStatement: build.query<
      Statement,
      { year: number; month: number; account?: number }
    >({
      query: ({ year, month, account }) => ({
        url: "/statements/",
        params: { year, month, ...(account ? { account } : {}) },
      }),
      providesTags: ["Statement"],
    }),
  }),
});

export const { useGetStatementQuery } = statementsApi;

/** CSV export needs a raw fetch (blob response, auth header). */
export async function downloadStatementCsv(
  params: { year: number; month: number; account?: number },
  token: string | null,
): Promise<void> {
  const qs = new URLSearchParams({
    year: String(params.year),
    month: String(params.month),
    format: "csv",
    ...(params.account ? { account: String(params.account) } : {}),
  });
  const res = await fetch(`${API_BASE_URL}/statements/?${qs.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Unable to export statement");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finsight-statement-${params.year}-${String(params.month).padStart(2, "0")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
