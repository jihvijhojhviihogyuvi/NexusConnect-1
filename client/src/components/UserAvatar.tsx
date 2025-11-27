import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusDot } from "./StatusDot";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

interface UserAvatarProps {
  user: Pick<User, "firstName" | "lastName" | "profileImageUrl" | "status">;
  size?: "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-24 w-24",
};

const statusPositionClasses = {
  sm: "-bottom-0.5 -right-0.5",
  md: "-bottom-0.5 -right-0.5",
  lg: "-bottom-0.5 -right-0.5",
  xl: "-bottom-1 -right-1",
};

const statusSizeMap = {
  sm: "sm" as const,
  md: "md" as const,
  lg: "md" as const,
  xl: "lg" as const,
};

export function UserAvatar({ user, size = "md", showStatus = false, className }: UserAvatarProps) {
  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage
          src={user.profileImageUrl || undefined}
          alt={`${user.firstName} ${user.lastName}`}
          className="object-cover"
        />
        <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showStatus && user.status && (
        <StatusDot
          status={user.status}
          size={statusSizeMap[size]}
          className={cn("absolute", statusPositionClasses[size])}
        />
      )}
    </div>
  );
}
