"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, ChevronDown, Loader2, ExternalLink, Zap } from "lucide-react";
import {
  apiFetch,
  openAppointmentWhatsApp,
  sendAppointmentWhatsApp,
  WHATSAPP_PHONE_TEMPLATES,
  type WhatsAppTemplate,
} from "@/lib/api";
import { toast } from "sonner";

type WhatsAppSendMenuProps = {
  appointmentId: string;
  appointmentType?: string;
  isWalkIn?: boolean;
  whatsappEnabled?: boolean;
  size?: "sm" | "default";
  variant?: "outline" | "secondary" | "default";
};

const BOOKING_TEMPLATE: { template: WhatsAppTemplate; label: string } = {
  template: "BOOKING_CONFIRMED",
  label: "Booking Confirmation",
};

export function WhatsAppSendMenu({
  appointmentId,
  appointmentType,
  isWalkIn,
  whatsappEnabled = true,
  size = "sm",
  variant = "outline",
}: WhatsAppSendMenuProps) {
  const [busy, setBusy] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const isPhone = appointmentType === "PHONE" && !isWalkIn;
  const templates = isPhone ? WHATSAPP_PHONE_TEMPLATES : [BOOKING_TEMPLATE];

  useEffect(() => {
    apiFetch<{ whatsappApiConfigured?: boolean }>("/api/settings")
      .then((s) => setApiConfigured(!!s.whatsappApiConfigured))
      .catch(() => {});
  }, []);

  const openWhatsApp = async (template: WhatsAppTemplate) => {
    if (!whatsappEnabled) {
      toast.error("Enable WhatsApp in Settings");
      return;
    }

    setBusy(true);
    try {
      await openAppointmentWhatsApp(appointmentId, template);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to open WhatsApp");
    } finally {
      setBusy(false);
    }
  };

  const sendViaApi = async (template: WhatsAppTemplate) => {
    if (!whatsappEnabled) {
      toast.error("Enable WhatsApp in Settings");
      return;
    }

    setBusy(true);
    try {
      const result = await sendAppointmentWhatsApp(appointmentId, template, { mode: "api" });
      if (result.mode === "api") {
        const preview =
          result.message.slice(0, 80) + (result.message.length > 80 ? "…" : "");
        toast.success(result.sent ? "WhatsApp message sent automatically" : "WhatsApp message queued", {
          description: preview,
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send WhatsApp");
    } finally {
      setBusy(false);
    }
  };

  if (!whatsappEnabled) {
    return (
      <Button
        variant={variant}
        size={size}
        className="gap-1 opacity-60"
        onClick={() => toast.error("Enable WhatsApp in Settings")}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        WhatsApp
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant={variant} size={size} className="gap-1" disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
            WhatsApp
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Open in WhatsApp
          </DropdownMenuLabel>
          {templates.map((t) => (
            <DropdownMenuItem key={t.template} onClick={() => openWhatsApp(t.template)}>
              {t.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {apiConfigured && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Send automatically (API)
              </DropdownMenuLabel>
              {templates.map((t) => (
                <DropdownMenuItem key={`api-${t.template}`} onClick={() => sendViaApi(t.template)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
