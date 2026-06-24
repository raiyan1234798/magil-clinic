"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageLayout({ children, title, description, actions }: PageLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar className="hidden lg:flex" />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar className="relative z-10 h-full" onNavigate={() => setMobileOpen(false)} />
        </div>
      )}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-auto">
        <header className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
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
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">{title}</h1>
              {description && <p className="text-slate-500 mt-1 text-sm sm:text-base">{description}</p>}
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              {actions}
            </div>
          )}
        </header>
        {children}
      </main>
    </div>
  );
}
