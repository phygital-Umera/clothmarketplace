import {useBill} from '@/lib/react-query/queriesAndMutations/bill';
import {useStockMovements} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {Bill, BillKind, BillPayment} from '@/types/bill';
import {ArrowDown, ArrowUp, X} from 'lucide-react';
import BillStatusBadge from './BillStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';

const MODE_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  CREDIT: 'Credit',
};

interface Props {
  panel: string;
  kind: BillKind;
  billId: string;
  onClose: () => void;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function BillDetailsModal({
  panel,
  kind,
  billId,
  onClose,
}: Props) {
  const isPurchase = kind === 'purchase';
  const {data: bill, isPending} = useBill(panel, kind, billId);
  // The stock ledger entries this bill produced (confirm / edits / cancel)
  const {data: movements} = useStockMovements(panel, {
    sourceType: isPurchase ? 'PURCHASE_BILL' : 'SALES_BILL',
    sourceId: billId,
    limit: 100,
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-espresso/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ivory-200 bg-ivory-50/50 px-6 py-4">
          <div>
            <h3 className="flex items-center gap-2 font-serif text-headline-sm text-espresso">
              {isPurchase ? 'Purchase' : 'Sales'} Bill {bill?.billNumber}
              {bill && <BillStatusBadge status={bill.status} />}
            </h3>
            {bill && (
              <p className="text-xs text-outline">
                {new Date(bill.billDate).toLocaleDateString('en-IN')} · by{' '}
                {bill.createdBy?.fullname}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-outline hover:bg-ivory-200 hover:text-espresso"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {isPending || !bill ? (
          <div className="py-16 text-center text-body-sm text-outline">
            Loading bill…
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-3 text-body-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-outline">
                  {isPurchase ? 'Supplier' : 'Customer'}
                </p>
                <p className="font-medium text-espresso">
                  {(isPurchase ? bill.supplierName : bill.customerName) ||
                    'Walk-in customer'}
                </p>
                <p className="text-xs text-outline">
                  {isPurchase ? bill.supplierPhone : bill.customerPhone}
                </p>
              </div>
              <div>
                <p className="text-xs text-outline">
                  {isPurchase ? 'Supplier Invoice' : 'Payment'}
                </p>
                <p className="font-medium text-espresso">
                  {(isPurchase
                    ? bill.supplierInvoiceNo
                    : bill.paymentMethod && MODE_LABEL[bill.paymentMethod]) ||
                    '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-outline">Total</p>
                <p className="font-bold text-espresso">
                  ₹{bill.totalAmount.toFixed(2)}
                </p>
              </div>
              {!isPurchase && !!bill.creditAmount && (
                <div>
                  <p className="text-xs text-outline">Paid / Credit due</p>
                  <p className="font-medium text-espresso">
                    ₹{(bill.paidAmount ?? 0).toFixed(2)}
                    <span className="text-rose-700">
                      {' '}
                      / ₹{bill.creditAmount.toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
              {!!bill.editCount && (
                <div>
                  <p className="text-xs text-outline">
                    Edited after confirming
                  </p>
                  <p className="text-xs text-amber-800">
                    {bill.editCount} time{bill.editCount === 1 ? '' : 's'}
                    {bill.lastEditedAt &&
                      ` · last ${new Date(bill.lastEditedAt).toLocaleString('en-IN')}`}
                  </p>
                </div>
              )}
              {bill.status === 'CONFIRMED' && (
                <div>
                  <p className="text-xs text-outline">Payment</p>
                  <PaymentStatusBadge status={bill.paymentStatus} />
                  {bill.balanceDue > 0 && (
                    <p className="mt-0.5 text-xs text-outline">
                      Due ₹{bill.balanceDue.toFixed(2)}
                      {bill.dueDate &&
                        ` by ${new Date(bill.dueDate).toLocaleDateString('en-IN')}`}
                    </p>
                  )}
                </div>
              )}
              {bill.status === 'CANCELLED' && (
                <div>
                  <p className="text-xs text-outline">Cancelled</p>
                  <p className="text-xs text-rose-700">{bill.cancelReason}</p>
                </div>
              )}
            </div>

            <table className="w-full text-left text-body-sm">
              <thead className="border-b border-ivory-200 text-label-caps uppercase text-outline">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">
                    {isPurchase ? 'Unit Cost' : 'Unit Price'}
                  </th>
                  <th className="py-2 text-right">GST</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {bill.items?.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">
                      <p className="font-medium text-espresso">
                        {i.variant?.product.name}
                      </p>
                      <p className="text-xs text-outline">
                        {i.variant?.color} / Size {i.variant?.size} ·{' '}
                        <span className="font-mono">
                          {i.variant?.variantSku}
                        </span>
                      </p>
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {i.quantity}
                    </td>
                    <td className="py-2 text-right">
                      ₹{(isPurchase ? i.unitCost : i.unitPrice)?.toFixed(2)}
                      {!isPurchase && !!i.discount && (
                        <span className="block text-[10px] text-outline">
                          −₹{i.discount}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">{i.taxRate}%</td>
                    <td className="py-2 text-right font-semibold">
                      ₹{(isPurchase ? i.totalCost : i.totalPrice)?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {bill.pricesIncludeTax ? (
              // Tag-price bill: prices include GST; the discount is already shared over the lines
              <div className="ml-auto max-w-xs space-y-1 text-body-sm">
                {bill.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-outline">Bill discount (applied)</span>
                    <span>−₹{bill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-outline">Taxable value</span>
                  <span>₹{bill.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">CGST</span>
                  <span>₹{(Math.round((bill.taxAmount / 2) * 100) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">SGST</span>
                  <span>₹{(bill.taxAmount - Math.round((bill.taxAmount / 2) * 100) / 100).toFixed(2)}</span>
                </div>
                {!!bill.roundOff && (
                  <div className="flex justify-between">
                    <span className="text-outline">Round off</span>
                    <span>₹{bill.roundOff.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-ivory-300 pt-1 font-bold text-espresso">
                  <span>Total (incl. GST)</span>
                  <span>₹{bill.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            ) : (
            <div className="ml-auto max-w-xs space-y-1 text-body-sm">
              <div className="flex justify-between">
                <span className="text-outline">Subtotal</span>
                <span>₹{bill.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">GST</span>
                <span>₹{bill.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Discount</span>
                <span>−₹{bill.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-ivory-300 pt-1 font-bold text-espresso">
                <span>Total</span>
                <span>₹{bill.totalAmount.toFixed(2)}</span>
              </div>
            </div>
            )}

            {!!bill.payments?.length && (
              <div>
                <h4 className="mb-2 text-label-caps uppercase text-outline">
                  Payments
                </h4>
                <ul className="divide-y divide-ivory-100 rounded-lg border border-ivory-200">
                  {bill.payments.map((p: BillPayment) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-espresso">
                        {MODE_LABEL[p.mode] ?? p.mode}
                      </span>
                      <span className="text-outline">
                        {p.atBilling
                          ? 'At billing'
                          : isPurchase
                            ? 'Paid later'
                            : 'Collected later'}
                        {p.note ? ` · ${p.note}` : ''}
                      </span>
                      <span className="whitespace-nowrap text-outline">
                        {fmtDate(p.paidAt)}
                      </span>
                      <span className="font-bold text-espresso">
                        ₹{p.amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!bill.returns?.length && (
              <div>
                <h4 className="mb-2 text-label-caps uppercase text-outline">
                  Returns (credit notes)
                </h4>
                <ul className="divide-y divide-ivory-100 rounded-lg border border-ivory-200">
                  {bill.returns.map(
                    (r: NonNullable<Bill['returns']>[number]) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <span className="font-mono text-espresso">
                          {r.returnNumber}
                        </span>
                        <span className="whitespace-nowrap text-outline">
                          {fmtDate(r.returnDate)}
                        </span>
                        <span className="font-bold text-rose-700">
                          −₹{r.totalAmount.toFixed(2)}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-label-caps uppercase text-outline">
                Stock Movements
              </h4>
              {!movements?.items?.length ? (
                <p className="text-xs text-outline">
                  {bill.status === 'DRAFT'
                    ? 'Draft bills do not change stock until confirmed.'
                    : 'No stock movements recorded.'}
                </p>
              ) : (
                <ul className="divide-y divide-ivory-100 rounded-lg border border-ivory-200">
                  {movements.items.map((m: any) => {
                    const isIn = m.newPhysical > m.prevPhysical;
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          {isIn ? (
                            <ArrowUp size={13} className="text-emerald-700" />
                          ) : (
                            <ArrowDown size={13} className="text-rose-700" />
                          )}
                          <span className="text-espresso">
                            {m.product?.name} ({m.variant?.color} /{' '}
                            {m.variant?.size})
                          </span>
                        </span>
                        <span className="text-outline">{m.reason}</span>
                        <span
                          className={`font-bold ${isIn ? 'text-emerald-700' : 'text-rose-700'}`}
                        >
                          {isIn ? '+' : '−'}
                          {m.quantity}
                        </span>
                        <span className="text-outline">
                          {m.prevPhysical} → {m.newPhysical}
                        </span>
                        <span className="whitespace-nowrap text-outline">
                          {fmtDate(m.createdAt)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
