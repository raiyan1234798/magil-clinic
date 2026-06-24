"use client";

import { PageLayout } from "@/components/PageLayout";
import { ScrollableTable } from "@/components/ScrollableTable";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageCard } from "@/components/PageCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceView } from "@/components/InvoiceView";
import { Plus, Eye, FileText, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, formatDate, formatCurrency, ApiError } from "@/lib/api";
import { toast } from "sonner";

function BillingContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "finance" ? "finance" : "invoices";

  const [bills, setBills] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [viewBill, setViewBill] = useState<any>(null);
  const [form, setForm] = useState({ patientId: "", type: "CONSULTATION", description: "", unitPrice: "", quantity: "1", paymentMethod: "CASH" });
  const [expenseForm, setExpenseForm] = useState({ category: "", description: "", amount: "" });

  const loadBills = () => {
    setLoading(true);
    apiFetch<any[]>("/api/bills")
      .then(setBills)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load bills"))
      .finally(() => setLoading(false));
  };

  const loadFinance = () => apiFetch("/api/finance").then(setFinanceData).catch(console.error);

  useEffect(() => {
    loadBills();
    loadFinance();
    apiFetch<any[]>("/api/patients")
      .then(setPatients)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load patients"));
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
      loadBills();
      loadFinance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bill");
    }
  };

  const handleExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/expenses", { method: "POST", body: JSON.stringify({ ...expenseForm, amount: parseFloat(expenseForm.amount) }) });
      toast.success("Expense recorded!");
      setExpenseOpen(false);
      loadFinance();
    } catch {
      toast.error("Failed to record expense");
    }
  };

  const viewInvoice = async (id: string) => {
    try {
      const bill = await apiFetch(`/api/bills/${id}`);
      setViewBill(bill);
    } catch {
      toast.error("Failed to load invoice");
    }
  };

  const totalRevenue = bills.reduce((s, b) => s + b.paidAmount, 0);
  const pending = bills.filter((b) => b.paymentStatus === "PENDING" || b.paymentStatus === "PARTIAL").length;

  return (
    <PageLayout
      title="Billing & Finance"
      description="Invoices, payments, income tracking, and expenses."
      actions={
        <div className="flex gap-2">
          <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
            <DialogTrigger render={<Button variant="outline" className="gap-2"><TrendingDown className="h-4 w-4" /> Add Expense</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
              <form onSubmit={handleExpense} className="space-y-4">
                <div className="space-y-2"><Label>Category</Label><Input value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required /></div>
                <Button type="submit" className="w-full">Save Expense</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> Generate Invoice</Button>} />
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
        </div>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Collected" value={formatCurrency(totalRevenue)} icon={DollarSign} accent="teal" />
        <StatCard title="Total Invoices" value={String(bills.length)} icon={FileText} accent="blue" />
        <StatCard title="Pending Payments" value={String(pending)} icon={TrendingUp} accent="amber" />
        <StatCard
          title="Net Profit"
          value={financeData ? formatCurrency(financeData.profit) : "—"}
          icon={TrendingUp}
          accent="violet"
          loading={!financeData}
        />
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <PageCard noPadding>
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
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><div className="skeleton mx-auto h-8 w-48" /></TableCell></TableRow>
                  ) : bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState icon={FileText} title="No invoices yet" description="Generate your first invoice above." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium whitespace-nowrap">{b.billNumber}</TableCell>
                        <TableCell>{b.patient?.name || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell">{b.type}</TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">{formatCurrency(b.total)}</TableCell>
                        <TableCell><StatusBadge status={b.paymentStatus} /></TableCell>
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
          </PageCard>
        </TabsContent>

        <TabsContent value="finance">
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Income" value={financeData ? formatCurrency(financeData.totalIncome) : "—"} icon={TrendingUp} accent="teal" loading={!financeData} />
            <StatCard title="Total Expenses" value={financeData ? formatCurrency(financeData.totalExpense) : "—"} icon={TrendingDown} accent="rose" loading={!financeData} />
            <StatCard
              title="Net Profit"
              value={financeData ? formatCurrency(financeData.profit) : "—"}
              icon={DollarSign}
              accent="violet"
              loading={!financeData}
            />
          </div>
          <Tabs defaultValue="income">
            <TabsList className="mb-4">
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
            </TabsList>
            <TabsContent value="income">
              <PageCard noPadding>
                <ScrollableTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financeData?.incomes?.map((i: any) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.source}</TableCell>
                          <TableCell>{i.description || "—"}</TableCell>
                          <TableCell className="font-semibold text-teal-600">{formatCurrency(i.amount)}</TableCell>
                          <TableCell>{formatDate(i.date)}</TableCell>
                        </TableRow>
                      ))}
                      {!financeData?.incomes?.length && (
                        <TableRow><TableCell colSpan={4}><EmptyState icon={TrendingUp} title="No income records" /></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollableTable>
              </PageCard>
            </TabsContent>
            <TabsContent value="expenses">
              <PageCard noPadding>
                <ScrollableTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financeData?.expenses?.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.category}</TableCell>
                          <TableCell>{e.description}</TableCell>
                          <TableCell className="font-semibold text-rose-600">{formatCurrency(e.amount)}</TableCell>
                          <TableCell>{formatDate(e.date)}</TableCell>
                        </TableRow>
                      ))}
                      {!financeData?.expenses?.length && (
                        <TableRow><TableCell colSpan={4}><EmptyState icon={TrendingDown} title="No expenses recorded" /></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollableTable>
              </PageCard>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewBill} onOpenChange={(o) => !o && setViewBill(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice</DialogTitle></DialogHeader>
          {viewBill && <InvoiceView bill={viewBill} onClose={() => setViewBill(null)} />}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<PageLayout title="Billing" description="Loading..."><div className="skeleton h-64 w-full" /></PageLayout>}>
      <BillingContent />
    </Suspense>
  );
}
