import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  sidebarOpen: boolean;
}

const uiSlice = createSlice({
  name: "ui",
  initialState: { sidebarOpen: true } as UiState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebar: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebar } = uiSlice.actions;
export default uiSlice.reducer;
