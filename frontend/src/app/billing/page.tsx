"use client";

import { PageLayout } from "@/components/PageLayout";
import { ScrollableTable } from "@/components/ScrollableTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceView } from "@/components/InvoiceView";
import { Plus, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatDate, formatCurrency, STATUS_COLORS } from "@/lib/api";
import { toast } from "sonner";

export default function BillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewBill, setViewBill] = useState<any>(null);
  const [form, setForm] = useState({ patientId: "", type: "CONSULTATION", description: "", unitPrice: "", quantity: "1", paymentMethod: "CASH" });

  const load = () => {
    setLoading(true);
    apiFetch<any[]>("/api/bills")
      .then(setBills)
      .catch(() => toast.error("Failed to load bills"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiFetch<any[]>("/api/patients").then(setPatients).catch(() => toast.error("Failed to load patients"));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      toast.error("Please select a patient");
      return;
    }
    try {
      await apiFetch("/api/bills", {
        method: "POST",
        body: JSON.stringify({
          patientId: form.patientId,
          type: form.type,
          paymentMethod: form.paymentMethod,
          gstRate: 0.18,
          items: [{ description: form.description, quantity: parseInt(form.quantity), unitPrice: parseFloat(form.unitPrice) }],
        }),
      });
      toast.success("Invoice generated!");
      setOpen(false);
      setForm({ patientId: "", type: "CONSULTATION", description: "", unitPrice: "", quantity: "1", paymentMethod: "CASH" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bill");
    }
  };

  const viewInvoice = async (id: string) => {
    try {
      const bill = await apiFetch(`/api/bills/${id}`);
      setViewBill(bill);
    } catch { toast.error("Failed to load invoice"); }
  };

  const totalRevenue = bills.reduce((s, b) => s + b.paidAmount, 0);
  const pending = bills.filter((b) => b.paymentStatus === "PENDING" || b.paymentStatus === "PARTIAL").length;

  return (
    <PageLayout
      title="Billing"
      description="Consultation billing, invoices, payments, and receipts."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> Generate Invoice</Button>} />
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Generate Invoice</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.length === 0 ? (
                      <SelectItem value="__none" disabled>No patients found</SelectItem>
                    ) : (
                      patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.patientId} — {p.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "CONSULTATION" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTATION">Consultation</SelectItem>
                    <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Qty</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v ?? "CASH" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Generate Invoice (GST 18%)</Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card><CardContent className="p-4 sm:p-6"><p className="text-sm text-slate-500">Total Collected</p><p className="text-xl sm:text-2xl font-bold">{formatCurrency(totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4 sm:p-6"><p className="text-sm text-slate-500">Total Invoices</p><p className="text-xl sm:text-2xl font-bold">{bills.length}</p></CardContent></Card>
        <Card className="sm:col-span-2 lg:col-span-1"><CardContent className="p-4 sm:p-6"><p className="text-sm text-slate-500">Pending Payments</p><p className="text-xl sm:text-2xl font-bold text-orange-600">{pending}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollableTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading invoices…</TableCell></TableRow>
                ) : bills.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">No invoices yet. Generate your first invoice above.</TableCell></TableRow>
                ) : (
                  bills.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium whitespace-nowrap">{b.billNumber}</TableCell>
                      <TableCell>{b.patient?.name || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell">{b.type}</TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">{formatCurrency(b.total)}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[b.paymentStatus]}>{b.paymentStatus}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap">{formatDate(b.createdAt)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => viewInvoice(b.id)}>
                          <Eye className="h-4 w-4" /> <span className="hidden sm:inline">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollableTable>
        </CardContent>
      </Card>

      <Dialog open={!!viewBill} onOpenChange={(open) => !open && setViewBill(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice</DialogTitle></DialogHeader>
          {viewBill && <InvoiceView bill={viewBill} onClose={() => setViewBill(null)} />}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
