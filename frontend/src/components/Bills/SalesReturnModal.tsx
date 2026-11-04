import {Field, Overlay} from '@/components/ui';
import {FormError} from '@/components/ui/FormLayout';
import {useBill, useBills} from '@/lib/react-query/queriesAndMutations/bill';
import {useCreateSalesReturn} from '@/lib/react-query/queriesAndMutations/shopOps';
import {Bill} from '@/types/bill';
import {RefundMode} from '@/types/shopOps';
import {getErrorMessage} from '@/utils/axios';
import {inr} from '@/utils/money';
import {Search, X} from 'lucide-react';
import {useMemo, useState} from 'react';

interface Props {
  panel: string;
  onClose: () => void;
}

const REFUND_MODES: {value: RefundMode; label: string}[] = [
  {value: 'CASH', label: 'Cash refund'},
  {value: 'UPI', label: 'UPI refund'},
  {value: 'CARD', label: 'Card refund'},
  {value: 'STORE_CREDIT', label: 'Store credit'},
  {value: 'ADJUST_DUE', label: 'Adjust in customer due'},
];

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Sales return (credit note): find a confirmed sales bill, choose how many
 * of each item come back and how the customer is refunded. The items go
 * back into stock; the server recomputes the refund.
 */
export default function SalesReturnModal({panel, onClose}: Props) {
  const [search, setSearch] = useState('');
  const [billId, setBillId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number | ''>>({});
  const [refundMode, setRefundMode] = useState<RefundMode>('CASH');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const save = useCreateSalesReturn(panel);

  const {data: found, isFetching} = useBills(panel, 'sales', {
    search: search.trim() || undefined,
    status: 'CONFIRMED',
    limit: 6,
  });
  const {data} = useBill(panel, 'sales', billId ?? undefined);
  const bill = data as Bill | undefined;

  const lines = useMemo(() => {
    if (!bill?.items) return [];
    // Bill discount is shared across lines like the server does
    const linesTotal = bill.items.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
    const factor = linesTotal > 0 ? bill.totalAmount / linesTotal : 0;
    return bill.items.map((i) => {
      const returned = (i.returnItems ?? []).reduce(
        (s, r) => s + r.quantity,
        0,
      );
      return {
        id: i.id,
        name: i.variant?.product.name ?? 'Item',
        variant: `${i.variant?.color ?? ''} / Size ${i.variant?.size ?? ''}`,
        sold: i.quantity,
        left: i.quantity - returned,
        unit: round2(((i.totalPrice ?? 0) / i.quantity) * factor),
      };
    });
  }, [bill]);

  const picked = lines
    .map((l) => ({...l, q: Number(qty[l.id]) || 0}))
    .filter((l) => l.q > 0);
  const refund = round2(picked.reduce((s, l) => s + l.unit * l.q, 0));

  const submit = async () => {
    setError('');
    if (!bill) return setError('Select the sales bill being returned.');
    if (!picked.length)
      return setError('Enter a return quantity for at least one item.');
    const over = picked.find((l) => l.q > l.left || !Number.isInteger(l.q));
    if (over)
      return setError(`Only ${over.left} of ${over.name} can be returned.`);
    if (refundMode === 'ADJUST_DUE' && refund > bill.balanceDue)
      return setError(
        `Refund ${inr(refund)} is more than the due ${inr(bill.balanceDue)}; choose another refund mode.`,
      );
    try {
      await save.mutateAsync({
        salesBillId: bill.id,
        refundMode,
        reason: reason.trim() || undefined,
        items: picked.map((l) => ({salesBillItemId: l.id, quantity: l.q})),
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save return'));
    }
  };

  return (
    <Overlay open onClose={onClose} label="Sales return">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-ivory-300 bg-white">
        <div className="flex items-center justify-between border-b border-ivory-300 px-5 py-4">
          <div>
            <h2 className="font-serif text-headline-sm text-burgundy">
              Sales return
            </h2>
            <p className="text-body-sm text-outline">
              Returned items go back into stock and a credit note is issued.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <FormError message={error} />

          {!bill ? (
            <div>
              <label htmlFor="ret-search" className="field-label">
                Find sales bill
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  id="ret-search"
                  autoFocus
                  className="field-input pl-9"
                  placeholder="Bill number, customer name or phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ul className="mt-2 divide-y divide-ivory-200 border border-ivory-300">
                {!found?.items?.length ? (
                  <li className="p-3 text-body-sm text-outline">
                    {isFetching
                      ? 'Searching…'
                      : 'No confirmed sales bills found.'}
                  </li>
                ) : (
                  found.items.map((b: Bill) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setBillId(b.id);
                          setQty({});
                          setRefundMode('CASH');
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-ivory-100"
                      >
                        <span>
                          <span className="font-mono text-body-sm text-espresso">
                            {b.billNumber}
                          </span>
                          <span className="block text-technical-data text-outline">
                            {b.customerName || 'Walk-in'} ·{' '}
                            {new Date(b.billDate).toLocaleDateString('en-IN')}
                          </span>
                        </span>
                        <span className="text-body-sm font-semibold">
                          {inr(b.totalAmount)}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border border-ivory-300 bg-ivory-100 px-3 py-2">
                <div>
                  <p className="font-mono text-body-sm text-espresso">
                    {bill.billNumber}
                  </p>
                  <p className="text-technical-data text-outline">
                    {bill.customerName || 'Walk-in'} · {inr(bill.totalAmount)}
                    {bill.balanceDue > 0 && ` · due ${inr(bill.balanceDue)}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => setBillId(null)}
                >
                  Change bill
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-body-sm">
                  <thead className="border-b border-ivory-300 text-label-caps uppercase text-outline">
                    <tr>
                      <th className="py-2">Item</th>
                      <th className="py-2 text-right">Sold</th>
                      <th className="py-2 text-right">Can return</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="w-24 py-2 text-right">Return qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-200">
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2">
                          <p className="text-espresso">{l.name}</p>
                          <p className="text-technical-data text-outline">
                            {l.variant}
                          </p>
                        </td>
                        <td className="py-2 text-right">{l.sold}</td>
                        <td className="py-2 text-right">{l.left}</td>
                        <td className="py-2 text-right">{inr(l.unit)}</td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={l.left}
                            step={1}
                            disabled={l.left <= 0}
                            aria-label={`Return quantity for ${l.name}`}
                            value={qty[l.id] ?? ''}
                            onChange={(e) =>
                              setQty({
                                ...qty,
                                [l.id]:
                                  e.target.value === ''
                                    ? ''
                                    : Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-20 border border-ivory-300 px-2 py-1 text-right focus:border-burgundy focus:outline-none disabled:bg-ivory-100"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Refund" htmlFor="ret-mode" required>
                  <select
                    id="ret-mode"
                    className="field-input"
                    value={refundMode}
                    onChange={(e) =>
                      setRefundMode(e.target.value as RefundMode)
                    }
                  >
                    {REFUND_MODES.filter(
                      (m) => m.value !== 'ADJUST_DUE' || bill.balanceDue > 0,
                    ).map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Reason" htmlFor="ret-reason">
                  <input
                    id="ret-reason"
                    className="field-input"
                    maxLength={300}
                    placeholder="Size issue, defect…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ivory-300 px-5 py-4">
          <p className="text-body-sm text-espresso">
            Refund <span className="font-semibold">{inr(refund)}</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!bill || save.isPending}
              className="btn-primary"
            >
              {save.isPending ? 'Saving…' : 'Save Return'}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
