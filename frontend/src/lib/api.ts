export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

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
    return `Cannot reach the API at ${API_URL}. Set NEXT_PUBLIC_API_URL in Cloudflare Pages to your deployed backend URL.`;
  }
  return `Cannot reach the API at ${API_URL}. Start the backend with: cd backend && npm run dev`;
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
    throw new ApiError(networkErrorMessage(), true);
  }
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
};
