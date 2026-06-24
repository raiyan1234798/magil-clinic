import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/api";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_COLORS[status] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {label}
    </Badge>
  );
}
