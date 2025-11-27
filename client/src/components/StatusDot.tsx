import { cn } from "@/lib/utils";

interface StatusDotProps {
  status: "online" | "away" | "busy" | "offline";
  size?: "sm" | "md" | "lg";
  className?: string;
  showPulse?: boolean;
}

const sizeClasses = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

const statusColors = {
  online: "bg-status-online",
  away: "bg-status-away",
  busy: "bg-status-busy",
  offline: "bg-status-offline",
};

export function StatusDot({ status, size = "md", className, showPulse = false }: StatusDotProps) {
  return (
    <span
      className={cn(
        "rounded-full border-2 border-background",
        sizeClasses[size],
        statusColors[status],
        showPulse && status === "online" && "animate-pulse",
        className
      )}
      data-testid={`status-dot-${status}`}
    />
  );
}
