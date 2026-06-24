export const ROLE_LABELS: Record<string, string> = {
  DOCTOR_ADMIN: "Doctor Admin",
  NURSE_RECEPTIONIST: "Nurse / Receptionist",
  PHARMACIST: "Pharmacist",
  FINANCE_MANAGER: "Finance Manager",
};

export const ROLE_MENU: Record<string, string[]> = {
  DOCTOR_ADMIN: ["*"],
  NURSE_RECEPTIONIST: ["/", "/patients", "/appointments", "/consultations", "/billing", "/reminders"],
  PHARMACIST: ["/", "/patients", "/pharmacy", "/inventory"],
  FINANCE_MANAGER: ["/", "/billing", "/payroll", "/reports", "/employees", "/attendance"],
};

export function canAccessMenu(role: string, href: string): boolean {
  const allowed = ROLE_MENU[role] || [];
  if (allowed.includes("*")) return true;
  return allowed.some((p) => href === p || (p !== "/" && href.startsWith(p)));
}

// Default user for testing without login — remove when auth is re-enabled.
export const DEV_MOCK_USER = {
  id: "dev-admin",
  name: "Test Admin",
  email: "admin@test.local",
  role: "DOCTOR_ADMIN",
};

export function getUser() {
  if (typeof window === "undefined") return DEV_MOCK_USER;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : DEV_MOCK_USER;
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setAuth(token: string, user: object) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
