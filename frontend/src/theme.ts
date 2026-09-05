import { createTheme } from "@mui/material/styles";

/**
 * FinSight design system — professional fintech: clean type, spacious layout,
 * subtle borders, minimal shadows, restrained palette.
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0B6BCB", dark: "#08529E", light: "#3E8AD8" },
    secondary: { main: "#5B6B7C" },
    success: { main: "#1E7F4F" },
    error: { main: "#C62828" },
    warning: { main: "#B26A00" },
    background: { default: "#F5F7FA", paper: "#FFFFFF" },
    text: { primary: "#1A2430", secondary: "#5B6B7C" },
    divider: "#E3E8EF",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: "1.75rem", fontWeight: 700 },
    h2: { fontSize: "1.5rem", fontWeight: 700 },
    h3: { fontSize: "1.25rem", fontWeight: 700 },
    h4: { fontSize: "1.1rem", fontWeight: 600 },
    h5: { fontSize: "1rem", fontWeight: 600 },
    h6: { fontSize: "0.95rem", fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: "1px solid #E3E8EF", borderRadius: 14 },
      },
    },
    MuiPaper: {
      styleOverrides: { outlined: { borderColor: "#E3E8EF" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: {
        root: { borderBottom: "1px solid #E3E8EF", backgroundColor: "#FFFFFF" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: "#5B6B7C", backgroundColor: "#FAFBFC" },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});
