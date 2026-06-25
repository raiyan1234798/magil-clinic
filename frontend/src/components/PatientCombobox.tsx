"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type PatientOption = {
  id: string;
  patientId: string;
  name: string;
  phoneNumber: string;
};

type PatientComboboxProps = {
  value: string;
  onChange: (patientId: string, patient?: PatientOption) => void;
  label?: string;
  required?: boolean;
  returnUrl?: string;
  className?: string;
  allowManualEntry?: boolean;
  manualLabel?: string;
  onManualEntry?: () => void;
};

export function PatientCombobox({
  value,
  onChange,
  label = "Patient",
  required,
  returnUrl,
  className,
  allowManualEntry = true,
  manualLabel = "Enter patient details manually",
  onManualEntry,
}: PatientComboboxProps) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = patients.find((p) => p.id === value);

  useEffect(() => {
    setLoading(true);
    const params = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : "";
    apiFetch<PatientOption[]>(`/api/patients${params}`)
      .then(setPatients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    if (value && !selected) {
      apiFetch<PatientOption[]>(`/api/patients?search=${encodeURIComponent(value)}`)
        .then((list) => {
          const match = list.find((p) => p.id === value);
          if (match) setPatients((prev) => (prev.some((p) => p.id === match.id) ? prev : [match, ...prev]));
        })
        .catch(() => {});
    }
  }, [value, selected]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return patients.slice(0, 20);
    const q = query.toLowerCase();
    return patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q) ||
          p.phoneNumber.includes(q)
      )
      .slice(0, 20);
  }, [patients, query]);

  const newPatientHref = returnUrl
    ? `/patients/new?return=${encodeURIComponent(returnUrl)}`
    : "/patients/new";

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      <Label>
        {label}
        {required && " *"}
      </Label>
      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {selected.patientId} · {selected.phoneNumber}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            aria-label="Clear patient"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search by name, phone, or patient ID…"
            className="pl-9"
            required={required}
          />
          {open && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-lg ring-1 ring-foreground/10">
              {loading && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
              {!loading && filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No patients found</p>
              )}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full flex-col rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onChange(p.id, p);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.patientId} · {p.phoneNumber}
                  </span>
                </button>
              ))}
              <div className="border-t mt-1 pt-1">
                <Link
                  href={newPatientHref}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  <UserPlus className="h-4 w-4" />
                  Add new patient
                </Link>
                {allowManualEntry && onManualEntry && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                    onClick={() => {
                      onManualEntry();
                      setOpen(false);
                    }}
                  >
                    {manualLabel}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
