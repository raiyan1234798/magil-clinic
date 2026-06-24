"use client";

import { PageLayout } from "@/components/PageLayout";
import { PageCard, PageCardHeader } from "@/components/PageCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Clock, Plug, Zap, Shield, MessageSquare, Mail, FileText, Printer, Calendar,
  Bell, Pill, Receipt, Package, Users, Wallet
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

const INTEGRATION_ICONS: Record<string, LucideIcon> = {
  whatsapp: MessageSquare,
  sms: MessageSquare,
  email: Mail,
  pdfReports: FileText,
  printer: Printer,
  googleCalendar: Calendar,
};

const AUTOMATION_ICONS: Record<string, LucideIcon> = {
  appointmentReminders: Bell,
  followUpReminders: Users,
  medicineReminders: Pill,
  invoiceGeneration: Receipt,
  stockAlerts: Package,
  attendanceTracking: Clock,
  payrollProcessing: Wallet,
};

function ToggleCard({ label, description, icon: Icon, enabled, onChange }: {
  label: string;
  description?: string;
  icon: LucideIcon;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200",
        enabled
          ? "border-primary/30 bg-primary/5 shadow-sm"
          : "border-border/60 bg-card hover:border-border hover:shadow-card"
      )}
    >
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
        enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div
        role="switch"
        aria-checked={enabled}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors",
          enabled ? "bg-primary" : "bg-muted"
        )}
      >
        <span className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
          enabled ? "translate-x-5" : "translate-x-0"
        )} />
      </div>
    </button>
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
    <PageLayout title="Settings" description="Control panel for clinic configuration and preferences.">
      <form onSubmit={handleSave} className="max-w-5xl space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <PageCard>
            <PageCardHeader title="Clinic Branding" description="Name, colors, and typography" />
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic Name</Label>
                <Input id="clinicName" value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input id="primaryColor" type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-10 w-12 p-1" />
                    <Input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input id="secondaryColor" type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} className="h-10 w-12 p-1" />
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
            </div>
          </PageCard>

          <PageCard>
            <PageCardHeader title="Consulting Hours" description="Appointment slot configuration" />
            <div className="space-y-4 text-sm">
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
              <p className="text-xs text-muted-foreground">
                {form.consultHoursLabel || `${form.consultStartHour}:00 – ${form.consultEndHour}:00`} · up to {form.maxTokens ?? "—"} tokens/day
              </p>
            </div>
          </PageCard>

          <PageCard className="md:col-span-2">
            <PageCardHeader title="Integrations" description="Connect external services" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(INTEGRATION_LABELS).map(([key, label]) => (
                <ToggleCard
                  key={key}
                  label={label}
                  icon={INTEGRATION_ICONS[key] || Plug}
                  enabled={!!form.integrations[key]}
                  onChange={(v) => setForm({ ...form, integrations: { ...form.integrations, [key]: v } })}
                />
              ))}
            </div>
          </PageCard>

          <PageCard className="md:col-span-2">
            <PageCardHeader title="Automation" description="Automated workflows and alerts" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(AUTOMATION_LABELS).map(([key, label]) => (
                <ToggleCard
                  key={key}
                  label={label}
                  icon={AUTOMATION_ICONS[key] || Zap}
                  enabled={!!form.automation[key]}
                  onChange={(v) => setForm({ ...form, automation: { ...form.automation, [key]: v } })}
                />
              ))}
            </div>
          </PageCard>

          <PageCard className="md:col-span-2">
            <PageCardHeader title="User Roles" description="Access permissions by role" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              {[
                { role: "Doctor Admin", perms: "Full system access", icon: Shield },
                { role: "Nurse / Receptionist", perms: "Patients, appointments, billing", icon: Users },
                { role: "Pharmacist", perms: "Pharmacy, inventory", icon: Pill },
                { role: "Finance Manager", perms: "Billing, payroll, reports", icon: Wallet },
              ].map((r) => (
                <div key={r.role} className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <r.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{r.role}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.perms}</p>
                  </div>
                </div>
              ))}
            </div>
          </PageCard>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg">{saving ? "Saving…" : "Save Settings"}</Button>
        </div>
      </form>
    </PageLayout>
  );
}
