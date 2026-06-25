"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LabeledSelect } from "@/components/LabeledSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PatientCombobox } from "@/components/PatientCombobox";
import { WhatsAppSendMenu } from "@/components/WhatsAppSendMenu";
import { Plus, MessageSquare, Mail, Phone, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, formatDate, STATUS_COLORS, showApiError } from "@/lib/api";
import { toast } from "sonner";

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  SMS: <Phone className="h-4 w-4" />,
  WHATSAPP: <MessageSquare className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", type: "APPOINTMENT", channel: "SMS", message: "", sendAt: "" });

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch<any[]>("/api/reminders").then(setReminders),
      apiFetch("/api/notifications").then(setNotifications),
      apiFetch<{ integrations?: { whatsapp?: boolean } }>("/api/settings")
        .then((s) => setWhatsappEnabled(s.integrations?.whatsapp !== false))
        .catch(() => {}),
    ])
      .catch((err) => showApiError(err, "Failed to load reminders"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const appointmentReminders = reminders.filter((r) => r.type === "APPOINTMENT" || r.type === "APPOINTMENT_DOCTOR");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/reminders", { method: "POST", body: JSON.stringify(form) });
      toast.success("Reminder scheduled!");
      setOpen(false);
      load();
    } catch { toast.error("Failed to create reminder"); }
  };

  return (
    <PageLayout
      title="Reminders"
      description="Appointment, follow-up, and medicine reminders. Use Open in WhatsApp from Appointments to message patients."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> New Reminder</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Reminder</DialogTitle>
              <DialogDescription>Schedule SMS, email, or WhatsApp follow-ups</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 px-5 py-4">
              <PatientCombobox value={form.patientId} onChange={(id) => setForm({ ...form, patientId: id })} returnUrl="/reminders" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <LabeledSelect
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v || "APPOINTMENT" })}
                    items={[
                      { value: "APPOINTMENT", label: "Appointment" },
                      { value: "FOLLOW_UP", label: "Follow-up" },
                      { value: "MEDICINE", label: "Medicine" },
                    ]}
                    placeholder="Select type"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <LabeledSelect
                    value={form.channel}
                    onValueChange={(v) => setForm({ ...form, channel: v || "SMS" })}
                    items={[
                      { value: "SMS", label: "SMS" },
                      { value: "WHATSAPP", label: "WhatsApp" },
                      { value: "EMAIL", label: "Email" },
                    ]}
                    placeholder="Select channel"
                  />
                </div>
              </div>
              <div className="space-y-2"><Label>Send At</Label><Input type="datetime-local" value={form.sendAt} onChange={(e) => setForm({ ...form, sendAt: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></div>
              <DialogFooter className="px-0 pb-0">
                <Button type="submit" className="w-full">Schedule Reminder</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {notifications?.doctorSchedules?.length > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="font-semibold text-sm mb-3">Today&apos;s Appointment Notifications for Doctors</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notifications.doctorSchedules.map((s: any) => (
                <div key={s.doctor.id} className="bg-white rounded p-3 text-sm">
                  <p className="font-bold text-primary">{s.doctor.name}</p>
                  {s.appointments.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 mt-2">
                      <p className="text-slate-600">
                        {a.patient.name} ({a.patient.patientId}) — {formatDate(a.appointmentDate)} — {a.tokenLabel || `Token ${a.tokenNumber}`}
                      </p>
                      <WhatsAppSendMenu
                        appointmentId={a.id}
                        appointmentType={a.appointmentType}
                        isWalkIn={a.isWalkIn}
                        whatsappEnabled={whatsappEnabled}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Appointment WhatsApp ({appointmentReminders.filter((r) => r.channel === "WHATSAPP").length})</p>
            <p className="text-xs text-muted-foreground">Open in WhatsApp from Appointments — tap Send in WhatsApp to deliver.</p>
          </div>
          <Link href="/appointments">
            <Button variant="outline" size="sm" className="gap-2">
              <Send className="h-4 w-4" /> Send via Appointments
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Send At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading reminders…</TableCell></TableRow>
              ) : reminders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No reminders yet. Create one above or send WhatsApp from Appointments.</TableCell></TableRow>
              ) : (
              reminders.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.patient?.name || (r.type === "APPOINTMENT_DOCTOR" ? "Doctor Alert" : "—")}
                    {r.patient?.patientId && <span className="text-primary text-xs ml-1">({r.patient.patientId})</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.type === "APPOINTMENT" ? "default" : "secondary"}>{r.type.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">{CHANNEL_ICONS[r.channel]} {r.channel}</span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{r.message}</TableCell>
                  <TableCell>{formatDate(r.sendAt)}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge></TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
