import { Chip } from "@mui/material";
import type { Severity } from "@/types";
import { SEVERITY_COLOR } from "@/utils/constants";

export default function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <Chip
      size="small"
      label={severity}
      color={SEVERITY_COLOR[severity]}
      variant={severity === "CRITICAL" ? "filled" : "outlined"}
    />
  );
}
