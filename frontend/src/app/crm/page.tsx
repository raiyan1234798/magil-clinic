"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CRMRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/patients?tab=followups");
  }, [router]);
  return null;
}
