import { redirect } from "next/navigation";

// Login temporarily disabled — redirect to dashboard for testing.
export default function LoginPage() {
  redirect("/");
}
