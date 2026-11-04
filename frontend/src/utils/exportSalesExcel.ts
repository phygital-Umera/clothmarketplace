import {salesStateLabel} from '@/components/Bills/BillStatusBadge';
import {Bill} from '@/types/bill';

const MODE_LABEL: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  CREDIT: 'Credit',
};

/** Download sales bills as a real .xlsx file (exceljs loads only when used) */
export const exportSalesExcel = async (bills: Bill[], fileName: string) => {
  const {default: ExcelJS} = await import('exceljs');
  const book = new ExcelJS.Workbook();
  book.creator = 'Cloth Pro';
  const sheet = book.addWorksheet('Sales bills', {
    views: [{state: 'frozen', ySplit: 1}],
  });

  const money = '₹#,##0.00';
  sheet.columns = [
    {header: 'Bill no', key: 'billNumber', width: 20},
    {header: 'Date', key: 'date', width: 12, style: {numFmt: 'dd-mm-yyyy'}},
    {header: 'Time', key: 'time', width: 10},
    {header: 'Shop', key: 'shop', width: 18},
    {header: 'Customer', key: 'customer', width: 22},
    {header: 'Mobile', key: 'mobile', width: 14},
    {header: 'Cashier', key: 'cashier', width: 18},
    {header: 'Subtotal', key: 'subtotal', width: 12, style: {numFmt: money}},
    {header: 'Discount', key: 'discount', width: 12, style: {numFmt: money}},
    {header: 'GST', key: 'tax', width: 12, style: {numFmt: money}},
    {header: 'Net', key: 'net', width: 13, style: {numFmt: money}},
    {header: 'Paid', key: 'paid', width: 13, style: {numFmt: money}},
    {header: 'Credit due', key: 'credit', width: 13, style: {numFmt: money}},
    {header: 'Mode', key: 'mode', width: 10},
    {header: 'Status', key: 'status', width: 13},
  ];
  sheet.getRow(1).font = {bold: true};

  bills.forEach((b) => {
    const date = new Date(b.billDate);
    sheet.addRow({
      billNumber: b.billNumber,
      date,
      time: date.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      shop: b.shop?.name ?? '',
      customer: b.customerName || 'Walk-in',
      mobile: b.customerPhone ?? '',
      cashier: b.createdBy?.fullname ?? '',
      subtotal: b.subtotal,
      discount: b.discount,
      tax: b.taxAmount,
      net: b.totalAmount,
      paid: b.paidAmount ?? 0,
      credit: b.creditAmount ?? 0,
      mode: MODE_LABEL[b.paymentMethod ?? ''] ?? b.paymentMethod,
      status: salesStateLabel(b),
    });
  });

  // Totals of confirmed bills only, matching the page's figures
  const live = bills.filter((b) => b.status === 'CONFIRMED');
  const total = (pick: (b: Bill) => number | undefined) =>
    live.reduce((t, b) => t + (pick(b) ?? 0), 0);
  const totals = sheet.addRow({
    billNumber: `Total (${live.length} confirmed)`,
    subtotal: total((b) => b.subtotal),
    discount: total((b) => b.discount),
    tax: total((b) => b.taxAmount),
    net: total((b) => b.totalAmount),
    paid: total((b) => b.paidAmount),
    credit: total((b) => b.creditAmount),
  });
  totals.font = {bold: true};

  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
