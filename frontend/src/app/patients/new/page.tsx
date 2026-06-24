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
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export default function NewPatient() {
  const [isLoading, setIsLoading] = useState(false);
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      await apiFetch("/api/patients", {
        method: "POST",
        body: JSON.stringify({ ...data, gender, bloodGroup }),
      });
      toast.success("Patient registered successfully!");
      router.push("/patients");
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
            <Button variant="outline" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Register New Patient</h1>
            <p className="text-slate-500 mt-1">Enter patient details to create a new profile.</p>
          </div>
        </header>

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
                <Button variant="outline" type="button" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading || !gender} className="gap-2">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Register Patient
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
