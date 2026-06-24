import { getUser } from "./auth";
import { clearApiError, setApiError } from "./api-status";

const PRODUCTION_API_URL = "https://magil-clinic-api.onrender.com";

function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
    return PRODUCTION_API_URL;
  }
  return "http://localhost:5001";
}

export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  isNetworkError: boolean;

  constructor(message: string, isNetworkError = false) {
    super(message);
    this.name = "ApiError";
    this.isNetworkError = isNetworkError;
  }
}

function networkErrorMessage(): string {
  const isProd = typeof window !== "undefined" && !window.location.hostname.includes("localhost");
  if (isProd) {
    return `Cannot reach the API at ${API_URL}. The backend may be starting up — try again in a minute.`;
  }
  return `Cannot reach the API at ${API_URL}. Start the backend with: cd backend && npm run dev`;
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
    res = await fetch(`${API_URL}${path}`, {
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
    throw new ApiError(err.error || `Request failed (${res.status})`);
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
};
