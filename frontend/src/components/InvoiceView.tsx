"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/api";
import { Printer } from "lucide-react";

interface InvoiceViewProps {
  bill: any;
  onClose?: () => void;
}

export function InvoiceView({ bill, onClose }: InvoiceViewProps) {
  const clinic = bill.clinic || { name: "Magil Clinic", address: "Magil Clinic Management System", phone: "+91 9876543210", gstin: "GSTIN-MAGIL-2026" };
  const items = bill.items || [];
  const gstEnabled = bill.gstEnabled !== false && bill.gstAmount > 0;
  const gstRate = bill.gstRate ?? (bill.subtotal > 0 ? Math.round((bill.gstAmount / bill.subtotal) * 100) : 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-print">
      <div className="text-center border-b-2 border-primary pb-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-primary">{clinic.name}</h2>
        <p className="text-sm text-slate-500">{clinic.address}</p>
        <p className="text-xs sm:text-sm text-slate-500">Phone: {clinic.phone} | GSTIN: {clinic.gstin}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6 text-sm">
        <div>
          <p className="font-semibold text-lg">TAX INVOICE</p>
          <p className="text-slate-600">Invoice: <span className="font-medium text-slate-900">{bill.billNumber}</span></p>
          <p className="text-slate-600">Date: {formatDate(bill.createdAt)}</p>
          <p className="text-slate-600">Type: {bill.type}</p>
        </div>
        <div className="sm:text-right">
          <p className="font-semibold">Bill To:</p>
          <p>{bill.patient?.name || "Walk-in Patient"}</p>
          {bill.patient?.patientId && <p className="text-slate-500">ID: {bill.patient.patientId}</p>}
          {bill.patient?.phoneNumber && <p className="text-slate-500">{bill.patient.phoneNumber}</p>}
        </div>
      </div>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border min-w-[400px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 border-b">Description</th>
              <th className="text-right p-3 border-b">Qty</th>
              <th className="text-right p-3 border-b">Rate</th>
              <th className="text-right p-3 border-b">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-center text-slate-400">No line items</td>
              </tr>
            ) : (
              items.map((item: any) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.description}</td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-3 text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-6">
        <div className="w-full sm:w-64 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(bill.subtotal)}</span></div>
          {gstEnabled ? (
            <div className="flex justify-between"><span>GST ({gstRate}%)</span><span>{formatCurrency(bill.gstAmount)}</span></div>
          ) : (
            <div className="flex justify-between text-muted-foreground"><span>GST</span><span>Not applicable</span></div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{formatCurrency(bill.total)}</span></div>
          <div className="flex justify-between text-green-600"><span>Paid</span><span>{formatCurrency(bill.paidAmount)}</span></div>
          <div className="flex justify-between"><span>Payment</span><span>{bill.paymentMethod || "—"}</span></div>
          <div className="flex justify-between"><span>Status</span><span className="font-medium">{bill.paymentStatus}</span></div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 border-t pt-4">Thank you for choosing {clinic.name}. Get well soon!</p>

      <div className="flex flex-col sm:flex-row gap-2 mt-6 print:hidden">
        <Button onClick={handlePrint} className="gap-2 w-full sm:w-auto"><Printer className="h-4 w-4" /> Print Invoice</Button>
        {onClose && <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>}
      </div>
    </div>
  );
}
