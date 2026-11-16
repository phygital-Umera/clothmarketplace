import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {getOrderInvoiceData} from '@/lib/api/order';
import {OrderInvoice} from '@/types/order';

// The built-in PDF font has no ₹ sign
const money = (v: number) =>
  `Rs. ${v.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const date = (v: string) =>
  new Date(v).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});

/**
 * A4 GST tax invoice of an online order, printed exactly as the server worked
 * it out (P4-07): one invoice number shared with the store, the shop's GSTIN,
 * HSN and rate per line, and CGST + SGST or IGST by place of supply.
 */
export const orderInvoicePdf = (inv: OrderInvoice) => {
  const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
  const pageWidth = doc.internal.pageSize.getWidth();
  const brand: [number, number, number] = [107, 28, 43];
  const ink: [number, number, number] = [30, 24, 20];
  const soft: [number, number, number] = [110, 100, 95];
  const gst = inv.taxBreakup;

  // Header: the seller (the shop) and the invoice number
  doc.setFillColor(...brand);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(inv.seller.name ?? 'Seller', 15, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (inv.seller.gstin) doc.text(`GSTIN: ${inv.seller.gstin}`, 15, 19);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TAX INVOICE', pageWidth - 15, 13, {align: 'right'});
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice no. ${inv.invoiceNumber}`, pageWidth - 15, 19, {align: 'right'});

  // Seller and buyer
  let y = 36;
  const colWidth = (pageWidth - 35) / 2;
  const right = 15 + colWidth + 5;
  doc.setTextColor(...brand);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('SOLD BY', 15, y);
  doc.text('BILL & SHIP TO', right, y);
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const block = (x: number, startY: number, rows: (string | null | undefined)[]) => {
    let yy = startY;
    for (const r of rows.filter(Boolean) as string[]) {
      doc.text(doc.splitTextToSize(r, colWidth), x, yy);
      yy += 4.5;
    }
    return yy;
  };
  const s = inv.seller;
  const b = inv.buyer;
  const leftEnd = block(15, y + 5, [
    s.name,
    s.address,
    [s.city, s.state, s.postalCode].filter(Boolean).join(', '),
    s.phone ? `Phone: ${s.phone}` : null,
    s.gstin ? `GSTIN: ${s.gstin}` : 'GSTIN: not registered',
    s.stateCode ? `State code: ${s.stateCode}` : null,
  ]);
  const rightEnd = block(right, y + 5, [
    b.name,
    [b.address1, b.address2].filter(Boolean).join(', '),
    [b.city, b.state, b.postalCode].filter(Boolean).join(', '),
    b.phone ? `Phone: +91 ${b.phone}` : null,
    gst.placeOfSupply.code
      ? `Place of supply: ${gst.placeOfSupply.name ?? ''} (${gst.placeOfSupply.code})`
      : null,
  ]);
  y = Math.max(leftEnd, rightEnd) + 2;

  doc.setTextColor(...soft);
  doc.text(
    `Invoice date ${date(inv.invoiceDate)} · Order ${inv.orderNumber} of ${date(inv.orderDate)} · ${inv.paymentMethod === 'COD' ? 'Cash on delivery' : 'Paid online'}`,
    15,
    y,
  );
  y += 5;

  // Lines: HSN, rate, taxable value and GST of each
  autoTable(doc, {
    startY: y,
    head: [['#', 'Item', 'HSN', 'Qty', 'Taxable', 'GST', 'Amount']],
    body: inv.lines.map((l, i) => [
      String(i + 1),
      `${l.name ?? 'Item'}${[l.size, l.color].filter(Boolean).length ? `\n${[l.size, l.color].filter(Boolean).join(' / ')}` : ''}`,
      l.hsnCode ?? '-',
      String(l.quantity),
      money(l.taxable),
      `${money(l.tax)}\n${l.taxRate}%`,
      money(l.totalPrice),
    ]),
    margin: {left: 15, right: 15},
    theme: 'grid',
    headStyles: {fillColor: brand, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5},
    columnStyles: {
      0: {cellWidth: 8, halign: 'center'},
      2: {cellWidth: 18},
      3: {cellWidth: 12, halign: 'center'},
      4: {cellWidth: 26, halign: 'right'},
      5: {cellWidth: 24, halign: 'right'},
      6: {cellWidth: 26, halign: 'right'},
    },
    styles: {fontSize: 8, textColor: ink, cellPadding: 2.5},
  });
  y = ((doc as any).lastAutoTable?.finalY ?? y + 30) + 4;

  // GST per rate
  autoTable(doc, {
    startY: y,
    head: [
      gst.interState
        ? ['GST rate', 'Taxable', 'IGST']
        : ['GST rate', 'Taxable', 'CGST', 'SGST'],
    ],
    body: gst.rows.map((r) =>
      gst.interState
        ? [`${r.rate}%`, money(r.taxable), money(r.igst)]
        : [`${r.rate}%`, money(r.taxable), money(r.cgst), money(r.sgst)],
    ),
    margin: {left: 15, right: pageWidth / 2},
    theme: 'plain',
    headStyles: {fontStyle: 'bold', fontSize: 8, textColor: brand},
    styles: {fontSize: 8, textColor: ink, cellPadding: 1.5, halign: 'right'},
    columnStyles: {0: {halign: 'left'}},
  });

  // Totals
  const x = pageWidth - 85;
  let ty = y + 4;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 8.5);
    doc.text(label, x, ty);
    doc.text(value, pageWidth - 15, ty, {align: 'right'});
    ty += bold ? 7 : 5;
  };
  doc.setTextColor(...ink);
  row('Taxable value', money(gst.taxable));
  if (gst.interState) row('IGST', money(gst.igst));
  else {
    row('CGST', money(gst.cgst));
    row('SGST', money(gst.sgst));
  }
  if (inv.couponDiscount > 0) {
    doc.setTextColor(...soft);
    doc.setFontSize(7.5);
    doc.text(
      `Coupon ${inv.couponCode ?? ''} (${money(inv.couponDiscount)}) already taken off each line`,
      x,
      ty,
    );
    ty += 5;
    doc.setTextColor(...ink);
  }
  row('Delivery', inv.shippingFee > 0 ? money(inv.shippingFee) : 'Free');
  doc.setDrawColor(...brand);
  doc.line(x, ty - 3, pageWidth - 15, ty - 3);
  doc.setTextColor(...brand);
  row('Total', money(inv.totalAmount), true);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(220, 215, 205);
  doc.line(15, footerY - 4, pageWidth - 15, footerY - 4);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...soft);
  doc.text(
    'Computer-generated tax invoice; no signature needed. Prices include GST.',
    pageWidth / 2,
    footerY,
    {align: 'center'},
  );

  doc.save(`Invoice_${inv.invoiceNumber.replace(/\//g, '-')}.pdf`);
};

/** Fetch the order's invoice from the panel's API and download it as a PDF */
export const downloadOrderInvoice = async (panel: string, orderId: string) => {
  const res = await getOrderInvoiceData(panel, orderId);
  orderInvoicePdf(res.data);
};
