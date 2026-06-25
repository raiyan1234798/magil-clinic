export function calculateBillAmounts(
  items: { quantity: number; unitPrice: number }[],
  discountPercent = 0,
  gstEnabled = false,
  gstRate = 0,
) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxable = subtotal - discountAmount;
  const gstAmount = gstEnabled ? taxable * (gstRate / 100) : 0;
  const total = taxable + gstAmount;
  return { subtotal, discountPercent, discountAmount, gstAmount, total };
}
