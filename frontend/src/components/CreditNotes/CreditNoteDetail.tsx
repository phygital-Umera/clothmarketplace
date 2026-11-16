import {CreditNotePanel} from '@/lib/api/creditNote';
import {useDecideCreditNote} from '@/lib/react-query/queriesAndMutations/creditNote';
import {
  CreditNote,
  REASON_LABEL,
  ReturnStockTo,
  STOCK_TO_LABEL,
} from '@/types/creditNote';
import {ReactNode, useEffect, useState} from 'react';
import {CreditNoteStatusBadge, settlementText} from './CreditNoteBadges';

const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

const Fact = ({label, children}: {label: string; children: ReactNode}) => (
  <div>
    <p className="text-label-caps uppercase text-outline">{label}</p>
    <div className="mt-0.5 text-body-sm text-espresso">{children}</div>
  </div>
);

type Props = {
  note: CreditNote;
  /** Branch admin (or the owner running the shop) decides waiting notes */
  canDecide?: boolean;
  /** Where the decision is posted; 'shop-admin' for the owner in shop mode */
  panel?: CreditNotePanel;
};

/** Right-hand panel: what came back, the money, and the decision */
export default function CreditNoteDetail({note, canDecide, panel}: Props) {
  const decide = useDecideCreditNote(panel);
  const [stockTo, setStockTo] = useState<ReturnStockTo>('RESTOCK');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  // A new note selected: reset the form
  useEffect(() => {
    setStockTo(note.reason === 'DEFECTIVE' ? 'DAMAGED' : 'RESTOCK');
    setComment('');
    setError('');
  }, [note.id, note.reason]);

  const pending = note.status === 'PENDING_APPROVAL';
  const isRefund = note.settlement === 'REFUND';

  const submit = (action: 'APPROVE' | 'STORE_CREDIT' | 'REJECT') => {
    if (action === 'REJECT' && !comment.trim()) {
      setError('Add a note saying why the return is rejected.');
      return;
    }
    setError('');
    decide.mutate({
      id: note.id,
      data: {action, stockTo, note: comment.trim() || undefined},
    });
  };

  const created = new Date(note.createdAt);

  return (
    <div className="panel">
      <div className="border-b border-ivory-300 p-4">
        <h2 className="font-serif text-headline-sm text-burgundy">
          {note.noteNumber}
        </h2>
        <p className="mt-0.5 text-technical-data text-outline">
          {note.shop.name} · {note.createdBy.fullname} ·{' '}
          {created.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          })}{' '}
          {created.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
        <div className="mt-2">
          <CreditNoteStatusBadge status={note.status} />
        </div>
      </div>

      <div className="space-y-3 p-4">
        <Fact label="Against bill">
          {note.salesBill.billNumber} ·{' '}
          {new Date(note.salesBill.billDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          })}
          {note.customerName ? ` · ${note.customerName}` : ''}
          {note.customerPhone ? ` · ${note.customerPhone}` : ''}
        </Fact>
        <Fact label={note.items.length > 1 ? 'Items' : 'Item'}>
          <ul className="space-y-0.5">
            {note.items.map((i) => (
              <li key={i.id}>
                {[i.productName, i.color, i.size].filter(Boolean).join(' – ')}
                {i.quantity > 1 ? ` × ${i.quantity}` : ''} ·{' '}
                {inr(i.totalAmount)}
              </li>
            ))}
          </ul>
        </Fact>
        <Fact label="Reason">
          {REASON_LABEL[note.reason]}
          {note.reasonNote ? ` — ${note.reasonNote}` : ''}
        </Fact>
        <Fact label="Customer wants">
          {settlementText(note)}
          {isRefund &&
            ` (paid ${note.salesBill.paymentMethod.toLowerCase()} originally)`}
        </Fact>

        <dl className="space-y-1 border-t border-ivory-300 pt-3 text-body-sm">
          <div className="flex justify-between">
            <dt className="text-outline">Taxable reversed</dt>
            <dd>{inr(note.taxableAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-outline">GST reversed</dt>
            <dd>{inr(note.taxAmount)}</dd>
          </div>
          <div className="flex justify-between font-bold text-espresso">
            <dt>{isRefund ? 'Refund' : 'Credit note value'}</dt>
            <dd>{inr(note.totalAmount)}</dd>
          </div>
        </dl>

        {!pending && (
          <div className="space-y-2 border-t border-ivory-300 pt-3">
            {note.stockTo && (
              <Fact label="Returned stock">{STOCK_TO_LABEL[note.stockTo]}</Fact>
            )}
            {note.decidedBy && (
              <Fact
                label={
                  note.status === 'REJECTED' ? 'Rejected by' : 'Approved by'
                }
              >
                {note.decidedBy.fullname}
                {note.decidedAt &&
                  ` · ${new Date(note.decidedAt).toLocaleString('en-IN')}`}
              </Fact>
            )}
            {!note.needsApproval &&
              note.status === 'APPROVED' &&
              !note.decidedBy && (
                <p className="text-technical-data text-outline">
                  Settled at the shop; no approval needed.
                </p>
              )}
            {note.decisionNote && <Fact label="Note">{note.decisionNote}</Fact>}
          </div>
        )}

        {pending && canDecide && (
          <div className="space-y-3 border-t border-ivory-300 pt-3">
            <label className="block">
              <span className="text-label-caps uppercase text-outline">
                Returned stock goes to
              </span>
              <select
                value={stockTo}
                onChange={(e) => setStockTo(e.target.value as ReturnStockTo)}
                className="mt-1 w-full border border-ivory-300 bg-ivory-100 px-3 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              >
                {(Object.keys(STOCK_TO_LABEL) as ReturnStockTo[]).map((k) => (
                  <option key={k} value={k}>
                    {STOCK_TO_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-label-caps uppercase text-outline">
                Note
              </span>
              <textarea
                value={comment}
                maxLength={500}
                rows={2}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1 w-full border border-ivory-300 bg-ivory-100 px-3 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              />
            </label>
            {error && (
              <p role="alert" className="text-body-sm text-error">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={decide.isPending}
                onClick={() => submit('REJECT')}
              >
                Reject
              </button>
              {note.settlement !== 'STORE_CREDIT' && (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={decide.isPending}
                  onClick={() => submit('STORE_CREDIT')}
                >
                  Store credit instead
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                disabled={decide.isPending}
                onClick={() => submit('APPROVE')}
              >
                {isRefund ? 'Approve refund' : 'Approve'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
