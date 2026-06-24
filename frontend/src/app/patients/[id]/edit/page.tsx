import PatientEditClient from "./PatientEditClient";
import { generatePatientStaticParams } from "@/lib/static-params";

export async function generateStaticParams() {
  return generatePatientStaticParams();
}

export default function PatientEditPage() {
  return <PatientEditClient />;
}
