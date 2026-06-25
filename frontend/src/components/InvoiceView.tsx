"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/api";
import { Printer } from "lucide-react";

interface InvoiceViewProps {
  bill: any;
  onClose?: () => void;
}

function billToLabel(bill: any) {
  if (bill.patient?.name) return bill.patient.name;
  if (bill.walkInName) return bill.walkInName;
  if (bill.isAnonymous) return "Walk-in Customer";
  return "Walk-in Customer";
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; color: #0f172a; font-size: 14px; line-height: 1.5; }
  .invoice-header { text-align: center; border-bottom: 2px solid #0f4c81; padding-bottom: 16px; margin-bottom: 24px; }
  .invoice-header h1 { margin: 0 0 4px; font-size: 22px; color: #0f4c81; }
  .invoice-header p { margin: 2px 0; color: #64748b; font-size: 13px; }
  .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .invoice-meta h2 { margin: 0 0 8px; font-size: 16px; }
  .invoice-meta p { margin: 2px 0; color: #475569; }
  .invoice-meta .bill-to { text-align: right; }
  .invoice-meta .bill-to p { word-break: break-word; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 10px 12px; }
  th { background: #f8fafc; text-align: left; font-weight: 600; }
  td.num, th.num { text-align: right; }
  .totals { margin-left: auto; width: 100%; max-width: 280px; }
  .totals .row { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; }
  .totals .row.total { font-weight: 700; font-size: 16px; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 4px; }
  .totals .row.paid { color: #16a34a; }
  .totals .row.discount { color: #e11d48; }
  .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 8px; }
  @media (max-width: 520px) {
    .invoice-meta { grid-template-columns: 1fr; }
    .invoice-meta .bill-to { text-align: left; }
  }
`;

function buildPrintHtml(bill: any) {
  const clinic = bill.clinic || {
    name: "Magil Clinic",
    address: "Magil Clinic Management System",
    phone: "+91 9876543210",
    gstin: "GSTIN-MAGIL-2026",
  };
  const items = bill.items || [];
  const gstEnabled = bill.gstEnabled === true && bill.gstAmount > 0;
  const gstRate = bill.gstRate ?? 0;
  const discountAmount = bill.discountAmount ?? 0;
  const discountPercent = bill.discountPercent ?? 0;

  const itemRows =
    items.length === 0
      ? `<tr><td colspan="4" style="text-align:center;color:#94a3b8">No line items</td></tr>`
      : items
          .map(
            (item: any) => `
        <tr>
          <td>${item.description}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${formatCurrency(item.unitPrice)}</td>
          <td class="num">${formatCurrency(item.total)}</td>
        </tr>`,
          )
          .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${bill.billNumber}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="invoice-header">
    <h1>${clinic.name}</h1>
    <p>${clinic.address}</p>
    <p>Phone: ${clinic.phone} | GSTIN: ${clinic.gstin}</p>
  </div>
  <div class="invoice-meta">
    <div>
      <h2>TAX INVOICE</h2>
      <p><strong>Invoice:</strong> ${bill.billNumber}</p>
      <p><strong>Date:</strong> ${formatDate(bill.createdAt)}</p>
      <p><strong>Type:</strong> ${bill.type}</p>
    </div>
    <div class="bill-to">
      <h2>Bill To</h2>
      <p><strong>${billToLabel(bill)}</strong></p>
      ${bill.patient?.patientId ? `<p>ID: ${bill.patient.patientId}</p>` : ""}
      ${bill.patient?.phoneNumber || bill.walkInPhone ? `<p>${bill.patient?.phoneNumber || bill.walkInPhone}</p>` : ""}
      ${bill.isAnonymous ? `<p style="font-size:12px">Medicine sale — no patient record</p>` : ""}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${formatCurrency(bill.subtotal)}</span></div>
    ${
      discountAmount > 0
        ? `<div class="row discount"><span>Discount (${discountPercent}%)</span><span>-${formatCurrency(discountAmount)}</span></div>`
        : ""
    }
    ${
      gstEnabled
        ? `<div class="row"><span>GST (${gstRate}%)</span><span>${formatCurrency(bill.gstAmount)}</span></div>`
        : `<div class="row"><span>GST</span><span>Not applicable</span></div>`
    }
    <div class="row total"><span>Total</span><span>${formatCurrency(bill.total)}</span></div>
    <div class="row paid"><span>Paid</span><span>${formatCurrency(bill.paidAmount)}</span></div>
    <div class="row"><span>Payment</span><span>${bill.paymentMethod || "—"}</span></div>
    <div class="row"><span>Status</span><span><strong>${bill.paymentStatus}</strong></span></div>
  </div>
  <p class="footer">Thank you for choosing ${clinic.name}. Get well soon!</p>
</body>
</html>`;
}

export function InvoiceView({ bill, onClose }: InvoiceViewProps) {
  const clinic = bill.clinic || {
    name: "Magil Clinic",
    address: "Magil Clinic Management System",
    phone: "+91 9876543210",
    gstin: "GSTIN-MAGIL-2026",
  };
  const items = bill.items || [];
  const gstEnabled = bill.gstEnabled === true && bill.gstAmount > 0;
  const gstRate = bill.gstRate ?? 0;
  const discountAmount = bill.discountAmount ?? 0;
  const discountPercent = bill.discountPercent ?? 0;

  const handlePrint = () => {
    const html = buildPrintHtml(bill);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.print();
      }
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div id="invoice-print-area" className="invoice-print min-w-0 space-y-6">
        <header className="border-b-2 border-primary/80 pb-4 text-center">
          <h2 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">{clinic.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{clinic.address}</p>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Phone: {clinic.phone} · GSTIN: {clinic.gstin}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold tracking-wide text-foreground">TAX INVOICE</p>
            <p className="text-sm text-muted-foreground">
              Invoice: <span className="font-medium text-foreground">{bill.billNumber}</span>
            </p>
            <p className="text-sm text-muted-foreground">Date: {formatDate(bill.createdAt)}</p>
            <p className="text-sm text-muted-foreground">Type: {bill.type}</p>
          </div>
          <div className="min-w-0 space-y-1 sm:text-right">
            <p className="text-sm font-semibold text-foreground">Bill To</p>
            <p className="break-words text-sm font-medium text-foreground">{billToLabel(bill)}</p>
            {bill.patient?.patientId && (
              <p className="break-all text-sm text-muted-foreground">ID: {bill.patient.patientId}</p>
            )}
            {(bill.patient?.phoneNumber || bill.walkInPhone) && (
              <p className="break-all text-sm text-muted-foreground">
                {bill.patient?.phoneNumber || bill.walkInPhone}
              </p>
            )}
            {bill.isAnonymous && (
              <p className="text-xs text-muted-foreground">Medicine sale — no patient record</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/60">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-3 text-left font-medium">Description</th>
                <th className="w-14 p-3 text-right font-medium sm:w-16">Qty</th>
                <th className="w-20 p-3 text-right font-medium sm:w-24">Rate</th>
                <th className="w-20 p-3 text-right font-medium sm:w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    No line items
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="border-b border-border/40 last:border-0">
                    <td className="break-words p-3">{item.description}</td>
                    <td className="p-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-3 text-right font-medium tabular-nums">{formatCurrency(item.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-stretch sm:justify-end">
          <div className="w-full min-w-0 max-w-xs space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="shrink-0 tabular-nums">{formatCurrency(bill.subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between gap-4 text-rose-600">
                <span>Discount ({discountPercent}%)</span>
                <span className="shrink-0 tabular-nums">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {gstEnabled ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">GST ({gstRate}%)</span>
                <span className="shrink-0 tabular-nums">{formatCurrency(bill.gstAmount)}</span>
              </div>
            ) : (
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>GST</span>
                <span className="shrink-0">Not applicable</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-border/60 pt-2 text-base font-bold">
              <span>Total</span>
              <span className="shrink-0 tabular-nums text-primary">{formatCurrency(bill.total)}</span>
            </div>
            <div className="flex justify-between gap-4 text-green-600">
              <span>Paid</span>
              <span className="shrink-0 tabular-nums">{formatCurrency(bill.paidAmount)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment</span>
              <span className="shrink-0">{bill.paymentMethod || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span className="shrink-0 font-medium">{bill.paymentStatus}</span>
            </div>
          </div>
        </div>

        <p className="border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
          Thank you for choosing {clinic.name}. Get well soon!
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/40 pt-4 sm:flex-row print:hidden">
        <Button onClick={handlePrint} className="w-full gap-2 sm:w-auto">
          <Printer className="h-4 w-4" />
          Print Invoice
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
