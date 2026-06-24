"use client";

import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export default function EditPatient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    age: "",
    dob: "",
    phone: "",
    email: "",
    emergencyContact: "",
    address: "",
    medicalNotes: "",
  });

  useEffect(() => {
    if (!id) return;
    apiFetch<any>(`/api/patients/${id}`)
      .then((patient) => {
        setForm({
          fullName: patient.name || "",
          age: String(patient.age ?? ""),
          dob: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "",
          phone: patient.phoneNumber || "",
          email: patient.email || "",
          emergencyContact: patient.emergencyContact || "",
          address: patient.address || "",
          medicalNotes: patient.medicalNotes || "",
        });
        setGender(patient.gender || "");
        setBloodGroup(patient.bloodGroup || "");
      })
      .catch(() => toast.error("Failed to load patient"))
      .finally(() => setLoadingPatient(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    setIsLoading(true);
    try {
      await apiFetch(`/api/patients/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...form, gender, bloodGroup }),
      });
      toast.success("Patient updated successfully!");
      router.push(`/patients/${id}`);
    } catch {
      toast.error("Failed to update patient");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingPatient) {
    return (
      <PageLayout title="Edit Patient" description="Loading patient details…">
        <div className="flex justify-center py-16 text-slate-500">Loading…</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Edit Patient"
      description="Update patient profile and contact information."
      actions={
        <Link href={`/patients/${id}`}>
          <Button variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      <Card className="shadow-md max-w-5xl">
        <CardHeader className="border-b">
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>All fields marked with * are required.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={gender} onValueChange={(v) => setGender(v ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Blood Group</Label>
                <Select value={bloodGroup} onValueChange={(v) => setBloodGroup(v ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Blood Group" /></SelectTrigger>
                  <SelectContent>
                    {["a+", "a-", "b+", "b-", "ab+", "ab-", "o+", "o-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  name="emergencyContact"
                  value={form.emergencyContact}
                  onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Full Address</Label>
              <Textarea
                id="address"
                name="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medicalNotes">Medical Notes</Label>
              <Textarea
                id="medicalNotes"
                name="medicalNotes"
                value={form.medicalNotes}
                onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !gender} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
