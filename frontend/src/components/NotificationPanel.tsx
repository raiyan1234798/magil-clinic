"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Calendar, User } from "lucide-react";
import { apiFetch, formatTime, ApiError } from "@/lib/api";

const POLL_INTERVAL_MS = 60000;
const ERROR_RETRY_MS = 300000;

export function NotificationPanel() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const retryAfterRef = useRef(0);

  const loadNotifications = () => {
    if (Date.now() < retryAfterRef.current) return;
    apiFetch("/api/notifications")
      .then((res) => {
        setData(res);
        setError(null);
        retryAfterRef.current = 0;
      })
      .catch((err) => {
        const message = err instanceof ApiError && err.isNetworkError
          ? "API unreachable — set NEXT_PUBLIC_API_URL"
          : "Unable to load appointments";
        setError(message);
        retryAfterRef.current = Date.now() + ERROR_RETRY_MS;
      });
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const count = error ? 0 : data?.totalToday || 0;

  return (
    <div className="relative border-t border-sidebar-border px-3 py-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent/60"
      >
        <div className="relative">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </div>
        <span className="font-medium text-foreground">Today&apos;s Appointments</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-3 right-3 z-50 mb-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-card text-foreground shadow-lg">
          <div className="rounded-t-xl border-b bg-muted/30 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-primary" />
              {error ? "Appointments unavailable" : `${count} appointment${count !== 1 ? "s" : ""} today`}
            </p>
          </div>
          {error && (
            <p className="p-4 text-center text-sm text-destructive">{error}</p>
          )}
          {!error && data?.doctorSchedules?.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">No appointments today</p>
          )}
          {!error && data?.doctorSchedules?.map((schedule: any) => (
            <div key={schedule.doctor.id} className="border-b p-3 last:border-0">
              <p className="text-sm font-semibold text-primary">{schedule.doctor.name}</p>
              <p className="mb-2 text-xs text-muted-foreground">{schedule.doctor.specialization}</p>
              {schedule.appointments.map((apt: any) => (
                <div key={apt.id} className="mb-1.5 rounded-lg bg-muted/30 p-2 text-xs last:mb-0">
                  <div className="flex items-center gap-1 font-medium">
                    <User className="h-3 w-3" />
                    {apt.patient.name} <span className="text-primary">({apt.patient.patientId})</span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    {formatTime(apt.appointmentDate)} · {apt.tokenLabel || `Token ${apt.tokenNumber}`} · {apt.patient.phoneNumber}
                  </p>
                  {apt.reason && <p className="mt-0.5 text-muted-foreground/70">{apt.reason}</p>}
                </div>
              ))}
            </div>
          ))}
          <Link href="/appointments" className="block p-2 text-center text-xs text-primary hover:underline">
            View all appointments →
          </Link>
        </div>
      )}
    </div>
  );
}
