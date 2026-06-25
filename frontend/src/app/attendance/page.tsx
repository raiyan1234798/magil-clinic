"use client";

import { PageLayout } from "@/components/PageLayout";
import { PageCard, PageCardHeader } from "@/components/PageCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, ClipboardCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, formatTime, showApiError } from "@/lib/api";
import { canViewRoles, getUser } from "@/lib/auth";
import { toast } from "sonner";

type AttendanceRow = {
  id: string | null;
  userId: string;
  user: { id: string; name: string; role?: string };
  status: string | null;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
  date: string;
};

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "HALF_DAY", label: "Half Day" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700 border-green-200",
  ABSENT: "bg-red-100 text-red-700 border-red-200",
  HALF_DAY: "bg-amber-100 text-amber-800 border-amber-200",
  LATE: "bg-orange-100 text-orange-700 border-orange-200",
  NOT_MARKED: "bg-slate-100 text-slate-500 border-slate-200",
};

function todayInputValue() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function toTimeInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const showRoles = canViewRoles(getUser());
  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeRow, setActiveRow] = useState<AttendanceRow | null>(null);
  const [form, setForm] = useState({
    status: "PRESENT" as string,
    notes: "",
    checkInTime: "",
    checkOutTime: "",
  });

  const load = useCallback(() => {
    apiFetch<AttendanceRow[]>(`/api/attendance?date=${selectedDate}`)
      .then(setRows)
      .catch((err) => showApiError(err, "Failed to load attendance"));
  }, [selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  const openMarkDialog = (row?: AttendanceRow) => {
    const target = row ?? rows[0] ?? null;
    setActiveRow(target);
    setForm({
      status: target?.status || "PRESENT",
      notes: target?.notes || "",
      checkInTime: toTimeInput(target?.checkIn ?? null),
      checkOutTime: toTimeInput(target?.checkOut ?? null),
    });
    setDialogOpen(true);
  };

  const saveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRow) return;
    setSaving(true);
    try {
      await apiFetch("/api/attendance/mark", {
        method: "POST",
        body: JSON.stringify({
          employeeId: activeRow.userId,
          date: selectedDate,
          status: form.status,
          notes: form.notes || undefined,
          checkInTime: form.status !== "ABSENT" ? form.checkInTime || undefined : undefined,
          checkOutTime: form.status !== "ABSENT" ? form.checkOutTime || undefined : undefined,
        }),
      });
      toast.success(`Attendance saved for ${activeRow.user.name}`);
      setDialogOpen(false);
      load();
    } catch (err) {
      showApiError(err, "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const checkIn = async (userId: string) => {
    try {
      await apiFetch("/api/attendance/checkin", { method: "POST", body: JSON.stringify({ userId }) });
      toast.success("Checked in!");
      load();
    } catch (err) {
      showApiError(err, "Check-in failed");
    }
  };

  const checkOut = async (id: string) => {
    try {
      await apiFetch(`/api/attendance/${id}/checkout`, { method: "POST" });
      toast.success("Checked out!");
      load();
    } catch (err) {
      showApiError(err, "Check-out failed");
    }
  };

  const presentCount = rows.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const absentCount = rows.filter((r) => r.status === "ABSENT").length;
  const halfDayCount = rows.filter((r) => r.status === "HALF_DAY").length;

  const statusLabel = (status: string | null) => {
    if (!status) return "Not Marked";
    return status.replace(/_/g, " ");
  };

  return (
    <PageLayout
      title="Attendance"
      description="Mark daily attendance status for each employee — present, absent, or half day."
      actions={
        <Button className="gap-2" onClick={() => openMarkDialog()} disabled={!rows.length}>
          <ClipboardCheck className="h-4 w-4" />
          Mark Attendance
        </Button>
      }
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Label htmlFor="attendance-date">Attendance Date</Label>
          <Input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <PageCard className="!p-4">
          <p className="text-sm text-muted-foreground">Present</p>
          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
        </PageCard>
        <PageCard className="!p-4">
          <p className="text-sm text-muted-foreground">Absent</p>
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
        </PageCard>
        <PageCard className="!p-4">
          <p className="text-sm text-muted-foreground">Half Day</p>
          <p className="text-2xl font-bold text-amber-600">{halfDayCount}</p>
        </PageCard>
        <PageCard className="!p-4">
          <p className="text-sm text-muted-foreground">Employees</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </PageCard>
      </div>

      <PageCard noPadding className="mb-8">
        <div className="border-b border-border/60 p-4 sm:p-6">
          <PageCardHeader title="Quick Check-in" description="One-tap check-in marks employee as present for today." />
          <div className="flex flex-wrap gap-2">
            {rows.map((row) => (
              <Button key={row.userId} variant="outline" size="sm" onClick={() => checkIn(row.userId)}>
                {row.user.name}
              </Button>
            ))}
          </div>
        </div>
      </PageCard>

      <PageCard noPadding>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                {showRoles && <TableHead>Role</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const badgeKey = row.status || "NOT_MARKED";
                return (
                  <TableRow key={row.userId}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openMarkDialog(row)}
                        className="font-medium text-left text-primary hover:underline"
                      >
                        {row.user.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button type="button" onClick={() => openMarkDialog(row)}>
                        <Badge variant="outline" className={STATUS_BADGE[badgeKey] || STATUS_BADGE.NOT_MARKED}>
                          {statusLabel(row.status)}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>{row.checkIn ? formatTime(row.checkIn) : "—"}</TableCell>
                    <TableCell>{row.checkOut ? formatTime(row.checkOut) : "—"}</TableCell>
                    {showRoles && <TableCell>{row.user.role?.replace(/_/g, " ") || "—"}</TableCell>}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openMarkDialog(row)}>
                          Mark Status
                        </Button>
                        {row.id && !row.checkOut && row.status !== "ABSENT" && (
                          <Button size="sm" variant="secondary" onClick={() => checkOut(row.id!)}>
                            Check Out
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={showRoles ? 6 : 5} className="py-8 text-center text-muted-foreground">
                    No employees found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Mark Attendance
            </DialogTitle>
            <DialogDescription>
              Set daily status for {activeRow?.user.name} on {selectedDate}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveAttendance} className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select
                value={activeRow?.userId || ""}
                onValueChange={(userId) => {
                  const row = rows.find((r) => r.userId === userId);
                  if (row) openMarkDialog(row);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {rows.map((row) => (
                    <SelectItem key={row.userId} value={row.userId}>
                      {row.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={selectedDate} readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "PRESENT" })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.status !== "ABSENT" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Check-in Time</Label>
                  <Input
                    type="time"
                    value={form.checkInTime}
                    onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-out Time</Label>
                  <Input
                    type="time"
                    value={form.checkOutTime}
                    onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="On leave, sick, etc. (optional)"
                rows={2}
              />
            </div>
            <DialogFooter className="px-0 pb-0">
              <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                {saving ? "Saving…" : "Save Attendance"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
