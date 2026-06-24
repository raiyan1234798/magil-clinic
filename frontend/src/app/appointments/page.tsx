"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Bell, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatDate, formatTime, STATUS_COLORS } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { toast } from "sonner";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    appointmentDate: "",
    reason: "",
    appointmentType: "PHONE" as "PHONE" | "WALK_IN",
  });

  const user = getUser();
  const selectedPatient = patients.find((p) => p.id === form.patientId);

  const load = () => apiFetch<any[]>("/api/appointments").then(setAppointments).catch(console.error);

  useEffect(() => {
    load();
    apiFetch<any[]>("/api/patients").then(setPatients);
    apiFetch<any[]>("/api/doctors").then(setDoctors);
    apiFetch("/api/settings").then(setSettings).catch(console.error);
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await apiFetch<any>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          appointmentDate: form.appointmentType === "WALK_IN" ? new Date().toISOString() : form.appointmentDate,
          bookedById: user?.id,
        }),
      });
      const slot = result.scheduledSlotStart ? `${formatTime(result.scheduledSlotStart)} – ${formatTime(result.scheduledSlotEnd)}` : "";
      toast.success(
        `${result.appointmentType === "WALK_IN" ? "Walk-in" : "Phone"} booking: ${result.patient?.name} — ${result.tokenLabel} at ${slot}. WhatsApp reminder ${result.whatsappSent ? "sent" : "scheduled"}.`,
        { duration: 7000 }
      );
      setOpen(false);
      setForm({ patientId: "", doctorId: "", appointmentDate: "", reason: "", appointmentType: "PHONE" });
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment");
    }
  };

  const startConsult = async (id: string) => {
    await apiFetch(`/api/appointments/${id}/start`, { method: "POST" });
    toast.success("Consultation started — time recorded");
    load();
  };

  const completeConsult = async (id: string) => {
    await apiFetch(`/api/appointments/${id}/complete`, { method: "POST" });
    toast.success("Consultation completed — end time recorded");
    load();
  };

  const walkIns = appointments.filter((a) => a.appointmentType === "WALK_IN" || a.isWalkIn);
  const phoneAppts = appointments.filter((a) => a.appointmentType === "PHONE" && !a.isWalkIn);

  return (
    <PageLayout
      title="Appointments"
      description={`Nurse booking · Consulting hours ${settings?.consultHoursLabel || "5 PM – 9 PM"} · ${settings?.maxTokens || 16} tokens/day`}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> Book Appointment</Button>} />
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Schedule Appointment (Nurse)</DialogTitle></DialogHeader>
            <form onSubmit={handleBook} className="space-y-4">
              <div className="space-y-2">
                <Label>Appointment Type *</Label>
                <Select value={form.appointmentType} onValueChange={(v) => setForm({ ...form, appointmentType: (v as "PHONE" | "WALK_IN") ?? "PHONE" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHONE"><span className="flex items-center gap-2"><Phone className="h-3 w-3" /> Phone Booking</span></SelectItem>
                    <SelectItem value="WALK_IN"><span className="flex items-center gap-2"><UserRound className="h-3 w-3" /> Walk-in</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Patient *</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.patientId} — {p.name} ({p.phoneNumber})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPatient && (
                  <p className="text-xs bg-slate-50 p-2 rounded">Booking for: <strong>{selectedPatient.name}</strong> · {selectedPatient.patientId}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Doctor *</Label>
                <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} — {d.specialization}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.appointmentType === "PHONE" && (
                <div className="space-y-2">
                  <Label>Appointment Date *</Label>
                  <Input type="date" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} required />
                  <p className="text-xs text-slate-500">Token & time slot (5–9 PM) assigned automatically</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Consultation reason" />
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1"><Bell className="h-3 w-3" /> WhatsApp reminder sent to patient on booking</p>
              <Button type="submit" className="w-full" disabled={!form.patientId || !form.doctorId}>Book & Send WhatsApp Reminder</Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({appointments.length})</TabsTrigger>
          <TabsTrigger value="walkin">Walk-in ({walkIns.length})</TabsTrigger>
          <TabsTrigger value="phone">Phone ({phoneAppts.length})</TabsTrigger>
        </TabsList>

        {["all", "walkin", "phone"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Slot (5–9 PM)</TableHead>
                      <TableHead>Actual Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tab === "all" ? appointments : tab === "walkin" ? walkIns : phoneAppts).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-bold text-primary">{a.tokenLabel || `Token ${a.tokenNumber}`}</TableCell>
                        <TableCell><Badge variant="outline">{a.appointmentType || (a.isWalkIn ? "WALK_IN" : "PHONE")}</Badge></TableCell>
                        <TableCell>
                          <p className="font-semibold">{a.patient?.name}</p>
                          <p className="text-xs text-primary">{a.patient?.patientId}</p>
                        </TableCell>
                        <TableCell>{a.doctor?.name}</TableCell>
                        <TableCell>
                          {a.scheduledSlotStart ? (
                            <span>{formatTime(a.scheduledSlotStart)} – {formatTime(a.scheduledSlotEnd)}</span>
                          ) : formatTime(a.appointmentDate)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.actualStartTime ? formatTime(a.actualStartTime) : "—"}
                          {a.actualEndTime ? ` → ${formatTime(a.actualEndTime)}` : ""}
                        </TableCell>
                        <TableCell><Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge></TableCell>
                        <TableCell className="flex gap-1">
                          {a.status === "SCHEDULED" && (
                            <Button size="sm" variant="outline" onClick={() => startConsult(a.id)}>Start</Button>
                          )}
                          {a.status === "IN_PROGRESS" && (
                            <Button size="sm" onClick={() => completeConsult(a.id)}>Complete</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(tab === "all" ? appointments : tab === "walkin" ? walkIns : phoneAppts).length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">No appointments yet. Book one above.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </PageLayout>
  );
}
