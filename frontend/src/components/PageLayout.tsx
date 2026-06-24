"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronRight, Home } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
}

const ROUTE_LABELS: Record<string, string> = {
  patients: "Patients",
  appointments: "Appointments",
  doctors: "Doctors",
  consultations: "Consultations",
  billing: "Billing",
  pharmacy: "Pharmacy",
  inventory: "Inventory",
  employees: "Employees",
  tasks: "Tasks",
  attendance: "Attendance",
  payroll: "Payroll",
  reports: "Reports",
  reminders: "Reminders",
  settings: "Settings",
  new: "New",
  edit: "Edit",
};

function autoBreadcrumbs(pathname: string | null): Breadcrumb[] {
  if (!pathname || pathname === "/") return [];
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = ROUTE_LABELS[seg] || (seg.length > 12 ? "Details" : seg);
    const isLast = i === segments.length - 1;
    return { label, href: isLast ? undefined : href };
  });
}

export function PageLayout({ children, title, description, actions, breadcrumbs }: PageLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const crumbs = breadcrumbs ?? autoBreadcrumbs(pathname);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar className="hidden lg:flex" />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar className="relative z-10 h-full shadow-2xl" onNavigate={() => setMobileOpen(false)} />
        </div>
      )}
      <main className="flex min-w-0 flex-1 flex-col">
        <ApiErrorBanner />
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 glass px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden shrink-0"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0 animate-slide-up">
                {crumbs.length > 0 && (
                  <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <Link href="/" className="flex items-center hover:text-foreground transition-colors">
                      <Home className="h-3 w-3" />
                    </Link>
                    {crumbs.map((crumb, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        {crumb.href ? (
                          <Link href={crumb.href} className="hover:text-foreground transition-colors">
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="text-foreground/70">{crumb.label}</span>
                        )}
                      </span>
                    ))}
                  </nav>
                )}
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
                {description && (
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{description}</p>
                )}
              </div>
            </div>
            {actions && (
              <div className={cn("flex shrink-0 flex-wrap items-center gap-2 sm:gap-3")}>
                {actions}
              </div>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
