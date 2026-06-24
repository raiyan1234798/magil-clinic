import { cn } from "@/lib/utils";

interface PageCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageCard({ children, className, noPadding }: PageCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-card transition-shadow duration-200",
        !noPadding && "p-4 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

interface PageCardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageCardHeader({ title, description, action, className }: PageCardHeaderProps) {
  return (
    <div className={cn("mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
