"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stethoscope, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function SetupPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clinicName: "Magil Clinic",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const router = useRouter();

  useEffect(() => {
    apiFetch<{ needsSetup: boolean }>("/api/setup/status")
      .then((d) => {
        if (!d.needsSetup) router.replace("/");
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string; user: any }>("/api/setup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setAuth(data.token, data.user);
      toast.success("Clinic setup complete! Welcome to Magil Clinic.");
      router.push("/");
    } catch {
      toast.error("Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F4C81] to-[#1a6bb5] p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Stethoscope className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Magil Clinic</CardTitle>
          <CardDescription>Set up your clinic — no demo data. Create your admin account to begin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Admin Full Name</Label>
              <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required minLength={6} />
            </div>
            <p className="text-xs text-slate-500">Consulting hours: 5:00 PM – 9:00 PM · 15 min per token</p>
            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Clinic & Start"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
