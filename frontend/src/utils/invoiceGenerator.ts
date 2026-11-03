import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {Order} from '@/types/order';

export const generateOrderInvoice = (order: Order) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = [107, 28, 43]; // Burgundy #6B1C2B
  const darkTextColor = [30, 24, 20]; // Espresso
  const grayTextColor = [110, 100, 95]; // Outline
  const lightBg = [249, 247, 243]; // Ivory-50

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(order.shop?.name || order.company?.name || 'CLOTH MARKETPLACE', 15, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PREMIUM APPAREL & FASHION OUTLET', 15, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TAX INVOICE', pageWidth - 15, 14, {align: 'right'});

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`INVOICE #: INV-${order.orderNumber}`, pageWidth - 15, 20, {align: 'right'});

  // 2. Info Cards (Invoice Metadata & Addresses)
  let yPos = 38;

  // Order Info Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'F');
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'S');

  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Order ID:', 20, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(order.orderNumber, 38, yPos + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Order Date:', 85, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(order.createdAt).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}), 105, yPos + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', 140, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${order.paymentMethod} (${order.paymentStatus})`, 168, yPos + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 20, yPos + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(order.status, 38, yPos + 13);

  if (order.trackingNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text('Courier / Track #:', 85, yPos + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(`${order.courierName || 'Standard'} - ${order.trackingNumber}`, 115, yPos + 13);
  }

  yPos += 26;

  // Addresses Side-by-Side
  const colWidth = (pageWidth - 35) / 2;

  // Billed / Shipped To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('SHIPPING & DELIVERY ADDRESS', 15, yPos);
  doc.text('SELLER / OUTLET DETAILS', 15 + colWidth + 5, yPos);

  yPos += 4;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 15 + colWidth, yPos);
  doc.line(15 + colWidth + 5, yPos, pageWidth - 15, yPos);

  yPos += 5;
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFontSize(9);

  // Customer Address
  const addr = order.shippingAddress || {};
  doc.setFont('helvetica', 'bold');
  doc.text(addr.recipient || order.customer?.fullname || 'Customer', 15, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 4.5;
  if (addr.phone || order.customer?.phoneNumber) {
    doc.text(`Phone: +91 ${addr.phone || order.customer?.phoneNumber}`, 15, yPos);
    yPos += 4.5;
  }
  if (addr.address1) {
    doc.text(addr.address1 + (addr.address2 ? `, ${addr.address2}` : ''), 15, yPos);
    yPos += 4.5;
  }
  const cityState = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ');
  if (cityState) {
    doc.text(cityState, 15, yPos);
    yPos += 4.5;
  }
  if (addr.country) {
    doc.text(addr.country, 15, yPos);
  }

  // Seller Info (Right column)
  let rightY = yPos - 18;
  doc.setFont('helvetica', 'bold');
  doc.text(order.shop?.name || order.branch?.name || order.company?.name || 'Central Store', 15 + colWidth + 5, rightY);
  doc.setFont('helvetica', 'normal');
  rightY += 4.5;
  if (order.shop?.address || order.branch?.address) {
    doc.text(order.shop?.address || order.branch?.address || '', 15 + colWidth + 5, rightY);
    rightY += 4.5;
  }
  if (order.shop?.phone || order.branch?.phone) {
    doc.text(`Contact: ${order.shop?.phone || order.branch?.phone}`, 15 + colWidth + 5, rightY);
    rightY += 4.5;
  }
  doc.text('GST Registered Store', 15 + colWidth + 5, rightY);

  yPos = Math.max(yPos + 8, rightY + 8);

  // 3. Products Table using autoTable
  const tableData = (order.items || []).map((item, idx) => {
    const title = item.productName || item.product?.name || 'Product';
    const variantDesc = [
      item.size || item.variant?.size ? `Size: ${item.size || item.variant?.size}` : null,
      item.color || item.variant?.color ? `Color: ${item.color || item.variant?.color}` : null,
      item.variantSku || item.variant?.variantSku ? `SKU: ${item.variantSku || item.variant?.variantSku}` : null,
    ].filter(Boolean).join(' | ');

    return [
      (idx + 1).toString(),
      `${title}\n${variantDesc}`,
      item.quantity.toString(),
      `₹${item.unitPrice.toFixed(2)}`,
      `₹${item.totalPrice.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Item Description & Variant', 'Qty', 'Unit Price', 'Total Amount']],
    body: tableData,
    margin: {left: 15, right: 15},
    theme: 'grid',
    headStyles: {
      fillColor: [107, 28, 43],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    columnStyles: {
      0: {cellWidth: 10, halign: 'center'},
      1: {cellWidth: 'auto'},
      2: {cellWidth: 16, halign: 'center'},
      3: {cellWidth: 26, halign: 'right'},
      4: {cellWidth: 28, halign: 'right'},
    },
    styles: {
      fontSize: 8.5,
      textColor: [30, 24, 20],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [252, 250, 248],
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos + 40;

  // 4. Financial Summary Breakdown Box
  const summaryX = pageWidth - 90;
  let summaryY = finalY + 6;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(summaryX, summaryY, 75, 42, 2, 2, 'F');
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(summaryX, summaryY, 75, 42, 2, 2, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  doc.text('Subtotal:', summaryX + 5, summaryY + 7);
  doc.text(`₹${order.subtotal.toFixed(2)}`, summaryX + 70, summaryY + 7, {align: 'right'});

  if (order.couponDiscount > 0) {
    doc.setTextColor(16, 120, 60);
    doc.text(`Coupon (${order.couponCode || 'Promo'}):`, summaryX + 5, summaryY + 14);
    doc.text(`- ₹${order.couponDiscount.toFixed(2)}`, summaryX + 70, summaryY + 14, {align: 'right'});
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  } else {
    doc.text('Discount:', summaryX + 5, summaryY + 14);
    doc.text('₹0.00', summaryX + 70, summaryY + 14, {align: 'right'});
  }

  doc.text('Shipping Fee:', summaryX + 5, summaryY + 21);
  doc.text(order.shippingFee > 0 ? `₹${order.shippingFee.toFixed(2)}` : 'FREE', summaryX + 70, summaryY + 21, {align: 'right'});

  doc.text('Estimated Taxes (Incl.):', summaryX + 5, summaryY + 28);
  doc.text(`₹${(order.tax || 0).toFixed(2)}`, summaryX + 70, summaryY + 28, {align: 'right'});

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(summaryX + 5, summaryY + 31, summaryX + 70, summaryY + 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Grand Total:', summaryX + 5, summaryY + 38);
  doc.text(`₹${order.totalAmount.toFixed(2)}`, summaryX + 70, summaryY + 38, {align: 'right'});

  // Terms & Conditions (Left side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Terms & Conditions:', 15, summaryY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(grayTextColor[0], grayTextColor[1], grayTextColor[2]);
  doc.text('1. Returns accepted within 7 days of delivery for unworn items with tags.', 15, summaryY + 13);
  doc.text('2. Please retain this invoice as proof of purchase for warranties & returns.', 15, summaryY + 18);
  doc.text('3. This is a computer-generated tax invoice and requires no physical signature.', 15, summaryY + 23);

  // 5. Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setDrawColor(220, 215, 205);
  doc.line(15, footerY - 4, pageWidth - 15, footerY - 4);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(grayTextColor[0], grayTextColor[1], grayTextColor[2]);
  doc.text('Thank you for shopping with us!', pageWidth / 2, footerY, {align: 'center'});

  // Save / Trigger Download
  doc.save(`Invoice_${order.orderNumber}.pdf`);
};

