"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, User } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatCurrency, formatTime, STATUS_COLORS } from "@/lib/api";
import { toast } from "sonner";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", specialization: "", phone: "", email: "", consultationFee: "500" });

  const load = () => {
    apiFetch<any[]>("/api/doctors").then(setDoctors).catch(console.error);
    apiFetch<any>("/api/notifications").then((d) => setSchedules(d.doctorSchedules || [])).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/doctors", { method: "POST", body: JSON.stringify(form) });
      toast.success("Doctor added!");
      setOpen(false);
      setForm({ name: "", specialization: "", phone: "", email: "", consultationFee: "500" });
      load();
    } catch { toast.error("Failed to add doctor"); }
  };

  const getSchedule = (doctorId: string) => schedules.find((s) => s.doctor.id === doctorId);

  return (
    <PageLayout
      title="Doctors"
      description="Manage doctor profiles and view today's appointment schedules."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> Add Doctor</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Add Doctor</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Specialization</Label><Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Consultation Fee (₹)</Label><Input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} /></div>
              <Button type="submit" className="w-full">Add Doctor</Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doc) => {
          const schedule = getSchedule(doc.id);
          return (
            <Card key={doc.id} className={schedule ? "border-primary/30" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{doc.name}</h3>
                    <p className="text-sm text-slate-500">{doc.specialization}</p>
                    <p className="text-xs text-slate-400 mt-1">{doc.doctorId}</p>
                  </div>
                  <Badge className={STATUS_COLORS[doc.availability]}>{doc.availability.replace("_", " ")}</Badge>
                </div>
                <div className="space-y-1 text-sm text-slate-600 mb-4">
                  <p>Fee: {formatCurrency(doc.consultationFee)}</p>
                  {doc.phone && <p>{doc.phone}</p>}
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1 mb-2">
                    <Calendar className="h-3 w-3" /> Today&apos;s Schedule ({schedule?.appointments?.length || 0})
                  </p>
                  {schedule?.appointments?.length > 0 ? (
                    <div className="space-y-2">
                      {schedule.appointments.map((apt: any) => (
                        <div key={apt.id} className="bg-slate-50 rounded p-2 text-xs">
                          <p className="font-semibold flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.patient.name} <span className="text-primary">({apt.patient.patientId})</span>
                          </p>
                          <p className="text-slate-500 mt-0.5">{formatTime(apt.appointmentDate)} · Token {apt.tokenNumber}</p>
                          <p className="text-slate-400">{apt.patient.phoneNumber} · {apt.reason || "Consultation"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No appointments today</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageLayout>
  );
}
