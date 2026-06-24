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
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatDate, STATUS_COLORS } from "@/lib/api";
import { toast } from "sonner";

export default function CRMPage() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", type: "APPOINTMENT", scheduledAt: "", notes: "" });

  const load = () => apiFetch<any[]>("/api/followups").then(setFollowUps).catch(console.error);
  useEffect(() => {
    load();
    apiFetch<any[]>("/api/patients").then(setPatients);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/followups", { method: "POST", body: JSON.stringify(form) });
      toast.success("Follow-up scheduled!");
      setOpen(false);
      load();
    } catch { toast.error("Failed to create follow-up"); }
  };

  const markComplete = async (id: string) => {
    await apiFetch(`/api/followups/${id}`, { method: "PUT", body: JSON.stringify({ status: "COMPLETED" }) });
    toast.success("Follow-up completed");
    load();
  };

  return (
    <PageLayout
      title="CRM"
      description="Patient follow-ups, communication, and customer history."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> Schedule Follow-up</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "APPOINTMENT" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                    <SelectItem value="MEDICINE">Medicine</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Scheduled Date</Label><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full">Schedule</Button>
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
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followUps.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.patient?.name}</TableCell>
                  <TableCell>{f.type}</TableCell>
                  <TableCell>{formatDate(f.scheduledAt)}</TableCell>
                  <TableCell className="max-w-xs truncate">{f.notes || "—"}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[f.status]}>{f.status}</Badge></TableCell>
                  <TableCell>
                    {f.status === "PENDING" && (
                      <Button size="sm" variant="outline" onClick={() => markComplete(f.id)}>Complete</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
