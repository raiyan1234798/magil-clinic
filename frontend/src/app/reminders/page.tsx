"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MessageSquare, Mail, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatDate, STATUS_COLORS } from "@/lib/api";
import { toast } from "sonner";

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  SMS: <Phone className="h-4 w-4" />,
  WHATSAPP: <MessageSquare className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", type: "APPOINTMENT", channel: "SMS", message: "", sendAt: "" });

  const load = () => {
    apiFetch<any[]>("/api/reminders").then(setReminders).catch(console.error);
    apiFetch("/api/notifications").then(setNotifications).catch(console.error);
  };
  useEffect(() => {
    load();
    apiFetch<any[]>("/api/patients").then(setPatients);
  }, []);

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
      description="Appointment, follow-up, and medicine reminders via SMS, WhatsApp, and Email. Appointment reminders are created automatically when booking."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> New Reminder</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Create Reminder</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "APPOINTMENT" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                      <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                      <SelectItem value="MEDICINE">Medicine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v ?? "SMS" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Send At</Label><Input type="datetime-local" value={form.sendAt} onChange={(e) => setForm({ ...form, sendAt: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></div>
              <Button type="submit" className="w-full">Schedule Reminder</Button>
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
                    <p key={a.id} className="text-slate-600 mt-1">
                      {a.patient.name} ({a.patient.patientId}) — {formatDate(a.appointmentDate)} — Token {a.tokenNumber}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Appointment Reminders ({appointmentReminders.length})</p>
          <p className="text-xs text-slate-500">Auto-created when appointments are booked — sent via SMS, WhatsApp, and email to doctors.</p>
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
              {reminders.map((r) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
