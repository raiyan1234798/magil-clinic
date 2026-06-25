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
import { PatientCombobox } from "@/components/PatientCombobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatDate } from "@/lib/api";
import { toast } from "sonner";

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", doctorId: "", diagnosis: "", treatment: "", notes: "", fee: "", followUpDate: "" });

  const load = () => apiFetch<any[]>("/api/consultations").then(setConsultations).catch(() => {});
  useEffect(() => {
    load();
    apiFetch<any[]>("/api/doctors").then(setDoctors).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/consultations", { method: "POST", body: JSON.stringify(form) });
      toast.success("Consultation recorded!");
      setOpen(false);
      load();
    } catch { toast.error("Failed to record consultation"); }
  };

  return (
    <PageLayout
      title="Consultations"
      description="Patient consultations, diagnosis, treatment plans, and prescriptions."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> New Consultation</Button>} />
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Consultation</DialogTitle>
              <DialogDescription>Log diagnosis, treatment plan, and fees for a patient visit.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 px-5 py-4">
              <PatientCombobox value={form.patientId} onChange={(id) => setForm({ ...form, patientId: id })} returnUrl="/consultations" required />
              <div className="space-y-2">
                <Label>Doctor</Label>
                <LabeledSelect
                  value={form.doctorId}
                  onValueChange={(v) => setForm({ ...form, doctorId: v })}
                  items={doctors.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Select doctor"
                />
              </div>
              <div className="space-y-2"><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
              <div className="space-y-2"><Label>Treatment Plan</Label><Textarea value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Fee (₹)</Label><Input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></div>
                <div className="space-y-2"><Label>Follow-up Date</Label><Input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></div>
              </div>
              <Button type="submit" className="w-full">Save Consultation</Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultations.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="font-medium">{c.patient?.name}</TableCell>
                  <TableCell>{c.doctor?.name}</TableCell>
                  <TableCell>{c.diagnosis || "—"}</TableCell>
                  <TableCell><Badge>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {consultations.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No consultations yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
