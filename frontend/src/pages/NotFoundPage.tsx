import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h1">404</Typography>
        <Typography color="text.secondary">This page doesn't exist in FinSight.</Typography>
        <Button variant="contained" onClick={() => navigate("/")}>
          Back to dashboard
        </Button>
      </Stack>
    </Box>
  );
}
