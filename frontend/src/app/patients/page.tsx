"use client";

import { PageLayout } from "@/components/PageLayout";
import { ScrollableTable } from "@/components/ScrollableTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, formatDate } from "@/lib/api";

export default function PatientsList() {
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const loadPatients = (q?: string) => {
    const params = q ? `?search=${encodeURIComponent(q)}` : "";
    apiFetch<any[]>(`/api/patients${params}`).then(setPatients).catch(console.error);
  };

  useEffect(() => { loadPatients(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatients(search);
  };

  return (
    <PageLayout
      title="Patients"
      description="Manage patient records and medical history."
      actions={
        <Link href="/patients/new">
          <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Patient</Button>
        </Link>
      }
    >
      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, or phone..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">Search</Button>
              {search && (
                <Button type="button" variant="ghost" onClick={() => { setSearch(""); loadPatients(); }}>
                  Clear
                </Button>
              )}
            </div>
          </form>

          <div className="rounded-md border -mx-1">
            <ScrollableTable>
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-white min-w-[140px]">Name</TableHead>
                    <TableHead className="min-w-[100px]">Patient ID</TableHead>
                    <TableHead className="hidden sm:table-cell">Gender / Age</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Blood Group</TableHead>
                    <TableHead className="hidden lg:table-cell">Registered</TableHead>
                    <TableHead className="text-right sticky right-0 z-10 bg-white min-w-[88px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-semibold text-slate-900 sticky left-0 z-10 bg-white min-w-[140px]">
                        {patient.name}
                      </TableCell>
                      <TableCell className="font-bold text-primary">{patient.patientId}</TableCell>
                      <TableCell className="capitalize hidden sm:table-cell">{patient.gender}, {patient.age}y</TableCell>
                      <TableCell className="whitespace-nowrap">{patient.phoneNumber}</TableCell>
                      <TableCell className="uppercase hidden md:table-cell">{patient.bloodGroup || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell whitespace-nowrap">{formatDate(patient.createdAt)}</TableCell>
                      <TableCell className="text-right sticky right-0 z-10 bg-white">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link href={`/patients/${patient.id}`}>
                            <Button variant="ghost" size="icon" aria-label="View patient">
                              <Eye className="h-4 w-4 text-slate-500" />
                            </Button>
                          </Link>
                          <Link href={`/patients/${patient.id}/edit`}>
                            <Button variant="ghost" size="icon" aria-label="Edit patient">
                              <Pencil className="h-4 w-4 text-slate-500" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {patients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">No patients found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollableTable>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
