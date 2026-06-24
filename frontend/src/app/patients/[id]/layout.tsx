export async function generateStaticParams() {
  try {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const res = await fetch(`${api}/api/patients`, { cache: "no-store" });
    if (!res.ok) return [];
    const patients = await res.json();
    return patients.map((p: { id: string }) => ({ id: p.id }));
  } catch {
    return [];
  }
}

export default function PatientDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
