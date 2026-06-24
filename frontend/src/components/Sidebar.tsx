"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, Calendar, Stethoscope, Pill, FileText,
  Settings, CreditCard, UserCircle, Package,
  Clock, Wallet, Building2, Bell, ClipboardList, X, ChevronLeft, ChevronRight, Kanban
} from "lucide-react";
import { NotificationPanel } from "@/components/NotificationPanel";
import { canAccessMenu, canViewRoles, getUser, getUserDisplayLabel } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { icon: typeof LayoutDashboard; label: string; href: string };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/" }],
  },
  {
    label: "Clinical",
    items: [
      { icon: Users, label: "Patients", href: "/patients" },
      { icon: Calendar, label: "Appointments", href: "/appointments" },
      { icon: Stethoscope, label: "Doctors", href: "/doctors" },
      { icon: ClipboardList, label: "Consultations", href: "/consultations" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: Kanban, label: "Tasks", href: "/tasks" },
      { icon: Pill, label: "Pharmacy", href: "/pharmacy" },
      { icon: Package, label: "Inventory", href: "/inventory" },
      { icon: Bell, label: "Reminders", href: "/reminders" },
    ],
  },
  {
    label: "Finance",
    items: [
      { icon: CreditCard, label: "Billing", href: "/billing" },
      { icon: FileText, label: "Reports", href: "/reports" },
      { icon: Wallet, label: "Payroll", href: "/payroll" },
    ],
  },
  {
    label: "Admin",
    items: [
      { icon: Building2, label: "Employees", href: "/employees" },
      { icon: Clock, label: "Attendance", href: "/attendance" },
    ],
  },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className = "", onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const user = getUser();
  const role = user?.role || "DOCTOR_ADMIN";
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessMenu(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "flex min-h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border p-4">
        <Link href="/" onClick={onNavigate} className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Magil Clinic</p>
              <p className="text-[11px] text-muted-foreground">Unified Platform</p>
            </div>
          )}
        </Link>
        {onNavigate ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onNavigate}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden lg:flex"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                      {!collapsed && <span>{item.label}</span>}
                      {active && !collapsed && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && <NotificationPanel />}

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/60",
            pathname === "/settings" && "bg-sidebar-accent text-sidebar-accent-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <div className={cn("mt-2 flex items-center gap-3 rounded-lg px-3 py-2", collapsed && "justify-center px-2")}>
          <UserCircle className="h-8 w-8 shrink-0 text-muted-foreground" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{getUserDisplayLabel(user)}</p>
              {canViewRoles(user) && (
                <p className="truncate text-xs text-muted-foreground">Super Admin</p>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
