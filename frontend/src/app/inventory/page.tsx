"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/LabeledSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatDate, formatCurrency } from "@/lib/api";
import { toast } from "sonner";

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [stockOpen, setStockOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [stockForm, setStockForm] = useState({ medicineId: "", type: "STOCK_IN", quantity: "", notes: "" });
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", address: "" });

  const load = () => {
    apiFetch<any[]>("/api/medicines").then(setMedicines);
    apiFetch<any[]>("/api/suppliers").then(setSuppliers);
    apiFetch<any[]>("/api/purchases").then(setPurchases);
  };
  useEffect(() => { load(); }, []);

  const handleStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/medicines/${stockForm.medicineId}/stock`, { method: "POST", body: JSON.stringify(stockForm) });
      toast.success("Stock updated!");
      setStockOpen(false);
      load();
    } catch { toast.error("Failed to update stock"); }
  };

  const handleSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/suppliers", { method: "POST", body: JSON.stringify(supplierForm) });
      toast.success("Supplier added!");
      setSupplierOpen(false);
      load();
    } catch { toast.error("Failed to add supplier"); }
  };

  const lowStock = medicines.filter((m) => m.stock <= m.minStock);

  return (
    <PageLayout
      title="Inventory"
      description="Medicine stock, stock in/out, expiry tracking, and suppliers."
      actions={
        <div className="flex gap-2">
          <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
            <DialogTrigger render={<Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Supplier</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
              <form onSubmit={handleSupplier} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
                <Button type="submit" className="w-full">Add Supplier</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={stockOpen} onOpenChange={setStockOpen}>
            <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> Stock Movement</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Stock In / Out</DialogTitle>
                <DialogDescription>Record inventory movements for medicines.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleStock} className="space-y-4">
                <div className="space-y-2">
                  <Label>Medicine</Label>
                  <LabeledSelect
                    value={stockForm.medicineId}
                    onValueChange={(v) => setStockForm({ ...stockForm, medicineId: v })}
                    items={medicines.map((m) => ({ value: m.id, label: m.name }))}
                    placeholder="Select medicine"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <LabeledSelect
                    value={stockForm.type}
                    onValueChange={(v) => setStockForm({ ...stockForm, type: v || "STOCK_IN" })}
                    items={[
                      { value: "STOCK_IN", label: "Stock In" },
                      { value: "STOCK_OUT", label: "Stock Out" },
                    ]}
                    placeholder="Select type"
                  />
                </div>
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Notes</Label><Input value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full">Update Stock</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {lowStock.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="font-medium text-orange-800">{lowStock.length} medicine(s) below minimum stock level</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Medicine Stock</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Records</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicines.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.category || "—"}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {m.stock <= m.minStock ? <ArrowDown className="h-3 w-3 text-red-500" /> : <ArrowUp className="h-3 w-3 text-green-500" />}
                          {m.stock}
                        </span>
                      </TableCell>
                      <TableCell>{m.minStock}</TableCell>
                      <TableCell>{m.expiryDate ? formatDate(m.expiryDate) : "—"}</TableCell>
                      <TableCell>{formatCurrency(m.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Purchases</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.phone || "—"}</TableCell>
                      <TableCell>{s.email || "—"}</TableCell>
                      <TableCell>{s.purchases?.length || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.supplier?.name}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>{formatCurrency(p.totalCost)}</TableCell>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
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
