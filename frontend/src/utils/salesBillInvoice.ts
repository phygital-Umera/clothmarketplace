import {GstRow, TaxBreakup} from '@/types/bill';
import {inr} from './money';

export interface PrintableSalesBill {
  /** GST per rate, CGST/SGST or IGST, and place of supply, as the server worked them out */
  taxBreakup?: TaxBreakup | null;
  billNumber: string;
  billDate: string | Date;
  billType?: 'TAX_INVOICE_B2C' | 'TAX_INVOICE_B2B' | 'RETAIL_INVOICE' | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerGstin?: string | null;
  shop?: {
    name: string;
    address?: string | null;
    phone?: string | null;
    gstin?: string | null;
  } | null;
  salesman?: {fullname: string} | null;
  createdBy?: {fullname: string} | null;
  items: Array<{
    productName?: string | null;
    variantSku?: string | null;
    size?: string | null;
    color?: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    hsnCode?: string | null;
    totalPrice: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discount: number;
  roundOff?: number;
  totalAmount: number;
  pricesIncludeTax?: boolean;
  amountPaid?: number;
  balanceDue?: number;
  payments?: Array<{mode: string; amount: number; reference?: string | null}>;
  notes?: string | null;
}

const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[
        c
      ]!,
  );

const MODE_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  CREDIT: 'Credit',
};

