import {CreditNote, REASON_LABEL} from '@/types/creditNote';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {
  CreditNoteStatusBadge,
  itemsText,
  settlementText,
} from './CreditNoteBadges';

type Props = {
  notes?: CreditNote[];
  loading?: boolean;
  error?: string;
  selectedId?: string | null;
  onSelect: (note: CreditNote) => void;
  /** Branch view lists every shop */
  showShop?: boolean;
  pagination?: {page: number; limit: number; total: number};
  onPageChange: (page: number) => void;
};

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'});
};

const th = 'px-3 py-2 text-left text-label-caps uppercase text-outline';
const td = 'px-3 py-3 align-top text-body-sm text-espresso';

/** Credit notes list; a row click selects it for the detail panel */
export default function CreditNoteTable({
  notes,
  loading,
  error,
  selectedId,
  onSelect,
  showShop,
  pagination,
  onPageChange,
}: Props) {
  if (error)
    return (
      <p role="alert" className="p-4 text-body-sm text-error">
        {error}
      </p>
    );
  if (loading && !notes)
    return <p className="p-4 text-body-sm text-outline">Loading returns…</p>;
  if (!notes?.length)
    return (
      <p className="p-6 text-center text-body-sm text-on-surface-variant">
        No returns here.
      </p>
    );

  const pages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.limit))
    : 1;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-ivory-300">
            <tr>
              <th className={th}>Credit note</th>
              {showShop && <th className={th}>Shop</th>}
              <th className={th}>Against bill</th>
              <th className={th}>Item</th>
              <th className={th}>Reason</th>
              <th className={th}>Settlement</th>
              <th className={`${th} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {notes.map((n) => (
              <tr
                key={n.id}
                onClick={() => onSelect(n)}
                aria-selected={n.id === selectedId}
                className={`cursor-pointer transition-colors ${
                  n.id === selectedId ? 'bg-blush/30' : 'hover:bg-ivory-100'
                }`}
              >
                <td className={td}>
                  <p className="font-mono font-bold">{n.noteNumber}</p>
                  <p className="text-technical-data text-outline">
                    {when(n.createdAt)}
                  </p>
                </td>
                {showShop && <td className={td}>{n.shop.name}</td>}
                <td className={`${td} font-mono`}>{n.salesBill.billNumber}</td>
                <td className={td}>{itemsText(n)}</td>
                <td className={td}>{REASON_LABEL[n.reason]}</td>
                <td className={td}>
                  {n.status === 'APPROVED' ? (
                    settlementText(n)
                  ) : (
                    <div className="space-y-1">
                      <p>{settlementText(n)}</p>
                      <CreditNoteStatusBadge status={n.status} />
                    </div>
                  )}
                </td>
                <td className={`${td} text-right font-medium`}>
                  ₹{n.totalAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && pages > 1 && (
        <div className="flex items-center justify-between border-t border-ivory-300 px-3 py-2 text-technical-data text-outline">
          <span>
            {pagination.total} return{pagination.total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-icon"
              aria-label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {pagination.page} of {pages}
            </span>
            <button
              type="button"
              className="btn-icon"
              aria-label="Next page"
              disabled={pagination.page >= pages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
