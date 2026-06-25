import { getUser } from "./auth";
import { clearApiError, setApiError } from "./api-status";

const PRODUCTION_API_URL = "https://magil-clinic-api.tripleseven918.workers.dev";

/** Resolve API URL at call time — never bake localhost into static export builds. */
export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return PRODUCTION_API_URL;
    }
    return "http://localhost:5001";
  }
  return PRODUCTION_API_URL;
}

/** @deprecated Use getApiUrl() for runtime resolution */
export const API_URL = getApiUrl();

export class ApiError extends Error {
  isNetworkError: boolean;
  status?: number;
  data?: Record<string, unknown>;

  constructor(message: string, isNetworkError = false, status?: number, data?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.isNetworkError = isNetworkError;
    this.status = status;
    this.data = data;
  }
}

function networkErrorMessage(): string {
  const url = getApiUrl();
  const isProd = typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (isProd) {
    return `Cannot reach the API at ${url}. The backend may be starting up — try again in a minute.`;
  }
  return `Cannot reach the API at ${url}. Start the backend with: cd backend && npm run dev`;
}

/** Show toast for API errors except network errors (handled by ApiErrorBanner). */
export function showApiError(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.isNetworkError) return;
  const message = err instanceof ApiError ? err.message : fallback;
  if (typeof window !== "undefined") {
    import("sonner").then(({ toast }) => toast.error(message));
  }
}

export function taskQueryParams(extra?: Record<string, string>) {
  const user = getUser();
  const params = new URLSearchParams({
    email: user?.email || "",
    role: user?.role || "",
    ...extra,
  });
  return params.toString();
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch {
    const message = networkErrorMessage();
    setApiError(message);
    throw new ApiError(message, true);
  }

  clearApiError();

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(err.error || `Request failed (${res.status})`, false, res.status, err);
  }
  return res.json();
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  WALK_IN: "bg-orange-100 text-orange-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-orange-100 text-orange-700",
  AVAILABLE: "bg-green-100 text-green-700",
  ON_LEAVE: "bg-red-100 text-red-700",
  BUSY: "bg-orange-100 text-orange-700",
  PROCESSED: "bg-blue-100 text-blue-700",
  SENT: "bg-green-100 text-green-700",
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  HALF_DAY: "bg-amber-100 text-amber-800",
  LATE: "bg-orange-100 text-orange-700",
};

export type WhatsAppTemplate =
  | "APPOINTMENT_SCHEDULED"
  | "NOT_SCHEDULED"
  | "DOCTOR_NOT_PRESENT"
  | "BOOKING_CONFIRMED"
  | "CUSTOM";

export const WHATSAPP_PHONE_TEMPLATES: { template: WhatsAppTemplate; label: string }[] = [
  { template: "APPOINTMENT_SCHEDULED", label: "Appointment Scheduled" },
  { template: "NOT_SCHEDULED", label: "Not Scheduled" },
  { template: "DOCTOR_NOT_PRESENT", label: "Doctor Not Present Today" },
];

export async function sendAppointmentWhatsApp(
  appointmentId: string,
  template: WhatsAppTemplate,
  options?: { message?: string; mode?: "manual" | "api" }
) {
  return apiFetch<WhatsAppSendResult>(`/api/appointments/${appointmentId}/send-whatsapp`, {
    method: "POST",
    body: JSON.stringify({ template, message: options?.message, mode: options?.mode ?? "manual" }),
  });
}

export type WhatsAppSendResult =
  | {
      success: boolean;
      mode: "manual";
      message: string;
      patientName: string;
      waUrl: string;
      reminderId: string;
      template?: WhatsAppTemplate;
    }
  | {
      success: boolean;
      mode: "api";
      sent: boolean;
      message: string;
      template?: WhatsAppTemplate;
    };

export async function markReminderSent(reminderId: string) {
  return apiFetch<{ id: string; status: string }>(`/api/reminders/${reminderId}/mark-sent`, {
    method: "PATCH",
  });
}

export function showWhatsAppOpenedToast(patientName: string, reminderId: string) {
  import("sonner").then(({ toast }) => {
    toast.success(`WhatsApp opened for ${patientName}. Tap Send in WhatsApp to deliver.`, {
      duration: 12000,
      action: {
        label: "Mark as sent",
        onClick: () => {
          markReminderSent(reminderId)
            .then(() => toast.success("Marked as sent in Reminders"))
            .catch(() => toast.error("Could not update reminder status"));
        },
      },
    });
  });
}

export async function openAppointmentWhatsApp(appointmentId: string, template: WhatsAppTemplate) {
  const result = await sendAppointmentWhatsApp(appointmentId, template, { mode: "manual" });
  if (result.mode !== "manual") return result;
  window.open(result.waUrl, "_blank", "noopener,noreferrer");
  showWhatsAppOpenedToast(result.patientName, result.reminderId);
  return result;
}
