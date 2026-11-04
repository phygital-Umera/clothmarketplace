import {
  CreditNote,
  CreditNoteStatus,
  REFUND_MODE_LABEL,
  SETTLEMENT_LABEL,
} from '@/types/creditNote';

const STATUS: Record<CreditNoteStatus, {label: string; cls: string}> = {
  PENDING_APPROVAL: {
    label: 'Needs approval',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  APPROVED: {
    label: 'Approved',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    cls: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export const CreditNoteStatusBadge = ({status}: {status: CreditNoteStatus}) => (
  <span
    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS[status].cls}`}
  >
    <span aria-hidden="true">●</span>
    {STATUS[status].label}
  </span>
);

/** "Refund · Cash", "Exchange", "Store credit" */
export const settlementText = (
  n: Pick<CreditNote, 'settlement' | 'refundMode'>,
) =>
  n.settlement === 'REFUND' && n.refundMode
    ? `${SETTLEMENT_LABEL.REFUND} · ${REFUND_MODE_LABEL[n.refundMode]}`
    : SETTLEMENT_LABEL[n.settlement];

/** First item plus "+N more" */
export const itemsText = (n: Pick<CreditNote, 'items'>) => {
  const first = n.items[0];
  if (!first) return '—';
  const name = [first.productName, first.color, first.size]
    .filter(Boolean)
    .join(' · ');
  return n.items.length > 1 ? `${name} +${n.items.length - 1} more` : name;
};
