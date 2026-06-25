"use client";

import { PageLayout } from "@/components/PageLayout";
import { StatCard } from "@/components/StatCard";
import { QuickAction } from "@/components/QuickAction";
import { StatusBadge } from "@/components/StatusBadge";
import { PageCard, PageCardHeader } from "@/components/PageCard";
import { EmptyState } from "@/components/EmptyState";
import { AvatarInitials } from "@/components/AvatarInitials";
import {
  Users, Calendar, Pill, DollarSign,
  UserPlus, FileText, Package, AlertTriangle, Clock
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, formatCurrency, formatTime } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { WhatsAppSendMenu } from "@/components/WhatsAppSendMenu";

interface DashboardData {
  todayAppointments: number;
  walkIns: number;
  lowStock: number;
  revenue: number;
  pendingFollowUps: number;
      recentAppointments: Array<{
    id: string;
    tokenNumber: string;
    tokenLabel?: string;
    appointmentType?: string;
    isWalkIn?: boolean;
    appointmentDate: string;
    status: string;
    patient: { name: string; patientId?: string; phoneNumber?: string };
    doctor: { name: string } | null;
  }>;
  lowStockMeds: Array<{ id: string; name: string; stock: number; minStock: number }>;
  doctors: Array<{ id: string; name: string; specialization: string; availability: string }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const loading = !data;

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard").then(setData).catch(console.error);
    apiFetch("/api/notifications").then(setNotifications).catch(console.error);
    apiFetch<{ integrations?: { whatsapp?: boolean } }>("/api/settings")
      .then((s) => setWhatsappEnabled(s.integrations?.whatsapp !== false))
      .catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <PageLayout
      title={`${greeting}`}
      description="Your clinic command center — everything you need at a glance."
    >
      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <QuickAction href="/patients/new" label="Add Patient" description="Register new patient" icon={UserPlus} />
        <QuickAction href="/appointments" label="Book Appointment" description="Schedule a visit" icon={Calendar} />
        <QuickAction href="/billing" label="Create Invoice" description="Bill a patient" icon={FileText} />
        <QuickAction href="/pharmacy" label="Dispense Rx" description="Pharmacy counter" icon={Pill} />
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Appointments" value={String(data?.todayAppointments ?? 0)} icon={Calendar} accent="blue" loading={loading} />
        <StatCard title="Walk-in Patients" value={String(data?.walkIns ?? 0)} icon={Users} accent="teal" loading={loading} />
        <StatCard title="Low Stock Alerts" value={String(data?.lowStock ?? 0)} icon={Package} accent="amber" loading={loading} trend={data?.lowStock ? "Needs attention" : undefined} />
        <StatCard title="Today's Revenue" value={data ? formatCurrency(data.revenue) : "—"} icon={DollarSign} accent="violet" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Queue */}
        <PageCard className="lg:col-span-2" noPadding>
          <div className="p-4 sm:p-6">
            <PageCardHeader
              title="Today's Queue"
              description="Upcoming and in-progress appointments"
              action={
                <Link href="/appointments">
                  <Button variant="outline" size="sm">View all</Button>
                </Link>
              }
            />
            <div className="space-y-2">
              {data?.recentAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarInitials name={apt.patient.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {apt.patient.name}
                        <span className="ml-1.5 text-xs font-normal text-primary">({apt.patient.patientId})</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {apt.tokenLabel || `Token ${apt.tokenNumber}`} · Dr. {apt.doctor?.name || "Unassigned"}
                        {apt.appointmentType === "PHONE" && !apt.isWalkIn ? " · Phone" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <p className="text-sm font-medium">{formatTime(apt.appointmentDate)}</p>
                    <StatusBadge status={apt.status} />
                    {(apt.appointmentType === "PHONE" && !apt.isWalkIn) && (
                      <WhatsAppSendMenu
                        appointmentId={apt.id}
                        appointmentType={apt.appointmentType}
                        isWalkIn={apt.isWalkIn}
                        whatsappEnabled={whatsappEnabled}
                      />
                    )}
                  </div>
                </div>
              ))}
              {data?.recentAppointments.length === 0 && (
                <EmptyState icon={Calendar} title="No appointments today" description="Schedule one from the appointments page." />
              )}
              {loading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 w-full" />)}
                </div>
              )}
            </div>
          </div>
        </PageCard>

        {/* Doctor Availability */}
        <PageCard noPadding>
          <div className="p-4 sm:p-6">
            <PageCardHeader title="Doctor Availability" description="Current status" />
            <div className="space-y-2">
              {data?.doctors.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.specialization}</p>
                  </div>
                  <StatusBadge status={doc.availability} />
                </div>
              ))}
              {loading && [1, 2].map((i) => <div key={i} className="skeleton h-14 w-full" />)}
            </div>
          </div>
        </PageCard>
      </div>

      {/* Alerts Row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PageCard noPadding>
          <div className="p-4 sm:p-6">
            <PageCardHeader
              title="Low Stock Alerts"
              description="Medicines below minimum threshold"
              action={
                <Link href="/inventory">
                  <Button variant="outline" size="sm">Inventory</Button>
                </Link>
              }
            />
            {data?.lowStockMeds.length ? (
              <div className="space-y-2">
                {data.lowStockMeds.map((med) => (
                  <div key={med.id} className="flex items-center gap-3 rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{med.name}</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {med.stock} left · min {med.minStock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Package} title="All stocked" description="No medicines below minimum threshold." />
            )}
          </div>
        </PageCard>

        <PageCard noPadding>
          <div className="p-4 sm:p-6">
            <PageCardHeader
              title="Pending Follow-ups"
              description="Patients awaiting outreach"
              action={
                <Link href="/patients?tab=followups">
                  <Button variant="outline" size="sm">Manage</Button>
                </Link>
              }
            />
            <div className="flex flex-col items-center justify-center py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <p className="mt-3 text-4xl font-semibold tracking-tight">{data?.pendingFollowUps ?? 0}</p>
              <p className="text-sm text-muted-foreground">follow-ups pending</p>
            </div>
          </div>
        </PageCard>
      </div>

      {/* Doctor Schedules */}
      {notifications?.doctorSchedules?.length > 0 && (
        <PageCard className="mt-6 border-primary/20" noPadding>
          <div className="p-4 sm:p-6">
            <PageCardHeader
              title="Today's Doctor Schedules"
              description="Appointments grouped by doctor"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {notifications.doctorSchedules.map((schedule: any) => (
                <div key={schedule.doctor.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-primary">{schedule.doctor.name}</p>
                      <p className="text-xs text-muted-foreground">{schedule.doctor.specialization}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {schedule.appointments.length} patient{schedule.appointments.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {schedule.appointments.map((apt: any) => (
                      <div key={apt.id} className="rounded-lg border border-border/40 bg-card p-2.5 text-sm">
                        <p className="font-medium">
                          {apt.patient.name}
                          <span className="ml-1 text-xs text-primary">({apt.patient.patientId})</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(apt.appointmentDate)} · {apt.tokenLabel || `Token ${apt.tokenNumber}`}
                        </p>
                        {(apt.appointmentType === "PHONE" && !apt.isWalkIn) && (
                          <div className="mt-2">
                            <WhatsAppSendMenu
                              appointmentId={apt.id}
                              appointmentType={apt.appointmentType}
                              isWalkIn={apt.isWalkIn}
                              whatsappEnabled={whatsappEnabled}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PageCard>
      )}
    </PageLayout>
  );
}
