import { ReactNode } from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "#fff",
                display: "grid",
                placeItems: "center",
              }}
            >
              <TrendingUpIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h3" sx={{ lineHeight: 1 }}>
                FinSight
              </Typography>
              <Typography variant="caption" color="text.secondary">
                See your finances clearly.
              </Typography>
            </Box>
          </Stack>

          <Typography variant="h2" gutterBottom>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {subtitle}
          </Typography>

          {children}

          <Box sx={{ mt: 3, textAlign: "center" }}>{footer}</Box>
        </CardContent>
      </Card>
    </Box>
  );
}
