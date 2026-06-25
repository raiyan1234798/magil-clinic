"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/LabeledSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PatientCombobox } from "@/components/PatientCombobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pill } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatCurrency } from "@/lib/api";
import { toast } from "sonner";

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", manufacturer: "", price: "", stock: "", minStock: "10" });
  const [sales, setSales] = useState<any[]>([]);
  const [dispense, setDispense] = useState({ medicineId: "", patientId: "", quantity: "1", notes: "" });

  const load = () => {
    apiFetch<any[]>("/api/medicines").then(setMedicines).catch(() => {});
    apiFetch<any[]>("/api/pharmacy/sales").then(setSales).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/medicines", { method: "POST", body: JSON.stringify(form) });
      toast.success("Medicine added!");
      setOpen(false);
      load();
    } catch { toast.error("Failed to add medicine"); }
  };

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/pharmacy/dispense", { method: "POST", body: JSON.stringify(dispense) });
      toast.success("Medicine dispensed!");
      setDispenseOpen(false);
      load();
    } catch (err: any) { toast.error(err.message || "Failed to dispense"); }
  };

  return (
    <PageLayout
      title="Pharmacy"
      description="Medicine inventory, dispensing, and pharmacy billing."
      actions={
        <div className="flex gap-2">
          <Dialog open={dispenseOpen} onOpenChange={setDispenseOpen}>
            <DialogTrigger render={<Button variant="secondary" className="gap-2"><Pill className="h-4 w-4" /> Dispense</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Pill className="h-5 w-5 text-primary" /> Dispense Medicine</DialogTitle>
                <DialogDescription>Dispense to patient and update inventory</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleDispense} className="space-y-4 px-5 py-4">
                <PatientCombobox
                  value={dispense.patientId}
                  onChange={(id) => setDispense({ ...dispense, patientId: id })}
                  returnUrl="/pharmacy"
                  required
                />
                <div className="space-y-2">
                  <Label>Medicine</Label>
                  <LabeledSelect
                    value={dispense.medicineId}
                    onValueChange={(v) => setDispense({ ...dispense, medicineId: v })}
                    items={medicines.map((m) => ({
                      value: m.id,
                      label: `${m.name} (Stock: ${m.stock})`,
                    }))}
                    placeholder="Select medicine"
                  />
                </div>
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={dispense.quantity} onChange={(e) => setDispense({ ...dispense, quantity: e.target.value })} min="1" /></div>
                <Button type="submit" className="w-full" disabled={!dispense.patientId}>Dispense & Update Inventory</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> Add Medicine</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Pill className="h-5 w-5 text-primary" /> Add Medicine</DialogTitle>
                <DialogDescription>Add a new medicine to pharmacy inventory</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 px-5 py-4">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div className="space-y-2"><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                </div>
                <Button type="submit" className="w-full">Add Medicine</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.medicineId}</TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.category || "—"}</TableCell>
                  <TableCell>{formatCurrency(m.price)}</TableCell>
                  <TableCell className={m.stock <= m.minStock ? "text-red-600 font-semibold" : ""}>{m.stock}</TableCell>
                  <TableCell>
                    <Badge className={m.stock <= m.minStock ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                      {m.stock <= m.minStock ? "Low Stock" : "In Stock"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {sales.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.slice(0, 10).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.patient?.name || "—"} {s.patient?.patientId && <span className="text-primary text-xs">({s.patient.patientId})</span>}</TableCell>
                    <TableCell>{s.medicine?.name}</TableCell>
                    <TableCell>{s.quantity}</TableCell>
                    <TableCell>{formatCurrency(s.total)}</TableCell>
                    <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}
