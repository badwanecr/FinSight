import { api } from "./api";
import type {
  Paginated,
  Transaction,
  TransactionInput,
  TransactionQuery,
} from "@/types";

function cleanParams(q: TransactionQuery): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(q).filter(([, v]) => v !== undefined && v !== "" && v !== null),
  );
}

export const transactionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listTransactions: build.query<Paginated<Transaction>, TransactionQuery | void>({
      query: (q) => ({ url: "/transactions/", params: cleanParams(q || {}) }),
      providesTags: ["Transaction"],
    }),
    getTransaction: build.query<Transaction, number>({
      query: (id) => `/transactions/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Transaction", id }],
    }),
    createTransaction: build.mutation<Transaction, TransactionInput>({
      query: (body) => ({ url: "/transactions/", method: "POST", body }),
      invalidatesTags: ["Transaction", "Account", "Dashboard", "Analytics", "Anomaly"],
    }),
    updateTransaction: build.mutation<
      Transaction,
      { id: number; body: Partial<TransactionInput> }
    >({
      query: ({ id, body }) => ({ url: `/transactions/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["Transaction", "Account", "Dashboard", "Analytics", "Anomaly"],
    }),
    deleteTransaction: build.mutation<void, number>({
      query: (id) => ({ url: `/transactions/${id}/`, method: "DELETE" }),
      invalidatesTags: ["Transaction", "Account", "Dashboard", "Analytics", "Anomaly"],
    }),
  }),
});

export const {
  useListTransactionsQuery,
  useGetTransactionQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = transactionsApi;
