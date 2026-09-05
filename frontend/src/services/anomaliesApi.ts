import { api } from "./api";
import type { Anomaly, AnomalyStatus, Paginated, Severity } from "@/types";

interface AnomalyQuery {
  severity?: Severity;
  status?: AnomalyStatus;
  detection_method?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const anomaliesApi = api.injectEndpoints({
  endpoints: (build) => ({
    listAnomalies: build.query<Paginated<Anomaly>, AnomalyQuery | void>({
      query: (params) => ({
        url: "/anomalies/",
        params: Object.fromEntries(
          Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== ""),
        ),
      }),
      providesTags: ["Anomaly"],
    }),
    detectAnomalies: build.mutation<
      { detected: number; anomalies: Anomaly[] },
      { method?: string }
    >({
      query: (body) => ({ url: "/anomalies/detect/", method: "POST", body }),
      invalidatesTags: ["Anomaly"],
    }),
    reviewAnomaly: build.mutation<Anomaly, number>({
      query: (id) => ({ url: `/anomalies/${id}/review/`, method: "POST" }),
      invalidatesTags: ["Anomaly"],
    }),
    ignoreAnomaly: build.mutation<Anomaly, number>({
      query: (id) => ({ url: `/anomalies/${id}/ignore/`, method: "POST" }),
      invalidatesTags: ["Anomaly"],
    }),
    reopenAnomaly: build.mutation<Anomaly, number>({
      query: (id) => ({ url: `/anomalies/${id}/reopen/`, method: "POST" }),
      invalidatesTags: ["Anomaly"],
    }),
  }),
});

export const {
  useListAnomaliesQuery,
  useDetectAnomaliesMutation,
  useReviewAnomalyMutation,
  useIgnoreAnomalyMutation,
  useReopenAnomalyMutation,
} = anomaliesApi;
