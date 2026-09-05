import { api } from "./api";
import type { Account, Paginated } from "@/types";

export const accountsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listAccounts: build.query<Paginated<Account>, { page_size?: number } | void>({
      query: (params) => ({ url: "/accounts/", params: params || { page_size: 100 } }),
      providesTags: ["Account"],
    }),
    getAccount: build.query<Account, number>({
      query: (id) => `/accounts/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Account", id }],
    }),
    createAccount: build.mutation<Account, Partial<Account> & { opening_balance?: number }>({
      query: (body) => ({ url: "/accounts/", method: "POST", body }),
      invalidatesTags: ["Account", "Dashboard"],
    }),
    updateAccount: build.mutation<Account, { id: number; body: Partial<Account> }>({
      query: ({ id, body }) => ({ url: `/accounts/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["Account", "Dashboard"],
    }),
    deleteAccount: build.mutation<void, number>({
      query: (id) => ({ url: `/accounts/${id}/`, method: "DELETE" }),
      invalidatesTags: ["Account", "Dashboard"],
    }),
  }),
});

export const {
  useListAccountsQuery,
  useGetAccountQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
} = accountsApi;
