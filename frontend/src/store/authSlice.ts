import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types";

const STORAGE_KEY = "finsight.auth";

interface AuthState {
  access: string | null;
  refresh: string | null;
  user: User | null;
}

function load(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuthState;
  } catch {
    /* ignore corrupt storage */
  }
  return { access: null, refresh: null, user: null };
}

function persist(state: AuthState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — session-only auth */
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: load(),
  reducers: {
    credentialsReceived: (
      state,
      action: PayloadAction<{ access: string; refresh: string; user: User }>,
    ) => {
      state.access = action.payload.access;
      state.refresh = action.payload.refresh;
      state.user = action.payload.user;
      persist(state);
    },
    tokensReceived: (state, action: PayloadAction<{ access: string }>) => {
      state.access = action.payload.access;
      persist(state);
    },
    userUpdated: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      persist(state);
    },
    loggedOut: (state) => {
      state.access = null;
      state.refresh = null;
      state.user = null;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
  },
});

export const { credentialsReceived, tokensReceived, userUpdated, loggedOut } =
  authSlice.actions;
export default authSlice.reducer;
