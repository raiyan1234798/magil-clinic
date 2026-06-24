"use client";

import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Eye } from "lucide-react";
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
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, or phone..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
            {search && <Button type="button" variant="ghost" onClick={() => { setSearch(""); loadPatients(); }}>Clear</Button>}
          </form>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender / Age</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-bold text-primary text-base">{patient.patientId}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{patient.name}</TableCell>
                    <TableCell className="capitalize">{patient.gender}, {patient.age}y</TableCell>
                    <TableCell>{patient.phoneNumber}</TableCell>
                    <TableCell className="uppercase">{patient.bloodGroup || "—"}</TableCell>
                    <TableCell>{formatDate(patient.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/patients/${patient.id}`}>
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4 text-slate-500" /></Button>
                      </Link>
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
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
