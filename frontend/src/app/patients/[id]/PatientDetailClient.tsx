"use client";

import { PageLayout } from "@/components/PageLayout";
import { PageCard, PageCardHeader } from "@/components/PageCard";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { AvatarInitials } from "@/components/AvatarInitials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Receipt, Pill, Activity, User, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { apiFetch, formatDate, formatCurrency, formatTime, STATUS_COLORS } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/LabeledSelect";

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  REGISTRATION: <User className="h-4 w-4" />,
  APPOINTMENT: <Calendar className="h-4 w-4" />,
  CONSULTATION: <Activity className="h-4 w-4" />,
  BILL: <Receipt className="h-4 w-4" />,
  MEDICATION: <Pill className="h-4 w-4" />,
};

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [uploadType, setUploadType] = useState("LAB_REPORT");
  const [uploadNotes, setUploadNotes] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPatient = () => {
    if (id) apiFetch(`/api/patients/${id}`).then(setPatient).catch(console.error);
  };

  useEffect(() => { loadPatient(); }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await apiFetch(`/api/patients/${id}/documents`, {
          method: "POST",
          body: JSON.stringify({
            name: file.name,
            type: uploadType,
            fileData: reader.result,
            mimeType: file.type,
            notes: uploadNotes || undefined,
            recordDate: recordDate || undefined,
          }),
        });
        toast.success("Document uploaded");
        setUploadNotes("");
        setRecordDate("");
        loadPatient();
      } catch { toast.error("Upload failed"); }
    };
    reader.readAsDataURL(file);
  };

  if (!patient) {
    return (
      <PageLayout title="Patient Profile" description="Loading...">
        <div className="text-center py-20 text-slate-500">Loading patient data...</div>
      </PageLayout>
    );
  }

  const stats = patient.stats || {};

  return (
    <PageLayout
      title={patient.name}
      description={`Patient ID: ${patient.patientId}`}
      actions={
        <Link href="/patients">
          <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Patients</Button>
        </Link>
      }
    >
      <PageCard className="mb-6 border-primary/20 bg-primary/5">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <AvatarInitials name={patient.name} size="lg" />
            <div>
              <p className="text-sm text-muted-foreground">Patient ID</p>
              <p className="text-2xl font-bold text-primary sm:text-3xl">{patient.patientId}</p>
              <p className="mt-1 capitalize text-sm text-muted-foreground">
                {patient.gender}, {patient.age} years · Registered {formatDate(patient.createdAt)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard title="Visits" value={String(stats.visitCount || 0)} icon={Activity} accent="blue" className="p-4" />
            <StatCard title="Bills" value={String(stats.billCount || 0)} icon={Receipt} accent="teal" className="p-4" />
            <StatCard title="Paid" value={formatCurrency(stats.totalPaid || 0)} icon={Receipt} accent="violet" className="p-4" />
            <StatCard title="Medicines" value={String(stats.medicationCount || 0)} icon={Pill} accent="amber" className="p-4" />
          </div>
        </div>
      </PageCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Phone", value: patient.phoneNumber },
          { label: "Blood Group", value: patient.bloodGroup?.toUpperCase() || "—" },
          { label: "Last Visit", value: stats.lastVisit ? formatDate(stats.lastVisit) : "—" },
          { label: "Email", value: patient.email || "—" },
          { label: "Emergency Contact", value: patient.emergencyContact || "—" },
          { label: "Total Billed", value: formatCurrency(stats.totalBilled || 0) },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase">{item.label}</p>
              <p className="font-medium mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {patient.medicalNotes && (
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-base">Medical Notes</CardTitle></CardHeader>
          <CardContent><p className="text-slate-700">{patient.medicalNotes}</p></CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="timeline">History Timeline</TabsTrigger>
          <TabsTrigger value="medications">Medications ({patient.medications?.length || 0})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({patient.appointments?.length || 0})</TabsTrigger>
          <TabsTrigger value="consultations">Consultations ({patient.consultations?.length || 0})</TabsTrigger>
          <TabsTrigger value="bills">Billing ({patient.bills?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({patient.documents?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="text-base">Complete Patient History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(patient.timeline || []).map((event: any, i: number) => (
                  <div key={i} className="flex gap-4 border-l-2 border-primary/30 pl-4 py-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                      {TIMELINE_ICONS[event.type] || <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{event.title}</p>
                        <Badge variant="outline" className="text-xs">{event.type}</Badge>
                        {event.status && <Badge className={STATUS_COLORS[event.status] || ""}>{event.status}</Badge>}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{event.detail}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(event.date)} at {formatTime(event.date)}</p>
                    </div>
                  </div>
                ))}
                {!patient.timeline?.length && <p className="text-center text-slate-500 py-6">No history yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Given</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(patient.medications || []).map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(m.date)}</TableCell>
                      <TableCell className="font-medium">{m.medicine}</TableCell>
                      <TableCell><Badge variant="outline">{m.source || "PRESCRIPTION"}</Badge></TableCell>
                      <TableCell>{m.dosage}</TableCell>
                      <TableCell>{m.duration}</TableCell>
                      <TableCell>{m.quantity}</TableCell>
                    </TableRow>
                  ))}
                  {!patient.medications?.length && (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-500">No medications recorded</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patient.appointments?.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{formatDate(a.appointmentDate)} {formatTime(a.appointmentDate)}</TableCell>
                      <TableCell>{a.doctor?.name || "—"}</TableCell>
                      <TableCell className="font-medium">{a.tokenLabel || `Token ${a.tokenNumber}`}</TableCell>
                      <TableCell>{a.reason || "—"}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultations">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patient.consultations?.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{formatDate(c.createdAt)}</TableCell>
                      <TableCell>{c.doctor?.name}</TableCell>
                      <TableCell>{c.diagnosis || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{c.treatment || "—"}</TableCell>
                      <TableCell>{c.fee ? formatCurrency(c.fee) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patient.bills?.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.billNumber}</TableCell>
                      <TableCell>{formatDate(b.createdAt)}</TableCell>
                      <TableCell>{b.type}</TableCell>
                      <TableCell>{formatCurrency(b.subtotal)}</TableCell>
                      <TableCell>{formatCurrency(b.gstAmount)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(b.total)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(b.paidAmount)}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[b.paymentStatus]}>{b.paymentStatus}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="mb-4">
            <CardContent className="p-4 flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <LabeledSelect
                  value={uploadType}
                  onValueChange={(v) => setUploadType(v || "LAB_REPORT")}
                  items={[
                    { value: "LAB_REPORT", label: "Lab Report" },
                    { value: "SCAN", label: "Scan" },
                    { value: "PRESCRIPTION", label: "Prescription" },
                    { value: "OTHER", label: "Other" },
                  ]}
                  placeholder="Select type"
                  triggerClassName="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Record Date (historical)</Label>
                <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} placeholder="e.g. 2002" />
                <p className="text-xs text-muted-foreground">For old records — leave blank for today</p>
              </div>
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label>Notes / OCR text</Label>
                <Input value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} placeholder="Manual notes or extracted text (OCR coming soon)" />
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
                <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Upload Record (Image/PDF)
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Record Date</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patient.documents?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.type.replace("_", " ")}</TableCell>
                      <TableCell>{d.notes || "—"}</TableCell>
                      <TableCell>{d.recordDate ? formatDate(d.recordDate) : "—"}</TableCell>
                      <TableCell>{formatDate(d.createdAt)}</TableCell>
                      <TableCell>
                        {(d.url || d.fileData) ? (
                          <a href={d.url || d.fileData} target="_blank" rel="noreferrer" className="text-primary text-xs">View</a>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
