import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { Mutex } from "./mutex";
import type { RootState } from "@/store";
import { tokensReceived, loggedOut } from "@/store/authSlice";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.access;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const mutex = new Mutex();

/**
 * Wraps fetchBaseQuery to:
 *  1. transparently unwrap the `{ success, data, message }` envelope
 *  2. refresh the JWT once on a 401 and retry the original request
 */
export const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, apiCtx, extraOptions) => {
  await mutex.waitForUnlock();
  let result = await rawBaseQuery(args, apiCtx, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refresh = (apiCtx.getState() as RootState).auth.refresh;
        if (refresh) {
          const refreshResult = await rawBaseQuery(
            { url: "/auth/refresh/", method: "POST", body: { refresh } },
            apiCtx,
            extraOptions,
          );
          const payload = (refreshResult.data as { data?: { access: string } })?.data;
          if (payload?.access) {
            apiCtx.dispatch(tokensReceived({ access: payload.access }));
            result = await rawBaseQuery(args, apiCtx, extraOptions);
          } else {
            apiCtx.dispatch(loggedOut());
          }
        } else {
          apiCtx.dispatch(loggedOut());
        }
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();
      result = await rawBaseQuery(args, apiCtx, extraOptions);
    }
  }

  // Unwrap the standard success envelope so hooks get `data` directly.
  if (result.data && typeof result.data === "object" && "success" in result.data) {
    const env = result.data as { success: boolean; data: unknown; message: string };
    if (env.success) {
      return { data: env.data };
    }
    return {
      error: {
        status: (result.meta?.response?.status ?? 400) as number,
        data: env,
      } as FetchBaseQueryError,
    };
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Account",
    "Category",
    "Transaction",
    "Statement",
    "Dashboard",
    "Analytics",
    "Anomaly",
    "User",
  ],
  endpoints: () => ({}),
});

/** Pull a human-readable message out of an RTK Query error. */
export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (typeof error === "object" && error !== null) {
    const e = error as { data?: { message?: string; detail?: string }; error?: string };
    return e.data?.message || e.data?.detail || e.error || fallback;
  }
  return fallback;
}
