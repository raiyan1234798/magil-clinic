"use client";

import { PageLayout } from "@/components/PageLayout";
import { PageCard } from "@/components/PageCard";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { apiFetch, formatCurrency, STATUS_COLORS, showApiError } from "@/lib/api";
import { toast } from "sonner";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PayrollPage() {
  const now = new Date();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  const load = () => apiFetch<any[]>("/api/payroll").then(setPayrolls).catch((err) => showApiError(err, "Failed to load payroll"));

  useEffect(() => {
    load();
  }, []);

  const processPayroll = async () => {
    setProcessing(true);
    try {
      const month = MONTH_NAMES[now.getMonth()];
      const year = now.getFullYear();
      await apiFetch("/api/payroll/process", {
        method: "POST",
        body: JSON.stringify({ month, year }),
      });
      toast.success(`Payroll processed for ${month} ${year} based on attendance`);
      load();
    } catch (err) {
      showApiError(err, "Failed to process payroll");
    } finally {
      setProcessing(false);
    }
  };

  const totalPayroll = payrolls.reduce((s, p) => s + p.netSalary, 0);
  const currentMonth = MONTH_NAMES[now.getMonth()];

  return (
    <PageLayout
      title="Payroll"
      description="Salary calculated from daily attendance — present (full day), half day (50%), absent (no pay)."
      actions={
        <Button onClick={processPayroll} disabled={processing}>
          {processing ? "Processing…" : `Process ${currentMonth} Payroll`}
        </Button>
      }
    >
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <PageCard className="!p-6">
          <p className="text-sm text-muted-foreground">Total Net Payroll</p>
          <p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p>
        </PageCard>
        <PageCard className="!p-6">
          <p className="text-sm text-muted-foreground">Employees on Payroll</p>
          <p className="text-2xl font-bold">{payrolls.length}</p>
        </PageCard>
      </div>

      <PageCard noPadding>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Half Days</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.user?.name}</TableCell>
                  <TableCell>
                    {p.month} {p.year}
                  </TableCell>
                  <TableCell>{formatCurrency(p.baseSalary)}</TableCell>
                  <TableCell className="text-green-600">{p.daysPresent ?? 0}</TableCell>
                  <TableCell className="text-amber-600">{p.halfDays ?? 0}</TableCell>
                  <TableCell className="text-red-600">{p.absentDays ?? 0}</TableCell>
                  <TableCell className="text-red-600">-{formatCurrency(p.deductions)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(p.netSalary)}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!payrolls.length && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No payroll records yet. Process payroll after marking attendance for the month.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageCard>

      <p className="mt-4 text-sm text-muted-foreground">
        Formula: daily rate = base salary ÷ 30. Net pay = (present days + half days × 0.5) × daily rate. Absent days receive no pay.
      </p>
    </PageLayout>
  );
}
