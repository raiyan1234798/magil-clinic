"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { toast } from "sonner";

type SettingsForm = {
  clinicName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  consultStartHour: number;
  consultEndHour: number;
  slotMinutes: number;
  integrations: Record<string, boolean>;
  automation: Record<string, boolean>;
  consultHoursLabel?: string;
  maxTokens?: number;
};

const INTEGRATION_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp Notifications",
  sms: "SMS Gateway",
  email: "Email",
  pdfReports: "PDF Reports",
  printer: "Printer Support",
  googleCalendar: "Google Calendar",
};

const AUTOMATION_LABELS: Record<string, string> = {
  appointmentReminders: "Appointment Reminders",
  followUpReminders: "Follow-up Reminders",
  medicineReminders: "Medicine Reminders",
  invoiceGeneration: "Invoice Generation",
  stockAlerts: "Stock Alerts",
  attendanceTracking: "Attendance Tracking",
  payrollProcessing: "Payroll Processing",
};

const FONT_OPTIONS = ["Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Nunito"];

function ToggleRow({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${enabled ? "bg-green-500" : "bg-slate-200"}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<SettingsForm>("/api/settings")
      .then(setForm)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const updated = await apiFetch<SettingsForm>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setForm(updated);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Settings" description="Clinic configuration and system preferences.">
        <p className="text-slate-500 text-sm">Loading settings…</p>
      </PageLayout>
    );
  }

  if (!form) {
    return (
      <PageLayout title="Settings" description="Clinic configuration and system preferences.">
        <p className="text-red-600 text-sm">Unable to load settings. Check that the backend API is running.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Settings" description="Clinic configuration and system preferences.">
      <form onSubmit={handleSave} className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Clinic Branding</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic Name</Label>
                <Input id="clinicName" value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input id="primaryColor" type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="w-12 h-10 p-1" />
                    <Input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input id="secondaryColor" type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} className="w-12 h-10 p-1" />
                    <Input value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Font</Label>
                <Select value={form.fontFamily} onValueChange={(v) => setForm({ ...form, fontFamily: v ?? "Inter" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Consulting Hours</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consultStartHour">Start Hour (24h)</Label>
                  <Input id="consultStartHour" type="number" min={0} max={23} value={form.consultStartHour} onChange={(e) => setForm({ ...form, consultStartHour: parseInt(e.target.value) || 17 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultEndHour">End Hour (24h)</Label>
                  <Input id="consultEndHour" type="number" min={1} max={24} value={form.consultEndHour} onChange={(e) => setForm({ ...form, consultEndHour: parseInt(e.target.value) || 21 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slotMinutes">Slot Duration (minutes)</Label>
                <Input id="slotMinutes" type="number" min={5} max={60} step={5} value={form.slotMinutes} onChange={(e) => setForm({ ...form, slotMinutes: parseInt(e.target.value) || 15 })} />
              </div>
              <p className="text-xs text-slate-500">
                {form.consultHoursLabel || `${form.consultStartHour}:00 – ${form.consultEndHour}:00`} · up to {form.maxTokens ?? "—"} tokens/day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {Object.entries(INTEGRATION_LABELS).map(([key, label]) => (
                <ToggleRow
                  key={key}
                  label={label}
                  enabled={!!form.integrations[key]}
                  onChange={(v) => setForm({ ...form, integrations: { ...form.integrations, [key]: v } })}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Automation</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {Object.entries(AUTOMATION_LABELS).map(([key, label]) => (
                <ToggleRow
                  key={key}
                  label={label}
                  enabled={!!form.automation[key]}
                  onChange={(v) => setForm({ ...form, automation: { ...form.automation, [key]: v } })}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>User Roles</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { role: "Doctor Admin", perms: "Full system access" },
                { role: "Nurse / Receptionist", perms: "Patients, appointments, billing" },
                { role: "Pharmacist", perms: "Pharmacy, inventory" },
                { role: "Finance Manager", perms: "Finance, payroll, reports" },
              ].map((r) => (
                <div key={r.role} className="rounded-lg border p-3">
                  <p className="font-medium">{r.role}</p>
                  <p className="text-slate-500 text-xs mt-1">{r.perms}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button>
        </div>
      </form>
    </PageLayout>
  );
}
