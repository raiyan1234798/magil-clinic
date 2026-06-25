"use client";

import { PageLayout } from "@/components/PageLayout";
import { ScrollableTable } from "@/components/ScrollableTable";
import { PageCard } from "@/components/PageCard";
import { EmptyState } from "@/components/EmptyState";
import { AvatarInitials } from "@/components/AvatarInitials";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LabeledSelect } from "@/components/LabeledSelect";
import { PatientCombobox } from "@/components/PatientCombobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Eye, Pencil, Users, HeartHandshake } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, formatDate } from "@/lib/api";
import { toast } from "sonner";

function PatientsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "followups" ? "followups" : "patients";

  const [patients, setPatients] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", type: "APPOINTMENT", scheduledAt: "", notes: "" });

  const loadPatients = (q?: string) => {
    const params = q ? `?search=${encodeURIComponent(q)}` : "";
    apiFetch<any[]>(`/api/patients${params}`).then(setPatients).catch(console.error);
  };

  const loadFollowUps = () => apiFetch<any[]>("/api/followups").then(setFollowUps).catch(console.error);

  useEffect(() => {
    loadPatients();
    loadFollowUps();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatients(search);
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/followups", { method: "POST", body: JSON.stringify(form) });
      toast.success("Follow-up scheduled!");
      setOpen(false);
      loadFollowUps();
    } catch {
      toast.error("Failed to create follow-up");
    }
  };

  const markComplete = async (id: string) => {
    await apiFetch(`/api/followups/${id}`, { method: "PUT", body: JSON.stringify({ status: "COMPLETED" }) });
    toast.success("Follow-up completed");
    loadFollowUps();
  };

  return (
    <PageLayout
      title="Patients"
      description="Unified patient records, follow-ups, and medical history."
      actions={
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button variant="outline" className="gap-2"><HeartHandshake className="h-4 w-4" /> Follow-up</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Follow-up</DialogTitle>
                <DialogDescription>Schedule an appointment, medicine, or general follow-up for a patient.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateFollowUp} className="space-y-4">
                <PatientCombobox
                  value={form.patientId}
                  onChange={(id) => setForm({ ...form, patientId: id })}
                  returnUrl="/patients"
                  required
                />
                <div className="space-y-2">
                  <Label>Type</Label>
                  <LabeledSelect
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v || "APPOINTMENT" })}
                    items={[
                      { value: "APPOINTMENT", label: "Appointment" },
                      { value: "MEDICINE", label: "Medicine" },
                      { value: "GENERAL", label: "General" },
                    ]}
                    placeholder="Select type"
                  />
                </div>
                <div className="space-y-2"><Label>Scheduled Date</Label><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full">Schedule</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Link href="/patients/new">
            <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Patient</Button>
          </Link>
        </div>
      }
    >
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="patients">All Patients</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="patients">
          <PageCard>
            <form onSubmit={handleSearch} className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or phone..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="secondary">Search</Button>
                {search && (
                  <Button type="button" variant="ghost" onClick={() => { setSearch(""); loadPatients(); }}>
                    Clear
                  </Button>
                )}
              </div>
            </form>

            <ScrollableTable>
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Patient</TableHead>
                    <TableHead className="min-w-[100px]">ID</TableHead>
                    <TableHead className="hidden sm:table-cell">Gender / Age</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Blood Group</TableHead>
                    <TableHead className="hidden lg:table-cell">Registered</TableHead>
                    <TableHead className="text-right min-w-[88px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={patient.name} size="sm" />
                          <span className="font-medium">{patient.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">{patient.patientId}</TableCell>
                      <TableCell className="capitalize hidden sm:table-cell">{patient.gender}, {patient.age}y</TableCell>
                      <TableCell className="whitespace-nowrap">{patient.phoneNumber}</TableCell>
                      <TableCell className="uppercase hidden md:table-cell">{patient.bloodGroup || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell whitespace-nowrap">{formatDate(patient.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link href={`/patients/${patient.id}`}>
                            <Button variant="ghost" size="icon-sm" aria-label="View patient">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/patients/${patient.id}/edit`}>
                            <Button variant="ghost" size="icon-sm" aria-label="Edit patient">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {patients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState icon={Users} title="No patients found" description="Add your first patient to get started." />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollableTable>
          </PageCard>
        </TabsContent>

        <TabsContent value="followups">
          <PageCard noPadding>
            <ScrollableTable>
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
                      <TableCell><StatusBadge status={f.status} /></TableCell>
                      <TableCell>
                        {f.status === "PENDING" && (
                          <Button size="sm" variant="outline" onClick={() => markComplete(f.id)}>Complete</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {followUps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState icon={HeartHandshake} title="No follow-ups" description="Schedule a follow-up for a patient." />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollableTable>
          </PageCard>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

export default function PatientsList() {
  return (
    <Suspense fallback={<PageLayout title="Patients" description="Loading..."><div className="skeleton h-64 w-full" /></PageLayout>}>
      <PatientsContent />
    </Suspense>
  );
}
