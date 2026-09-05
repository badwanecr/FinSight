import { api } from "./api";
import type { AuthResponse, User } from "@/types";

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login/", method: "POST", body }),
    }),
    register: build.mutation<
      AuthResponse,
      { name: string; email: string; password: string }
    >({
      query: (body) => ({ url: "/auth/register/", method: "POST", body }),
    }),
    logout: build.mutation<{ detail: string }, { refresh: string }>({
      query: (body) => ({ url: "/auth/logout/", method: "POST", body }),
    }),
    me: build.query<User, void>({
      query: () => "/auth/me/",
      providesTags: ["User"],
    }),
    updateProfile: build.mutation<User, Partial<User>>({
      query: (body) => ({ url: "/auth/me/", method: "PATCH", body }),
      invalidatesTags: ["User"],
    }),
    changePassword: build.mutation<
      { detail: string },
      { current_password: string; new_password: string }
    >({
      query: (body) => ({ url: "/auth/change-password/", method: "POST", body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = authApi;
