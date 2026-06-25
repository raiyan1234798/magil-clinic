"use client";

import { PageLayout } from "@/components/PageLayout";
import { ScrollableTable } from "@/components/ScrollableTable";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageCard } from "@/components/PageCard";
import { EmptyState } from "@/components/EmptyState";
import { PatientCombobox } from "@/components/PatientCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceView } from "@/components/InvoiceView";
import { Plus, Eye, FileText, TrendingUp, TrendingDown, DollarSign, Receipt, Trash2, User, UserPlus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, formatDate, formatCurrency, showApiError } from "@/lib/api";
import { toast } from "sonner";
import { calculateBillAmounts } from "@/lib/billing";

type GstSettings = { gstEnabled: boolean; gstRate: number };
type PatientMode = "existing" | "walkin" | "anonymous";
type Medicine = { id: string; name: string; price: number; stock: number; unit?: string };

type PharmacyLine = {
  key: string;
  medicineId: string;
  quantity: string;
  unitPrice: string;
};

const defaultPharmacyLine = (): PharmacyLine => ({
  key: crypto.randomUUID(),
  medicineId: "",
  quantity: "1",
  unitPrice: "",
});

function getBillPatientLabel(b: { patient?: { name?: string }; walkInName?: string; isAnonymous?: boolean }) {
  if (b.patient?.name) return b.patient.name;
  if (b.walkInName) return b.walkInName;
  if (b.isAnonymous) return "Walk-in Customer";
  return "—";
}

function BillingContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "finance" ? "finance" : "invoices";

  const [bills, setBills] = useState<any[]>([]);
  const [gstSettings, setGstSettings] = useState<GstSettings>({ gstEnabled: true, gstRate: 18 });
  const [financeData, setFinanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [viewBill, setViewBill] = useState<any>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patientMode, setPatientMode] = useState<PatientMode>("existing");
  const [pharmacyLines, setPharmacyLines] = useState<PharmacyLine[]>([defaultPharmacyLine()]);
  const [form, setForm] = useState({
    patientId: "",
    walkInName: "",
    walkInPhone: "",
    type: "CONSULTATION",
    description: "",
    unitPrice: "",
    quantity: "1",
    paymentMethod: "CASH",
    gstEnabled: true,
    gstRate: "18",
    discountPercent: "0",
  });
  const [expenseForm, setExpenseForm] = useState({ category: "", description: "", amount: "" });

  const loadBills = () => {
    setLoading(true);
    apiFetch<any[]>("/api/bills")
      .then(setBills)
      .catch((err) => showApiError(err, "Failed to load bills"))
      .finally(() => setLoading(false));
  };

  const loadFinance = () => apiFetch("/api/finance").then(setFinanceData).catch(() => {});
  const loadMedicines = () => apiFetch<Medicine[]>("/api/medicines").then(setMedicines).catch(() => {});

  useEffect(() => {
    loadBills();
    loadFinance();
    apiFetch<GstSettings>("/api/settings")
      .then((s) => setGstSettings({ gstEnabled: s.gstEnabled ?? true, gstRate: s.gstRate ?? 18 }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open && form.type === "PHARMACY") loadMedicines();
  }, [open, form.type]);

  const lineItemsForPreview = useMemo(() => {
    if (form.type === "PHARMACY") {
      return pharmacyLines
        .filter((l) => l.medicineId)
        .map((l) => ({
          quantity: parseInt(l.quantity || "1", 10) || 1,
          unitPrice: parseFloat(l.unitPrice) || medicines.find((m) => m.id === l.medicineId)?.price || 0,
        }));
    }
    const qty = parseInt(form.quantity || "1", 10) || 1;
    const price = parseFloat(form.unitPrice) || 0;
    return form.unitPrice ? [{ quantity: qty, unitPrice: price }] : [];
  }, [form.type, form.quantity, form.unitPrice, pharmacyLines, medicines]);

  const discountPercentNum = parseFloat(form.discountPercent) || 0;
  const gstRateNum = parseFloat(form.gstRate) || 0;
  const preview = calculateBillAmounts(lineItemsForPreview, discountPercentNum, form.gstEnabled, gstRateNum);

  const resetInvoiceForm = () => {
    setPatientMode("existing");
    setPharmacyLines([defaultPharmacyLine()]);
    setForm({
      patientId: "",
      walkInName: "",
      walkInPhone: "",
      type: "CONSULTATION",
      description: "",
      unitPrice: "",
      quantity: "1",
      paymentMethod: "CASH",
      gstEnabled: gstSettings.gstEnabled,
      gstRate: String(gstSettings.gstRate),
      discountPercent: "0",
    });
  };

  const openInvoiceDialog = () => {
    resetInvoiceForm();
    setForm((f) => ({
      ...f,
      gstEnabled: gstSettings.gstEnabled,
      gstRate: String(gstSettings.gstRate),
    }));
    setOpen(true);
  };

  const updatePharmacyLine = (key: string, patch: Partial<PharmacyLine>) => {
    setPharmacyLines((lines) =>
      lines.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.medicineId) {
          const med = medicines.find((m) => m.id === patch.medicineId);
          if (med) next.unitPrice = String(med.price);
        }
        return next;
      }),
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (patientMode === "existing" && !form.patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (patientMode === "walkin" && !form.walkInName.trim()) {
      toast.error("Please enter customer name");
      return;
    }

    let items: { description: string; quantity: number; unitPrice: number; medicineId?: string }[] = [];

    if (form.type === "PHARMACY") {
      const validLines = pharmacyLines.filter((l) => l.medicineId);
      if (!validLines.length) {
        toast.error("Add at least one medicine");
        return;
      }
      for (const line of validLines) {
        const med = medicines.find((m) => m.id === line.medicineId);
        if (!med) {
          toast.error("Invalid medicine selected");
          return;
        }
        const qty = parseInt(line.quantity || "1", 10);
        if (qty < 1) {
          toast.error("Quantity must be at least 1");
          return;
        }
        if (med.stock < qty) {
          toast.error(`Insufficient stock for ${med.name}`);
          return;
        }
        items.push({
          description: med.name,
          quantity: qty,
          unitPrice: parseFloat(line.unitPrice) || med.price,
          medicineId: med.id,
        });
      }
    } else {
      if (!form.description.trim()) {
        toast.error("Description is required");
        return;
      }
      if (!form.unitPrice) {
        toast.error("Amount is required");
        return;
      }
      items = [{
        description: form.description,
        quantity: parseInt(form.quantity || "1", 10) || 1,
        unitPrice: parseFloat(form.unitPrice),
      }];
    }

    try {
      await apiFetch("/api/bills", {
        method: "POST",
        body: JSON.stringify({
          patientId: patientMode === "existing" ? form.patientId : null,
          walkInName: patientMode === "walkin" ? form.walkInName.trim() : null,
          walkInPhone: patientMode === "walkin" ? form.walkInPhone.trim() || null : null,
          isAnonymous: patientMode === "anonymous",
          type: form.type,
          paymentMethod: form.paymentMethod,
          gstEnabled: form.gstEnabled,
          gstRate: gstRateNum,
          discountPercent: discountPercentNum,
          items,
        }),
      });
      toast.success("Invoice generated!");
      setOpen(false);
      resetInvoiceForm();
      loadBills();
      loadFinance();
      if (form.type === "PHARMACY") loadMedicines();
    } catch (err) {
      showApiError(err, "Failed to create bill");
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
    } catch (err) {
      showApiError(err, "Failed to load invoice");
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
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-primary" /> Record Expense</DialogTitle>
                <DialogDescription>Track clinic operating costs</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleExpense} className="space-y-4 px-5 py-4">
                <div className="space-y-2"><Label>Category</Label><Input value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required /></div>
                <DialogFooter className="px-0 pb-0">
                  <Button type="submit" className="w-full sm:w-auto">Save Expense</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button className="gap-2" onClick={openInvoiceDialog}><Plus className="h-4 w-4" /> Generate Invoice</Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetInvoiceForm(); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Generate Invoice</DialogTitle>
                <DialogDescription>Create bills for registered patients, walk-ins, or medicine-only sales</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-5 px-5 py-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Tabs value={patientMode} onValueChange={(v) => setPatientMode((v as PatientMode) || "existing")}>
                    <TabsList className="grid w-full grid-cols-3 h-auto">
                      <TabsTrigger value="existing" className="gap-1 text-xs sm:text-sm py-2"><User className="h-3.5 w-3.5 shrink-0" /> Existing</TabsTrigger>
                      <TabsTrigger value="walkin" className="gap-1 text-xs sm:text-sm py-2"><UserPlus className="h-3.5 w-3.5 shrink-0" /> Walk-in</TabsTrigger>
                      <TabsTrigger value="anonymous" className="gap-1 text-xs sm:text-sm py-2"><ShoppingBag className="h-3.5 w-3.5 shrink-0" /> Medicine only</TabsTrigger>
                    </TabsList>
                    <TabsContent value="existing" className="mt-3">
                      <PatientCombobox
                        value={form.patientId}
                        onChange={(id) => setForm({ ...form, patientId: id })}
                        returnUrl="/billing"
                        required={patientMode === "existing"}
                      />
                    </TabsContent>
                    <TabsContent value="walkin" className="mt-3 space-y-3">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input value={form.walkInName} onChange={(e) => setForm({ ...form, walkInName: e.target.value })} placeholder="Customer name" required={patientMode === "walkin"} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone (optional)</Label>
                        <Input value={form.walkInPhone} onChange={(e) => setForm({ ...form, walkInPhone: e.target.value })} placeholder="+91 ..." />
                      </div>
                    </TabsContent>
                    <TabsContent value="anonymous" className="mt-3">
                      <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                        Bill will be issued with invoice number only — no patient name on record. Ideal for quick medicine counter sales.
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Label>Invoice Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "CONSULTATION" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSULTATION">Consultation</SelectItem>
                      <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                      <SelectItem value="SERVICE">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.type === "PHARMACY" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Medicines from inventory</Label>
                      <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setPharmacyLines((l) => [...l, defaultPharmacyLine()])}>
                        <Plus className="h-3.5 w-3.5" /> Add item
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {pharmacyLines.map((line, idx) => {
                        const med = medicines.find((m) => m.id === line.medicineId);
                        const lineTotal = (parseInt(line.quantity || "1", 10) || 1) * (parseFloat(line.unitPrice) || med?.price || 0);
                        return (
                          <div key={line.key} className="rounded-lg border border-border/60 p-3 space-y-3 bg-muted/10">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                              {pharmacyLines.length > 1 && (
                                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setPharmacyLines((l) => l.filter((x) => x.key !== line.key))}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Medicine</Label>
                              <Select value={line.medicineId} onValueChange={(v) => updatePharmacyLine(line.key, { medicineId: v ?? "" })}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Search & select medicine" /></SelectTrigger>
                                <SelectContent>
                                  {medicines.map((m) => (
                                    <SelectItem key={m.id} value={m.id} disabled={m.stock <= 0}>
                                      {m.name} — {formatCurrency(m.price)} (Stock: {m.stock})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Qty</Label>
                                <Input type="number" min="1" value={line.quantity} onChange={(e) => updatePharmacyLine(line.key, { quantity: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Rate (₹)</Label>
                                <Input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updatePharmacyLine(line.key, { unitPrice: e.target.value })} />
                              </div>
                              <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label className="text-xs">Line total</Label>
                                <div className="h-9 flex items-center text-sm font-semibold text-primary">{formatCurrency(lineTotal)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Consultation fee, procedure, etc." required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required /></div>
                      <div className="space-y-2"><Label>Qty</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Discount / Offer %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gstEnabled" className="cursor-pointer">Apply GST</Label>
                    <input
                      id="gstEnabled"
                      type="checkbox"
                      checked={form.gstEnabled}
                      onChange={(e) => setForm({ ...form, gstEnabled: e.target.checked })}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                  </div>
                  {form.gstEnabled && (
                    <div className="space-y-2">
                      <Label>GST Rate (%)</Label>
                      <div className="flex gap-2 flex-wrap">
                        {[5, 12, 18, 28].map((r) => (
                          <Button
                            key={r}
                            type="button"
                            size="sm"
                            variant={form.gstRate === String(r) ? "default" : "outline"}
                            onClick={() => setForm({ ...form, gstRate: String(r) })}
                          >
                            {r}%
                          </Button>
                        ))}
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={form.gstRate}
                          onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                          className="w-20"
                          placeholder="Custom"
                        />
                      </div>
                    </div>
                  )}
                  <div className="text-sm space-y-1 pt-2 border-t border-border/40">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(preview.subtotal)}</span></div>
                    {preview.discountAmount > 0 && (
                      <div className="flex justify-between text-rose-600"><span>Discount ({discountPercentNum}%)</span><span>-{formatCurrency(preview.discountAmount)}</span></div>
                    )}
                    {form.gstEnabled && <div className="flex justify-between"><span className="text-muted-foreground">GST ({gstRateNum}%)</span><span>{formatCurrency(preview.gstAmount)}</span></div>}
                    <div className="flex justify-between font-semibold"><span>Total</span><span className="text-primary">{formatCurrency(preview.total)}</span></div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Discount applied on subtotal; GST calculated on discounted amount.</p>
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
                <DialogFooter className="px-0 pb-0">
                  <Button type="submit" className="w-full">Generate Invoice</Button>
                </DialogFooter>
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
                        <TableCell>{getBillPatientLabel(b)}</TableCell>
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
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-3xl overflow-x-hidden overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Invoice
            </DialogTitle>
            {viewBill && (
              <DialogDescription>
                {viewBill.billNumber} · {formatDate(viewBill.createdAt)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="min-w-0 overflow-x-hidden px-5 pb-5">
            {viewBill && <InvoiceView bill={viewBill} onClose={() => setViewBill(null)} />}
          </div>
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
