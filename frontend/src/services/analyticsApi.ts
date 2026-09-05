import { api } from "./api";
import type {
  AnalyticsCategories,
  AnalyticsSummary,
  AnalyticsTrends,
  AnalyzeResult,
  Dashboard,
} from "@/types";

interface DateRange {
  start_date?: string;
  end_date?: string;
}

export const analyticsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getDashboard: build.query<Dashboard, { year?: number; month?: number } | void>({
      query: (params) => ({ url: "/dashboard/", params: params || {} }),
      providesTags: ["Dashboard"],
    }),
    getAnalyticsSummary: build.query<AnalyticsSummary, DateRange | void>({
      query: (params) => ({ url: "/analytics/summary/", params: params || {} }),
      providesTags: ["Analytics"],
    }),
    getAnalyticsTrends: build.query<
      AnalyticsTrends,
      (DateRange & { granularity?: "daily" | "weekly" | "monthly" }) | void
    >({
      query: (params) => ({ url: "/analytics/trends/", params: params || {} }),
      providesTags: ["Analytics"],
    }),
    getAnalyticsCategories: build.query<AnalyticsCategories, DateRange | void>({
      query: (params) => ({ url: "/analytics/categories/", params: params || {} }),
      providesTags: ["Analytics"],
    }),
    analyze: build.query<AnalyzeResult, DateRange | void>({
      query: (params) => ({ url: "/analytics/analyze/", params: params || {} }),
      providesTags: ["Analytics"],
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetAnalyticsSummaryQuery,
  useGetAnalyticsTrendsQuery,
  useGetAnalyticsCategoriesQuery,
  useAnalyzeQuery,
} = analyticsApi;
