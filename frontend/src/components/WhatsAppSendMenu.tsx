"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, ChevronDown, Loader2 } from "lucide-react";
import { sendAppointmentWhatsApp, WHATSAPP_PHONE_TEMPLATES, type WhatsAppTemplate } from "@/lib/api";
import { toast } from "sonner";

type WhatsAppSendMenuProps = {
  appointmentId: string;
  appointmentType?: string;
  isWalkIn?: boolean;
  whatsappEnabled?: boolean;
  size?: "sm" | "default";
  variant?: "outline" | "secondary" | "default";
};

export function WhatsAppSendMenu({
  appointmentId,
  appointmentType,
  isWalkIn,
  whatsappEnabled = true,
  size = "sm",
  variant = "outline",
}: WhatsAppSendMenuProps) {
  const [sending, setSending] = useState(false);
  const isPhone = appointmentType === "PHONE" && !isWalkIn;

  const send = async (template: WhatsAppTemplate) => {
    if (!whatsappEnabled) {
      toast.error("Enable WhatsApp in Settings");
      return;
    }

    setSending(true);
    try {
      const result = await sendAppointmentWhatsApp(appointmentId, template);
      const preview =
        result.message.slice(0, 80) + (result.message.length > 80 ? "…" : "");
      if (result.simulated) {
        toast.success("WhatsApp message simulated (demo mode)", { description: preview });
      } else {
        toast.success(result.sent ? "WhatsApp message sent" : "WhatsApp message queued", {
          description: preview,
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send WhatsApp");
    } finally {
      setSending(false);
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
          <Button variant={variant} size={size} className="gap-1" disabled={sending}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
            WhatsApp
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Send WhatsApp</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isPhone ? (
          WHATSAPP_PHONE_TEMPLATES.map((t) => (
            <DropdownMenuItem key={t.template} onClick={() => send(t.template)}>
              {t.label}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem onClick={() => send("BOOKING_CONFIRMED")}>
            Booking Confirmation
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
