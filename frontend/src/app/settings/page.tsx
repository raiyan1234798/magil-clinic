"use client";

import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <PageLayout title="Settings" description="Clinic configuration and system preferences.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <Card>
          <CardHeader><CardTitle>Clinic Branding</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Clinic Name</span><span className="font-medium">Magil Clinic</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Primary Color</span><span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-[#0F4C81]" /> #0F4C81</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Secondary Color</span><span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-[#4CAF50]" /> #4CAF50</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Font</span><span className="font-medium">Inter</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {["WhatsApp Notifications", "SMS Gateway", "Email", "PDF Reports", "Printer Support", "Google Calendar"].map((item) => (
              <div key={item} className="flex justify-between items-center">
                <span>{item}</span>
                <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded">Enabled</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Automation</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {["Appointment Reminders", "Follow-up Reminders", "Medicine Reminders", "Invoice Generation", "Stock Alerts", "Attendance Tracking", "Payroll Processing"].map((item) => (
              <div key={item} className="flex justify-between items-center">
                <span>{item}</span>
                <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded">Active</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>User Roles</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { role: "Doctor Admin", perms: "Full system access" },
              { role: "Nurse / Receptionist", perms: "Patients, appointments, billing" },
              { role: "Pharmacist", perms: "Pharmacy, inventory" },
              { role: "Finance Manager", perms: "Finance, payroll, reports" },
            ].map((r) => (
              <div key={r.role}>
                <p className="font-medium">{r.role}</p>
                <p className="text-slate-500 text-xs">{r.perms}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
