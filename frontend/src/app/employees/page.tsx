"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, formatCurrency } from "@/lib/api";
import { canViewRoles, getUser, isSuperAdmin, ROLE_LABELS } from "@/lib/auth";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

export default function EmployeesPage() {
  const user = getUser();
  const showRoles = canViewRoles(user);
  const superAdmin = isSuperAdmin(user);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "NURSE_RECEPTIONIST", phone: "", salary: "" });

  const load = () => {
    apiFetch<any[]>("/api/employees").then(setEmployees).catch(() => {});
    apiFetch<any[]>("/api/departments").then(setDepartments).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/employees", { method: "POST", body: JSON.stringify(form) });
      toast.success("Employee created — onboarding tasks added to their board");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create employee");
    }
  };

  const colSpan = showRoles ? 5 : 4;

  return (
    <PageLayout
      title="Employees"
      description={showRoles ? "Manage clinic staff and role assignments." : "Clinic staff directory."}
      actions={
        superAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> Add Employee</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? "NURSE_RECEPTIONIST" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOCTOR_ADMIN">Doctor Admin — Full access</SelectItem>
                      <SelectItem value="NURSE_RECEPTIONIST">Nurse — Appointments & patients</SelectItem>
                      <SelectItem value="PHARMACIST">Pharmacist — Pharmacy & inventory</SelectItem>
                      <SelectItem value="FINANCE_MANAGER">Finance — Billing & payroll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Salary (₹)</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
                <Button type="submit" className="w-full">Create Employee</Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    >
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employees ({employees.length})</TabsTrigger>
          <TabsTrigger value="departments">Departments ({departments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {showRoles && <TableHead>Role</TableHead>}
                    <TableHead>Phone</TableHead>
                    <TableHead>Salary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      {showRoles && (
                        <TableCell><Badge variant="secondary">{ROLE_LABELS[emp.role] || emp.role}</Badge></TableCell>
                      )}
                      <TableCell>{emp.phone || "—"}</TableCell>
                      <TableCell>{emp.salary ? formatCurrency(emp.salary) : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {employees.length === 0 && (
                    <TableRow><TableCell colSpan={colSpan} className="text-center py-8 text-slate-500">No employees yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map((dept) => (
              <Card key={dept.id}>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg">{dept.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{dept.description}</p>
                </CardContent>
              </Card>
            ))}
            {departments.length === 0 && <p className="text-slate-500 col-span-2 text-center py-8">Departments created during clinic setup.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
