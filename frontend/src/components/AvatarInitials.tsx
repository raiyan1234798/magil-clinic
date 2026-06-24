import { cn } from "@/lib/utils";

interface AvatarInitialsProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const sizeStyles = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function AvatarInitials({ name, className, size = "md" }: AvatarInitialsProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        sizeStyles[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
