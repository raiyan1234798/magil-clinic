import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: "blue" | "teal" | "amber" | "rose" | "violet";
  loading?: boolean;
  className?: string;
}

const accentStyles = {
  blue: "bg-blue-500/10 text-blue-600",
  teal: "bg-teal-500/10 text-teal-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
  violet: "bg-violet-500/10 text-violet-600",
};

export function StatCard({ title, value, icon: Icon, trend, trendUp, accent = "blue", loading, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-card transition-all duration-200 hover:border-primary/20 hover:shadow-glow",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="skeleton mt-2 h-8 w-24" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{value}</p>
          )}
          {trend && !loading && (
            <p className={cn("mt-1 text-xs font-medium", trendUp ? "text-teal-600" : "text-muted-foreground")}>
              {trend}
            </p>
          )}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105", accentStyles[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
