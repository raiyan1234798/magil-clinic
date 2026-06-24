"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { apiFetch, formatCurrency } from "@/lib/api";

const REPORT_TYPES = [
  { key: "patients", label: "Patients" },
  { key: "appointments", label: "Appointments" },
  { key: "doctors", label: "Doctors" },
  { key: "financial", label: "Financial" },
  { key: "inventory", label: "Inventory" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "attendance", label: "Attendance" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("patients");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData(null);
    apiFetch(`/api/reports/${activeTab}`).then(setData).catch(console.error);
  }, [activeTab]);

  return (
    <PageLayout title="Reports" description="Generate and view clinic reports across all modules.">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {REPORT_TYPES.map((r) => (
            <TabsTrigger key={r.key} value={r.key}>{r.label}</TabsTrigger>
          ))}
        </TabsList>

        {REPORT_TYPES.map((r) => (
          <TabsContent key={r.key} value={r.key}>
            <Card>
              <CardContent className="p-6">
                {!data && <p className="text-center text-slate-500 py-8">Loading report...</p>}

                {data && r.key === "patients" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Appointments</TableHead>
                        <TableHead>Consultations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Array.isArray(data) ? data : []).map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.patientId}</TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p._count?.appointments || 0}</TableCell>
                          <TableCell>{p._count?.consultations || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {data && r.key === "appointments" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Array.isArray(data) ? data : []).map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.tokenNumber}</TableCell>
                          <TableCell>{a.patient?.name}</TableCell>
                          <TableCell>{a.doctor?.name || "—"}</TableCell>
                          <TableCell>{a.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {data && r.key === "doctors" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead>Appointments</TableHead>
                        <TableHead>Consultations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Array.isArray(data) ? data : []).map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.name}</TableCell>
                          <TableCell>{d.specialization}</TableCell>
                          <TableCell>{d._count?.appointments || 0}</TableCell>
                          <TableCell>{d._count?.consultations || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {data && r.key === "financial" && (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-green-50 rounded-lg"><p className="text-sm text-green-700">Total Revenue</p><p className="text-xl font-bold">{formatCurrency(data.totalRevenue)}</p></div>
                      <div className="p-4 bg-red-50 rounded-lg"><p className="text-sm text-red-700">Total Expenses</p><p className="text-xl font-bold">{formatCurrency(data.totalExpenses)}</p></div>
                    </div>
                    <p className="text-sm text-slate-500">{data.bills?.length || 0} invoices · {data.expenses?.length || 0} expense records</p>
                  </div>
                )}

                {data && r.key === "inventory" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Min Stock</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Array.isArray(data) ? data : []).map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.name}</TableCell>
                          <TableCell className={m.stock <= m.minStock ? "text-red-600" : ""}>{m.stock}</TableCell>
                          <TableCell>{m.minStock}</TableCell>
                          <TableCell>{formatCurrency(m.price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {data && (r.key === "pharmacy" || r.key === "attendance") && (
                  <p className="text-slate-600">{Array.isArray(data) ? data.length : 0} records found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </PageLayout>
  );
}
