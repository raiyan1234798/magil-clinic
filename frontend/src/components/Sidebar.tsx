"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, Stethoscope, Pill, FileText,
  Settings, CreditCard, UserCircle, Package, HeartHandshake,
  Clock, Wallet, Building2, TrendingUp, Bell, ClipboardList, X
} from "lucide-react";
import { NotificationPanel } from "@/components/NotificationPanel";
import { canAccessMenu, getUser, ROLE_LABELS } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Patients", href: "/patients" },
  { icon: Calendar, label: "Appointments", href: "/appointments" },
  { icon: Stethoscope, label: "Doctors", href: "/doctors" },
  { icon: ClipboardList, label: "Consultations", href: "/consultations" },
  { icon: CreditCard, label: "Billing", href: "/billing" },
  { icon: Pill, label: "Pharmacy", href: "/pharmacy" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: HeartHandshake, label: "CRM", href: "/crm" },
  { icon: Clock, label: "Attendance", href: "/attendance" },
  { icon: Wallet, label: "Payroll", href: "/payroll" },
  { icon: Building2, label: "Employees", href: "/employees" },
  { icon: TrendingUp, label: "Finance", href: "/finance" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Bell, label: "Reminders", href: "/reminders" },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className = "", onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const user = getUser();
  const role = user?.role || "DOCTOR_ADMIN";
  const visibleItems = menuItems.filter((item) => canAccessMenu(role, item.href));

  return (
    <aside className={`w-64 bg-primary text-primary-foreground min-h-screen flex flex-col shadow-xl shrink-0 ${className}`}>
      <div className="p-4 sm:p-6 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Stethoscope className="h-7 w-7 sm:h-8 sm:w-8 text-secondary shrink-0" />
            Magil Clinic
          </h2>
          <p className="text-xs text-primary-foreground/60 mt-1">Management System</p>
        </div>
        {onNavigate && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-white/10 shrink-0"
            onClick={onNavigate}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 px-3 sm:px-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-lg transition-colors text-sm ${
                    isActive ? "bg-white/20 font-semibold" : "hover:bg-white/10 font-medium"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <NotificationPanel />

      <div className="p-3 sm:p-4 border-t border-white/10">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
        >
          <Settings className="h-4 w-4" />
          <span className="font-medium">Settings</span>
        </Link>
        <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 mt-1">
          <UserCircle className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{user?.name || "Test Admin"}</p>
            <p className="text-xs text-primary-foreground/70">{ROLE_LABELS[role] || role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
