import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import SidebarContent from "./SidebarContent";
import { NAV_ITEMS } from "./navItems";
import { useAppDispatch, useAuth } from "@/hooks";
import { loggedOut } from "@/store/authSlice";
import { useLogoutMutation } from "@/services/authApi";

const DRAWER_WIDTH = 264;

export default function DashboardLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { refresh } = useAuth();
  const [logout] = useLogoutMutation();
  const { enqueueSnackbar } = useSnackbar();

  const currentTitle =
    NAV_ITEMS.find((n) => n.to === location.pathname)?.label ??
    (location.pathname.startsWith("/") ? "FinSight" : "FinSight");

  const handleLogout = async () => {
    try {
      if (refresh) await logout({ refresh }).unwrap();
    } catch {
      /* logout is best-effort */
    }
    dispatch(loggedOut());
    enqueueSnackbar("Signed out", { variant: "success" });
    navigate("/login", { replace: true });
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {isDesktop ? (
          <Drawer
            variant="permanent"
            open
            sx={{
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH,
                boxSizing: "border-box",
                borderRight: "1px solid",
                borderColor: "divider",
              },
            }}
          >
            <SidebarContent onLogout={handleLogout} />
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}
          >
            <SidebarContent
              onLogout={handleLogout}
              onNavigate={() => setMobileOpen(false)}
            />
          </Drawer>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <AppBar position="sticky">
          <Toolbar>
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h4" sx={{ flexGrow: 1 }}>
              {currentTitle}
            </Typography>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1360, mx: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
