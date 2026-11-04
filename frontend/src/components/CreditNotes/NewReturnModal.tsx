import {Overlay} from '@/components/ui';
import {
  useCreateCreditNote,
  useReturnableBill,
} from '@/lib/react-query/queriesAndMutations/creditNote';
import {
  REASON_LABEL,
  REFUND_MODE_LABEL,
  RefundMode,
  ReturnReason,
  ReturnSettlement,
  ReturnStockTo,
  SETTLEMENT_LABEL,
  STOCK_TO_LABEL,
} from '@/types/creditNote';
import {getErrorMessage} from '@/utils/axios';
import {useEffect, useMemo, useState} from 'react';

/** Mirrors the server rule; the server decides in the end */
const APPROVAL_LIMIT = 2000;

const inputCls =
  'mt-1 w-full border border-ivory-300 bg-ivory-100 px-3 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none';
const labelCls = 'block text-label-caps uppercase text-outline';

const round2 = (n: number) => Math.round(n * 100) / 100;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Opened from a sales bill row: the bill is loaded straight away */
  billNumber?: string;
};

/** Shop admin: return items of a confirmed sales bill as a credit note */
export default function NewReturnModal({open, onClose, billNumber}: Props) {
  const [billInput, setBillInput] = useState(billNumber ?? '');
  const [lookup, setLookup] = useState(billNumber);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason>('SIZE');
  const [reasonNote, setReasonNote] = useState('');
  const [settlement, setSettlement] = useState<ReturnSettlement>('EXCHANGE');
  const [refundMode, setRefundMode] = useState<RefundMode>('CASH');
  const [stockTo, setStockTo] = useState<ReturnStockTo>('RESTOCK');
  const [formError, setFormError] = useState('');

  const {data: bill, error, isFetching} = useReturnableBill(lookup);
  const create = useCreateCreditNote();

  useEffect(() => {
    if (!open) return;
    setBillInput(billNumber ?? '');
    setLookup(billNumber);
    setQty({});
    setReason('SIZE');
    setReasonNote('');
    setSettlement('EXCHANGE');
    setRefundMode('CASH');
    setStockTo('RESTOCK');
    setFormError('');
  }, [open, billNumber]);

  useEffect(() => {
    setQty({});
    // Refund the way it was paid; credit bills default to cash
    if (bill)
      setRefundMode(
        bill.paymentMethod in REFUND_MODE_LABEL
          ? (bill.paymentMethod as RefundMode)
          : 'CASH',
      );
  }, [bill]);

  // Same proportional amounts as the server (bill discount spread over lines)
  const total = useMemo(() => {
    if (!bill) return 0;
    const lines = bill.items.reduce((t, l) => t + l.totalPrice, 0);
    const factor = lines ? bill.totalAmount / lines : 1;
    return round2(
      bill.items.reduce(
        (t, l) =>
          t + round2((l.totalPrice / l.quantity) * factor) * (qty[l.id] ?? 0),
        0,
      ),
    );
  }, [bill, qty]);

  const isRefund = settlement === 'REFUND';
  const needsApproval =
    isRefund && (refundMode === 'CASH' || total > APPROVAL_LIMIT);
  const chosen = Object.entries(qty).filter(([, q]) => q > 0);

  const submit = async () => {
    if (!bill) return setFormError('Find the sales bill first.');
    if (!chosen.length) return setFormError('Choose at least one item.');
    setFormError('');
    try {
      await create.mutateAsync({
        salesBillId: bill.id,
        settlement,
        refundMode: isRefund ? refundMode : undefined,
        reason,
        reasonNote: reasonNote.trim() || undefined,
        stockTo,
        items: chosen.map(([salesBillItemId, quantity]) => ({
          salesBillItemId,
          quantity,
        })),
      });
      onClose();
    } catch {
      // Shown by toast
    }
  };

  return (
    <Overlay open={open} onClose={onClose} label="New return">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col border border-ivory-300 bg-white"
      >
        <div className="border-b border-ivory-300 p-5">
          <h2 className="font-serif text-headline-sm text-burgundy">
            New return
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Cash refunds and refunds above ₹
            {APPROVAL_LIMIT.toLocaleString('en-IN')} go to the branch admin for
            approval.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className={labelCls}>Sales bill number</span>
              <input
                className={inputCls}
                value={billInput}
                placeholder="e.g. SB-20261104-0001"
                onChange={(e) => setBillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setLookup(billInput.trim() || undefined);
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setLookup(billInput.trim() || undefined)}
            >
              {isFetching ? 'Finding…' : 'Find bill'}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-body-sm text-error">
              {getErrorMessage(error, 'Bill not found')}
            </p>
          )}

          {bill && (
            <>
              <p className="text-body-sm text-on-surface-variant">
                {bill.billNumber} ·{' '}
                {new Date(bill.billDate).toLocaleDateString('en-IN')} ·{' '}
                {bill.customerName || 'Walk-in'} · paid{' '}
                {bill.paymentMethod.toLowerCase()} · ₹
                {bill.totalAmount.toLocaleString('en-IN')}
              </p>
              <table className="w-full text-body-sm">
                <thead className="border-b border-ivory-300 text-label-caps uppercase text-outline">
                  <tr>
                    <th className="py-2 text-left">Item</th>
                    <th className="py-2 text-right">Sold</th>
                    <th className="py-2 text-right">Returned</th>
                    <th className="py-2 text-right">Return now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {bill.items.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2">
                        {[l.productName, l.color, l.size]
                          .filter(Boolean)
                          .join(' – ')}
                        <span className="block text-technical-data text-outline">
                          {l.variantSku}
                        </span>
                      </td>
                      <td className="py-2 text-right">{l.quantity}</td>
                      <td className="py-2 text-right">{l.returned}</td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={l.returnable}
                          disabled={!l.returnable}
                          value={qty[l.id] ?? 0}
                          onChange={(e) =>
                            setQty({
                              ...qty,
                              [l.id]: Math.min(
                                l.returnable,
                                Math.max(
                                  0,
                                  Math.floor(Number(e.target.value) || 0),
                                ),
                              ),
                            })
                          }
                          aria-label={`Return quantity for ${l.productName}`}
                          className="w-20 border border-ivory-300 px-2 py-1 text-right disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className={labelCls}>Reason</span>
                  <select
                    className={inputCls}
                    value={reason}
                    onChange={(e) => {
                      const next = e.target.value as ReturnReason;
                      setReason(next);
                      if (next === 'DEFECTIVE') setStockTo('DAMAGED');
                    }}
                  >
                    {(Object.keys(REASON_LABEL) as ReturnReason[]).map((r) => (
                      <option key={r} value={r}>
                        {REASON_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelCls}>Customer wants</span>
                  <select
                    className={inputCls}
                    value={settlement}
                    onChange={(e) =>
                      setSettlement(e.target.value as ReturnSettlement)
                    }
                  >
                    {(Object.keys(SETTLEMENT_LABEL) as ReturnSettlement[]).map(
                      (s) => (
                        <option key={s} value={s}>
                          {SETTLEMENT_LABEL[s]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                {isRefund && (
                  <label>
                    <span className={labelCls}>Refund paid by</span>
                    <select
                      className={inputCls}
                      value={refundMode}
                      onChange={(e) =>
                        setRefundMode(e.target.value as RefundMode)
                      }
                    >
                      {(Object.keys(REFUND_MODE_LABEL) as RefundMode[]).map(
                        (m) => (
                          <option key={m} value={m}>
                            {REFUND_MODE_LABEL[m]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                )}
                <label>
                  <span className={labelCls}>Returned stock goes to</span>
                  <select
                    className={inputCls}
                    value={stockTo}
                    onChange={(e) =>
                      setStockTo(e.target.value as ReturnStockTo)
                    }
                  >
                    {(Object.keys(STOCK_TO_LABEL) as ReturnStockTo[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {STOCK_TO_LABEL[k]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className={labelCls}>Reason note</span>
                <input
                  className={inputCls}
                  value={reasonNote}
                  maxLength={500}
                  placeholder="e.g. lining torn"
                  onChange={(e) => setReasonNote(e.target.value)}
                />
              </label>

              <div className="flex items-center justify-between border-t border-ivory-300 pt-3">
                <div>
                  <p className="text-label-caps uppercase text-outline">
                    {isRefund ? 'Refund' : 'Credit note value'}
                  </p>
                  <p className="font-serif text-headline-sm text-burgundy">
                    ₹{total.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </p>
                </div>
                {needsApproval && (
                  <span className="badge-ribbon">Needs branch approval</span>
                )}
              </div>
            </>
          )}

          {formError && (
            <p role="alert" className="text-body-sm text-error">
              {formError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-ivory-300 p-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!bill || !chosen.length || create.isPending}
          >
            {create.isPending
              ? 'Saving…'
              : needsApproval
                ? 'Send for approval'
                : 'Save return'}
          </button>
        </div>
      </form>
    </Overlay>
  );
}
