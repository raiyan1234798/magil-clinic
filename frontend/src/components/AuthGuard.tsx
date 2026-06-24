"use client";

// Auth temporarily disabled for testing — re-enable login/setup redirects before production.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
