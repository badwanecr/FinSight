import { api } from "./api";
import type { Category, Paginated, TransactionType } from "@/types";

export const categoriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    listCategories: build.query<
      Paginated<Category>,
      { type?: TransactionType; page_size?: number } | void
    >({
      query: (params) => ({
        url: "/categories/",
        params: { page_size: 200, ...(params || {}) },
      }),
      providesTags: ["Category"],
    }),
    createCategory: build.mutation<Category, { name: string; type: TransactionType; icon?: string }>({
      query: (body) => ({ url: "/categories/", method: "POST", body }),
      invalidatesTags: ["Category"],
    }),
    updateCategory: build.mutation<Category, { id: number; body: Partial<Category> }>({
      query: ({ id, body }) => ({ url: `/categories/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["Category"],
    }),
    deleteCategory: build.mutation<void, { id: number; reassign_to?: number }>({
      query: ({ id, reassign_to }) => ({
        url: `/categories/${id}/`,
        method: "DELETE",
        params: reassign_to ? { reassign_to } : undefined,
      }),
      invalidatesTags: ["Category", "Transaction"],
    }),
  }),
});

export const {
  useListCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
