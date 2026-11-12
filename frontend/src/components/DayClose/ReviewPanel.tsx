import {useState} from 'react';
import {DayCloseShop} from '@/lib/api/dayClose';
import {useResolveDifference} from '@/lib/react-query/queriesAndMutations/dayClose';
import {getErrorMessage} from '@/utils/axios';
import {inr} from '@/utils/money';

const REASONS = [
  'Change given wrongly',
  'Cash counting error',
  'Petty cash not recorded',
  'Theft or shortage',
  'Other',
];
const ACTIONS = [
  'Write off as cash short',
  'Recover from cashier',
  'Adjust in next day close',
  'Escalate to Company Admin',
];

export const STATUS: Record<
  DayCloseShop['status'],
  {label: string; cls: string}
> = {
  ACCEPTED: {label: 'Accepted', cls: 'bg-[#E3EEDD] text-[#3F6B3A]'},
  NEEDS_REVIEW: {label: 'Needs review', cls: 'bg-[#F7DEDE] text-[#9B2C2C]'},
  OPEN: {label: 'Counter open', cls: 'bg-[#F6E6C8] text-[#8A5A12]'},
  NOT_OPENED: {label: 'Not opened', cls: 'bg-[#EFE6DC] text-[#7A6A5C]'},
};

export const signed = (n: number) =>
  n === 0 ? inr(0) : `${n > 0 ? '+' : ''}${inr(n)}`;

type ReviewShop = Pick<
  DayCloseShop,
  | 'sessionId'
  | 'shopName'
  | 'closedBy'
  | 'expected'
  | 'counted'
  | 'diff'
  | 'status'
  | 'reason'
  | 'action'
  | 'note'
>;

/**
 * Accept a counter's cash difference with a reason and follow-up action.
 * The branch admin uses it for every shop; the owner (shop mode) for the open shop.
 */
export function ReviewPanel({
  shop,
  date,
  panel = 'branch-admin',
}: {
  shop: ReviewShop;
  date: string;
  panel?: string;
}) {
  const resolve = useResolveDifference(panel);
  const [reason, setReason] = useState(shop.reason || REASONS[0]);
  const [action, setAction] = useState(shop.action || ACTIONS[0]);
  const [note, setNote] = useState(shop.note || '');
  const [error, setError] = useState('');
  const done = shop.status === 'ACCEPTED';

  const submit = () => {
    setError('');
    if (!shop.sessionId) return;
    resolve.mutate(
      {
        sessionId: shop.sessionId,
        reason,
        action,
        note: note.trim() || undefined,
      },
      {
        onError: (err) =>
          setError(getErrorMessage(err, 'Could not accept the day close')),
      },
    );
  };

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-ivory-300 pb-3">
        <div>
          <h2 className="font-serif text-headline-sm text-burgundy">
            {shop.shopName} — difference
          </h2>
          <p className="text-[11px] text-outline">
            {date} · closed by {shop.closedBy} · expected {inr(shop.expected)},
            counted {inr(shop.counted)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS[shop.status].cls}`}
        >
          {signed(shop.diff)}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <label htmlFor="dc-review-reason" className="field-label">
            Reason
          </label>
          <select
            id="dc-review-reason"
            className="field-input"
            value={reason}
            disabled={done}
            onChange={(e) => setReason(e.target.value)}
          >
            {[...new Set([reason, ...REASONS])].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dc-action" className="field-label">
            Action
          </label>
          <select
            id="dc-action"
            className="field-input"
            value={action}
            disabled={done}
            onChange={(e) => setAction(e.target.value)}
          >
            {[...new Set([action, ...ACTIONS])].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dc-note" className="field-label">
            Note
          </label>
          <textarea
            id="dc-note"
            rows={2}
            maxLength={300}
            className="field-input"
            value={note}
            disabled={done}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        {done ? (
          <p className="text-body-sm text-[#3F6B3A]">Accepted.</p>
        ) : (
          <button
            type="button"
            className="btn-primary w-full"
            disabled={resolve.isPending}
            onClick={submit}
          >
            {resolve.isPending ? 'Saving…' : 'Accept day close'}
          </button>
        )}
      </div>
    </section>
  );
}
