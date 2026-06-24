"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatDate, formatCurrency } from "@/lib/api";
import { toast } from "sonner";

export default function FinancePage() {
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "", description: "", amount: "" });

  const load = () => apiFetch("/api/finance").then(setData).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/expenses", { method: "POST", body: JSON.stringify({ ...expenseForm, amount: parseFloat(expenseForm.amount) }) });
      toast.success("Expense recorded!");
      setOpen(false);
      load();
    } catch { toast.error("Failed to record expense"); }
  };

  return (
    <PageLayout
      title="Finance"
      description="Income tracking, expenses, cash flow, and profit analysis."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> Add Expense</Button>} />
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
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <TrendingUp className="h-10 w-10 text-green-500" />
            <div>
              <p className="text-sm text-slate-500">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{data ? formatCurrency(data.totalIncome) : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <TrendingDown className="h-10 w-10 text-red-500" />
            <div>
              <p className="text-sm text-slate-500">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{data ? formatCurrency(data.totalExpense) : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Net Profit</p>
            <p className={`text-2xl font-bold ${data && data.profit >= 0 ? "text-primary" : "text-red-600"}`}>
              {data ? formatCurrency(data.profit) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="income">
        <TabsList>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value="income">
          <Card>
            <CardContent className="p-0">
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
                  {data?.incomes?.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.source}</TableCell>
                      <TableCell>{i.description || "—"}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(i.amount)}</TableCell>
                      <TableCell>{formatDate(i.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses">
          <Card>
            <CardContent className="p-0">
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
                  {data?.expenses?.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.category}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(e.amount)}</TableCell>
                      <TableCell>{formatDate(e.date)}</TableCell>
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
