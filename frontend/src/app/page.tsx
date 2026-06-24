"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Pill, DollarSign, Activity, Stethoscope, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatCurrency, formatTime, STATUS_COLORS } from "@/lib/api";

interface DashboardData {
  todayAppointments: number;
  walkIns: number;
  lowStock: number;
  revenue: number;
  pendingFollowUps: number;
  recentAppointments: Array<{
    id: string;
    tokenNumber: string;
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

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard").then(setData).catch(console.error);
    apiFetch("/api/notifications").then(setNotifications).catch(console.error);
  }, []);

  const metrics = data ? [
    { title: "Today's Appointments", value: String(data.todayAppointments), icon: Calendar, color: "text-blue-500" },
    { title: "Walk-in Patients", value: String(data.walkIns), icon: Users, color: "text-green-500" },
    { title: "Low Stock Medicines", value: String(data.lowStock), icon: Pill, color: "text-orange-500" },
    { title: "Revenue Summary", value: formatCurrency(data.revenue), icon: DollarSign, color: "text-purple-500" },
  ] : [];

  return (
    <PageLayout title="Dashboard" description="Welcome back! Here is today's overview.">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {data ? metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-600">{metric.title}</CardTitle>
                <Icon className={`h-5 w-5 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{metric.value}</div>
              </CardContent>
            </Card>
          );
        }) : [1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Loading...</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-slate-300">—</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Recent Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{apt.patient.name} <span className="text-primary text-sm">({apt.patient.patientId})</span></p>
                      <p className="text-sm text-slate-500">Token: {apt.tokenNumber} · Dr. {apt.doctor?.name || "Unassigned"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{formatTime(apt.appointmentDate)}</p>
                    <Badge className={STATUS_COLORS[apt.status] || ""}>{apt.status}</Badge>
                  </div>
                </div>
              ))}
              {data?.recentAppointments.length === 0 && (
                <p className="text-center text-slate-500 py-4">No appointments today.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" /> Doctor Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.doctors.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-slate-500">{doc.specialization}</p>
                  </div>
                  <Badge className={STATUS_COLORS[doc.availability] || ""}>{doc.availability.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {notifications?.doctorSchedules?.length > 0 && (
        <Card className="mt-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Today&apos;s Doctor Schedules — Appointments to Attend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notifications.doctorSchedules.map((schedule: any) => (
                <div key={schedule.doctor.id} className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-primary">{schedule.doctor.name}</p>
                      <p className="text-xs text-slate-500">{schedule.doctor.specialization}</p>
                    </div>
                    <Badge>{schedule.appointments.length} patient{schedule.appointments.length !== 1 ? "s" : ""}</Badge>
                  </div>
                  <div className="space-y-2">
                    {schedule.appointments.map((apt: any) => (
                      <div key={apt.id} className="bg-white rounded p-2 text-sm border">
                        <p className="font-semibold">{apt.patient.name} <span className="text-primary">({apt.patient.patientId})</span></p>
                        <p className="text-slate-500 text-xs">{formatTime(apt.appointmentDate)} · Token {apt.tokenNumber} · {apt.patient.phoneNumber}</p>
                        {apt.reason && <p className="text-slate-400 text-xs mt-0.5">{apt.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.lowStockMeds.map((med) => (
                <div key={med.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-900">{med.name}</p>
                    <p className="text-sm text-red-500">Only {med.stock} left (min: {med.minStock})</p>
                  </div>
                </div>
              ))}
              {data?.lowStockMeds.length === 0 && (
                <p className="text-center text-slate-500 py-4">All medicines are well stocked.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-primary">{data?.pendingFollowUps ?? 0}</p>
              <p className="text-slate-500 mt-2">follow-ups awaiting action</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
