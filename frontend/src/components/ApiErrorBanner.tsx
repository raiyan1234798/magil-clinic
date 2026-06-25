"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { clearApiError, subscribeApiError } from "@/lib/api-status";
import { Button } from "@/components/ui/button";

export function ApiErrorBanner() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeApiError(setError), []);

  if (!error) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">API connection issue</p>
          <p className="mt-0.5 text-amber-900/80 dark:text-amber-100/80">{error}</p>
          <p className="mt-1 text-xs text-amber-800/70 dark:text-amber-100/60">Endpoint: {getApiUrl()}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-amber-900 hover:bg-amber-100 dark:text-amber-100"
          onClick={() => clearApiError()}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
