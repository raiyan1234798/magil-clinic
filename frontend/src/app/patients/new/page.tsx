"use client";

import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LabeledSelect } from "@/components/LabeledSelect";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

const BLOOD_GROUPS = ["a+", "a-", "b+", "b-", "ab+", "ab-", "o+", "o-"] as const;

type PatientSummary = {
  id: string;
  patientId: string;
  name: string;
  phoneNumber: string;
};

type CheckResponse = { exists: boolean; patient?: PatientSummary };

export default function NewPatient() {
  const [isLoading, setIsLoading] = useState(false);
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientSummary[]>([]);
  const [duplicatePatient, setDuplicatePatient] = useState<PatientSummary | null>(null);
  const [pendingFormData, setPendingFormData] = useState<Record<string, string> | null>(null);
  const router = useRouter();

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const results = await apiFetch<PatientSummary[]>(`/api/patients?search=${encodeURIComponent(q)}`);
      setSearchResults(results);
      if (results.length === 1) {
        toast.info(`Found ${results[0].name} — opening profile`);
        router.push(`/patients/${results[0].id}`);
      } else if (results.length === 0) {
        toast.message("No patient found with that phone or ID");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const registerPatient = async (data: Record<string, string>, forceNew = false) => {
    await apiFetch("/api/patients", {
      method: "POST",
      body: JSON.stringify({ ...data, gender, bloodGroup, forceNew }),
    });
    toast.success("Patient registered successfully!");
    router.push("/patients");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    try {
      const phone = data.phone?.trim();
      if (!phone) {
        toast.error("Phone number is required");
        return;
      }

      const check = await apiFetch<CheckResponse>(`/api/patients/check?phone=${encodeURIComponent(phone)}`);
      if (check.exists && check.patient) {
        setDuplicatePatient(check.patient);
        setPendingFormData(data);
        return;
      }

      await registerPatient(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.data?.patient) {
        setDuplicatePatient(err.data.patient as PatientSummary);
        setPendingFormData(data);
        return;
      }
      toast.error("Failed to register patient");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateExisting = () => {
    if (duplicatePatient) router.push(`/patients/${duplicatePatient.id}/edit`);
  };

  const handleCreateAnyway = async () => {
    if (!pendingFormData) return;
    setIsLoading(true);
    try {
      await registerPatient(pendingFormData, true);
      setDuplicatePatient(null);
      setPendingFormData(null);
    } catch {
      toast.error("Failed to register patient");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex items-center gap-4">
          <Link href="/patients">
            <Button variant="outline" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Register New Patient</h1>
            <p className="text-slate-500 mt-1">
              New patients register once. Returning patients — search to update their record.
            </p>
          </div>
        </header>

        <Card className="shadow-md mb-6">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Already a patient?</CardTitle>
            <CardDescription>Search by phone or patient ID to open an existing record.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
                  placeholder="Search by phone or ID"
                  className="pl-9"
                />
              </div>
              <Button type="button" variant="secondary" onClick={runSearch} disabled={searching || !searchQuery.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
            {searchResults.length > 1 && (
              <ul className="mt-4 space-y-2">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/patients/${p.id}`}
                      className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">
                        {p.patientId} · {p.phoneNumber}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="border-b">
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>All fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" name="fullName" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <LabeledSelect
                    value={gender}
                    onValueChange={setGender}
                    items={GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label }))}
                    placeholder="Select Gender"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" name="dob" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input id="age" name="age" type="number" placeholder="30" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="+91 9876543210" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <LabeledSelect
                    value={bloodGroup}
                    onValueChange={setBloodGroup}
                    items={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg.toUpperCase() }))}
                    placeholder="Select Blood Group"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input id="emergencyContact" name="emergencyContact" placeholder="Name - Phone" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <Textarea id="address" name="address" placeholder="123 Main St, City" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicalNotes">Medical Notes</Label>
                <Textarea id="medicalNotes" name="medicalNotes" placeholder="Allergies, chronic conditions..." />
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => router.back()} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !gender} className="gap-2">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Register Patient
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!duplicatePatient} onOpenChange={(open) => !open && setDuplicatePatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patient already exists</DialogTitle>
            <DialogDescription>
              {duplicatePatient && (
                <>
                  Patient already exists: <strong>{duplicatePatient.name}</strong> (ID:{" "}
                  {duplicatePatient.patientId}). Update existing record?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleCreateAnyway} disabled={isLoading}>
              Create Anyway
            </Button>
            <Button type="button" onClick={handleUpdateExisting}>
              Update Existing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
