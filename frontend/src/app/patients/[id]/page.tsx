import PatientDetailClient from "./PatientDetailClient";
import { generatePatientStaticParams } from "@/lib/static-params";

export async function generateStaticParams() {
  return generatePatientStaticParams();
}

export default function PatientDetailPage() {
  return <PatientDetailClient />;
}
