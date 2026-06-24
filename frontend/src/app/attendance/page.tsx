"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { apiFetch, formatDate, formatTime } from "@/lib/api";
import { canViewRoles, getUser } from "@/lib/auth";
import { toast } from "sonner";

export default function AttendancePage() {
  const showRoles = canViewRoles(getUser());
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const load = () => apiFetch<any[]>("/api/attendance").then(setRecords).catch(console.error);
  useEffect(() => {
    load();
    apiFetch<any[]>("/api/employees").then(setEmployees);
  }, []);

  const checkIn = async (userId: string) => {
    try {
      await apiFetch("/api/attendance/checkin", { method: "POST", body: JSON.stringify({ userId }) });
      toast.success("Checked in!");
      load();
    } catch { toast.error("Check-in failed"); }
  };

  const checkOut = async (id: string) => {
    try {
      await apiFetch(`/api/attendance/${id}/checkout`, { method: "POST" });
      toast.success("Checked out!");
      load();
    } catch { toast.error("Check-out failed"); }
  };

  const presentToday = records.filter((r) => !r.checkOut).length;

  return (
    <PageLayout title="Attendance" description="Employee attendance, check-in, check-out, and reports.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">Present Today</p><p className="text-2xl font-bold text-green-600">{presentToday}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">Total Records</p><p className="text-2xl font-bold">{records.length}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">Employees</p><p className="text-2xl font-bold">{employees.length}</p></CardContent></Card>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Quick Check-in</h3>
          <div className="flex flex-wrap gap-2">
            {employees.map((emp) => (
              <Button key={emp.id} variant="outline" size="sm" onClick={() => checkIn(emp.id)}>
                {emp.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                {showRoles && <TableHead>Role</TableHead>}
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.user?.name}</TableCell>
                  {showRoles && <TableCell>{r.user?.role?.replace(/_/g, " ")}</TableCell>}
                  <TableCell>{formatTime(r.checkIn)}</TableCell>
                  <TableCell>{r.checkOut ? formatTime(r.checkOut) : "—"}</TableCell>
                  <TableCell><Badge>{r.status}</Badge></TableCell>
                  <TableCell>
                    {!r.checkOut && <Button size="sm" variant="outline" onClick={() => checkOut(r.id)}>Check Out</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
