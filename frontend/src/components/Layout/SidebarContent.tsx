import {
  Avatar,
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";
import { useAuth } from "@/hooks";

interface Props {
  onNavigate?: () => void;
  onLogout: () => void;
}

export default function SidebarContent({ onNavigate, onLogout }: Props) {
  const { user } = useAuth();

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2.5, py: 2.5 }}>
        <Avatar variant="rounded" sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
          <TrendingUpIcon fontSize="small" />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ lineHeight: 1 }}>
            FinSight
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Spend smarter
          </Typography>
        </Box>
      </Stack>
      <Divider />

      <List sx={{ px: 1.5, py: 1.5, flexGrow: 1 }}>
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              "&.active": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "& .MuiListItemIcon-root": { color: "primary.contrastText" },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>

      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 1.5, py: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", fontSize: 14 }}>
            {(user?.name || "U").charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Stack>
        <ListItemButton onClick={onLogout} sx={{ borderRadius: 2, mt: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 38 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
        </ListItemButton>
      </Box>
    </Box>
  );
}
