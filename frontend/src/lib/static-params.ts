const PRODUCTION_API_URL = "https://magil-clinic-api.tripleseven918.workers.dev";

const FALLBACK_PARAMS = [{ id: "preview" }];

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || PRODUCTION_API_URL;
}

export async function generatePatientStaticParams() {
  try {
    const res = await fetch(`${apiBaseUrl()}/api/patients`, { cache: "no-store" });
    if (!res.ok) return FALLBACK_PARAMS;
    const patients = await res.json();
    if (!Array.isArray(patients) || patients.length === 0) return FALLBACK_PARAMS;
    return patients.map((p: { id: string }) => ({ id: p.id }));
  } catch {
    return FALLBACK_PARAMS;
  }
}
