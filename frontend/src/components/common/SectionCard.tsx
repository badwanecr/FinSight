import { ReactNode } from "react";
import { Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
  dense = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: 2.5, py: 1.75 }}
      >
        <Box>
          <Typography variant="h4">{title}</Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      <Divider />
      <CardContent sx={{ p: dense ? 1 : 2.5 }}>{children}</CardContent>
    </Card>
  );
}
