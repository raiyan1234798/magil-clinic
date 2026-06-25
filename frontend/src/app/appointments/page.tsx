"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientCombobox } from "@/components/PatientCombobox";
import { WhatsAppSendMenu } from "@/components/WhatsAppSendMenu";
import { Plus, Calendar, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatDate, formatTime, sendAppointmentWhatsApp, STATUS_COLORS, showApiError } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { toast } from "sonner";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    appointmentDate: "",
    reason: "",
    appointmentType: "PHONE" as "PHONE" | "WALK_IN",
  });
  const [sendWhatsAppReminder, setSendWhatsAppReminder] = useState(false);

  const user = getUser();

  const load = () => apiFetch<any[]>("/api/appointments").then(setAppointments).catch(() => {});

  useEffect(() => {
    load();
    apiFetch<any[]>("/api/doctors").then(setDoctors).catch(() => {});
    apiFetch("/api/settings").then(setSettings).catch(() => {});
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
      if (sendWhatsAppReminder) {
        const template = result.appointmentType === "WALK_IN" ? "BOOKING_CONFIRMED" : "APPOINTMENT_SCHEDULED";
        try {
          await sendAppointmentWhatsApp(result.id, template);
          toast.success(
            `${result.appointmentType === "WALK_IN" ? "Walk-in" : "Phone"} booking: ${result.patient?.name} — ${result.tokenLabel}${slot ? ` at ${slot}` : ""}. WhatsApp reminder sent.`,
            { duration: 5000 }
          );
        } catch (err: unknown) {
          toast.success(
            `${result.appointmentType === "WALK_IN" ? "Walk-in" : "Phone"} booking: ${result.patient?.name} — ${result.tokenLabel}${slot ? ` at ${slot}` : ""}.`,
            { duration: 5000 }
          );
          showApiError(err, "Appointment booked, but WhatsApp reminder failed");
        }
      } else {
        toast.success(
          `${result.appointmentType === "WALK_IN" ? "Walk-in" : "Phone"} booking: ${result.patient?.name} — ${result.tokenLabel}${slot ? ` at ${slot}` : ""}.`,
          { duration: 5000 }
        );
      }
      setOpen(false);
      setForm({ patientId: "", doctorId: "", appointmentDate: "", reason: "", appointmentType: "PHONE" });
      setSendWhatsAppReminder(false);
      load();
    } catch (err: unknown) {
      showApiError(err, "Failed to book appointment");
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
          <DialogContent className="max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Schedule Appointment</DialogTitle>
              <DialogDescription>Book a phone or walk-in consultation</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBook} className="space-y-4 px-5 py-4">
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
              <PatientCombobox
                value={form.patientId}
                onChange={(id) => setForm({ ...form, patientId: id })}
                returnUrl="/appointments"
                required
              />
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
                  <p className="text-xs text-muted-foreground">Token & time slot assigned automatically during consulting hours</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Consultation reason" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-4">
                <Label htmlFor="sendWhatsAppReminder" className="cursor-pointer text-sm font-normal">
                  Also send WhatsApp reminder
                </Label>
                <input
                  id="sendWhatsAppReminder"
                  type="checkbox"
                  checked={sendWhatsAppReminder}
                  onChange={(e) => setSendWhatsAppReminder(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
              </div>
              <DialogFooter className="px-0 pb-0">
                <Button type="submit" className="w-full" disabled={!form.patientId || !form.doctorId}>Book Appointment</Button>
              </DialogFooter>
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
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Slot</TableHead>
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
                        <TableCell className="flex flex-wrap gap-1">
                          <WhatsAppSendMenu
                            appointmentId={a.id}
                            appointmentType={a.appointmentType}
                            isWalkIn={a.isWalkIn}
                          />
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
