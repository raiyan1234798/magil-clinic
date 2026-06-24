"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Calendar, User } from "lucide-react";
import { apiFetch, formatTime } from "@/lib/api";

export function NotificationPanel() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const loadNotifications = () =>
    apiFetch("/api/notifications")
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load appointments");
      });

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const count = error ? 0 : data?.totalToday || 0;

  return (
    <div className="relative px-4 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
      >
        <div className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </div>
        <span className="font-medium">Today&apos;s Appointments</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white text-slate-900 rounded-lg shadow-xl border max-h-80 overflow-y-auto z-50">
          <div className="p-3 border-b bg-slate-50 rounded-t-lg">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {error ? "Appointments unavailable" : `${count} appointment${count !== 1 ? "s" : ""} today`}
            </p>
          </div>
          {error && (
            <p className="p-4 text-sm text-red-600 text-center">{error}</p>
          )}
          {!error && data?.doctorSchedules?.length === 0 && (
            <p className="p-4 text-sm text-slate-500 text-center">No appointments today</p>
          )}
          {!error && data?.doctorSchedules?.map((schedule: any) => (
            <div key={schedule.doctor.id} className="p-3 border-b last:border-0">
              <p className="font-semibold text-sm text-primary">{schedule.doctor.name}</p>
              <p className="text-xs text-slate-500 mb-2">{schedule.doctor.specialization}</p>
              {schedule.appointments.map((apt: any) => (
                <div key={apt.id} className="text-xs bg-slate-50 rounded p-2 mb-1.5 last:mb-0">
                  <div className="flex items-center gap-1 font-medium">
                    <User className="h-3 w-3" />
                    {apt.patient.name} <span className="text-primary">({apt.patient.patientId})</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    {formatTime(apt.appointmentDate)} · {apt.tokenLabel || `Token ${apt.tokenNumber}`} · {apt.patient.phoneNumber}
                  </p>
                  {apt.reason && <p className="text-slate-400 mt-0.5">{apt.reason}</p>}
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