/** Self-contained 80mm receipt HTML; every bill value is escaped */
export function salesBillHtml(
  bill: PrintableSalesBill,
  opts: {estimate?: boolean} = {},
): string {
  const estimate = !!opts.estimate;
  const shop = bill.shop;
  const shopGstin = shop?.gstin?.trim().toUpperCase() || '';
  const custGstin = bill.customerGstin?.trim().toUpperCase() || '';
  const b2b = bill.billType === 'TAX_INVOICE_B2B';
  // The server decides CGST + SGST or IGST by state code (P4-03)
  const breakup = bill.taxBreakup;
  const interState = !!breakup?.interState;
  const place = breakup?.placeOfSupply;
  // Bills saved before billType existed: a shop without a GSTIN cannot issue a tax invoice
  const title = estimate
    ? 'ESTIMATE / QUOTATION'
    : bill.billType === 'RETAIL_INVOICE' || (!bill.billType && !shopGstin)
      ? 'RETAIL INVOICE'
      : 'TAX INVOICE';
  const inclusive = bill.pricesIncludeTax !== false;

  const div = (text: unknown, cls = '') =>
    `<div class="${cls}">${esc(text)}</div>`;
  const row = (left: unknown, right: unknown, cls = '') =>
    `<div class="row ${cls}"><span>${esc(left)}</span><span>${esc(right)}</span></div>`;
  const when = (cond: unknown, html: () => string) => (cond ? html() : '');

  const date = new Date(bill.billDate).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const items = bill.items
    .map((i) => {
      const variant = [i.size, i.color, i.hsnCode ? `HSN ${i.hsnCode}` : '']
        .filter(Boolean)
        .join(' / ');
      const qtyRate = `${i.quantity} x ${inr(i.unitPrice)}${i.discount > 0 ? ` less ${inr(i.discount)}` : ''}`;
      return `<div class="item">${div(i.productName || i.variantSku || 'Item', 'b')}${when(variant, () => div(variant, 's'))}${row(qtyRate, inr(i.totalPrice))}</div>`;
    })
    .join('');

  const gst = breakup?.rows ?? [];
  const gstTable = when(bill.taxAmount > 0 && gst.length, () => {
    const cell = (r: GstRow, v: number) =>
      `<td>${r.rate ? esc(inr(v)) : '-'}</td>`;
    const head = interState ? '<th>IGST</th>' : '<th>CGST</th><th>SGST</th>';
    const body = gst
      .map(
        (r) =>
          `<tr><td>${esc(r.rate)}%</td><td>${esc(inr(r.taxable))}</td>${
            interState ? cell(r, r.igst) : cell(r, r.cgst) + cell(r, r.sgst)
          }</tr>`,
      )
      .join('');
    return `<hr><table><tr><th>GST</th><th>Taxable</th>${head}</tr>${body}</table>`;
  });

  const payments = (bill.payments ?? [])
    .map((p) =>
      row(
        `${MODE_LABEL[p.mode] ?? p.mode}${p.reference ? ` (ref ${p.reference})` : ''}`,
        inr(p.amount),
      ),
    )
    .join('');

  const staff = bill.salesman?.fullname
    ? `Salesman: ${bill.salesman.fullname}`
    : bill.createdBy?.fullname
      ? `Billed by: ${bill.createdBy.fullname}`
      : '';

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} ${esc(bill.billNumber)}</title><style>
@page { size: 80mm auto; margin: 4mm }
* { box-sizing: border-box }
html, body { margin: 0; padding: 0; background: #fff; color: #000 }
body { width: 72mm; font: 12px/1.35 ui-monospace, Consolas, 'Courier New', monospace }
.c { text-align: center }
.b { font-weight: 700 }
.s { font-size: 11px }
.h { font-size: 15px; font-weight: 700 }
.row { display: flex; justify-content: space-between; gap: 6px }
.row span:last-child { white-space: nowrap; text-align: right }
.item, .row span:first-child { overflow-wrap: anywhere }
.item { margin-bottom: 3px }
.total { font-size: 14px; font-weight: 700; border-top: 1px solid #000; margin-top: 2px; padding-top: 2px }
hr { border: 0; border-top: 1px dashed #000; margin: 4px 0 }
table { width: 100%; border-collapse: collapse; font-size: 11px }
th, td { padding: 0; text-align: right; font-weight: 400 }
th:first-child, td:first-child { text-align: left }
</style></head><body>
<div class="c">
${when(shop?.name, () => div(shop!.name, 'h'))}
${when(shop?.address, () => div(shop!.address, 's'))}
${when(shop?.phone, () => div(`Ph: ${shop!.phone}`, 's'))}
${when(shopGstin, () => div(`GSTIN: ${shopGstin}`, 's'))}
<hr>${div(title, 'b')}
${when(estimate, () => div('Not a tax invoice', 's'))}
</div><hr>
${when(bill.billNumber && bill.billNumber !== 'ESTIMATE', () => row('Bill no.', bill.billNumber))}
${row('Date', date)}
${when(bill.customerName, () => div(`Customer: ${bill.customerName}`))}
${when(bill.customerPhone, () => div(`Phone: ${bill.customerPhone}`))}
${when(b2b && custGstin, () => div(`GSTIN: ${custGstin}`))}
${when(b2b && place?.code, () => div(`Place of supply: ${place!.name ?? place!.code} (${place!.code})`))}
<hr>${items}<hr>
${when(inclusive && bill.discount > 0, () => row('Bill discount (applied)', `âˆ’${inr(bill.discount)}`))}
${row(inclusive ? 'Taxable value' : 'Subtotal', inr(bill.subtotal))}
${when(!inclusive && bill.discount > 0, () => row('Discount', `âˆ’${inr(bill.discount)}`))}
${row('GST', inr(bill.taxAmount))}
${when(bill.roundOff, () => row('Round off', inr(bill.roundOff!)))}
${row(inclusive ? 'TOTAL (incl. GST)' : 'TOTAL', inr(bill.totalAmount), 'total')}
${gstTable}
${when(payments || bill.amountPaid, () => `<hr>${payments || row('Paid', inr(bill.amountPaid!))}`)}
${when((bill.balanceDue ?? 0) > 0, () => row('Balance due', inr(bill.balanceDue!), 'b'))}
<hr>
${when(staff, () => div(staff, 's'))}
${when(bill.notes, () => div(`Note: ${bill.notes}`, 's'))}
${div('Thank you! Visit again', 'c b')}
</body></html>`;
}

/** Prints through a hidden iframe so popup blockers never get in the way */
export function printSalesBill(
  bill: PrintableSalesBill,
  opts?: {estimate?: boolean},
): void {
  const frame = document.createElement('iframe');
  frame.title = 'Sales bill print';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.onload = () => {
    const w = frame.contentWindow;
    if (!w) return frame.remove();
    w.onafterprint = () => frame.remove();
    w.focus();
    w.print();
  };
  frame.srcdoc = salesBillHtml(bill, opts);
  document.body.appendChild(frame);
}
