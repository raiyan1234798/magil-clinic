"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { apiFetch, formatCurrency, STATUS_COLORS } from "@/lib/api";
import { toast } from "sonner";

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);

  const load = () => apiFetch<any[]>("/api/payroll").then(setPayrolls).catch(console.error);
  useEffect(() => { load(); }, []);

  const processPayroll = async () => {
    try {
      await apiFetch("/api/payroll/process", { method: "POST", body: JSON.stringify({ month: "June", year: 2026 }) });
      toast.success("Payroll processed!");
      load();
    } catch { toast.error("Failed to process payroll"); }
  };

  const totalPayroll = payrolls.reduce((s, p) => s + p.netSalary, 0);

  return (
    <PageLayout
      title="Payroll"
      description="Salary management, payroll processing, and salary slips."
      actions={<Button onClick={processPayroll}>Process Payroll</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">Total Payroll</p><p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">Employees on Payroll</p><p className="text-2xl font-bold">{payrolls.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Bonuses</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.user?.name}</TableCell>
                  <TableCell>{p.month} {p.year}</TableCell>
                  <TableCell>{formatCurrency(p.baseSalary)}</TableCell>
                  <TableCell className="text-red-600">-{formatCurrency(p.deductions)}</TableCell>
                  <TableCell className="text-green-600">+{formatCurrency(p.bonuses)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(p.netSalary)}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
