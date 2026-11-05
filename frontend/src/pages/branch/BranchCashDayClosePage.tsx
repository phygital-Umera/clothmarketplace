import {useEffect, useState} from 'react';
import {PageHeader} from '@/components/ui';
import {
  useDayCloseData,
  useRecordBankDeposit,
  useResolveDifference,
} from '@/lib/react-query/queriesAndMutations/dayClose';
import {DayCloseShop} from '@/lib/api/dayClose';
import {getErrorMessage} from '@/utils/axios';
import {inr} from '@/utils/money';

const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

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

const STATUS: Record<DayCloseShop['status'], {label: string; cls: string}> = {
  ACCEPTED: {label: 'Accepted', cls: 'bg-[#E3EEDD] text-[#3F6B3A]'},
  NEEDS_REVIEW: {label: 'Needs review', cls: 'bg-[#F7DEDE] text-[#9B2C2C]'},
  OPEN: {label: 'Counter open', cls: 'bg-[#F6E6C8] text-[#8A5A12]'},
  NOT_OPENED: {label: 'Not opened', cls: 'bg-[#EFE6DC] text-[#7A6A5C]'},
};

const signed = (n: number) => (n === 0 ? inr(0) : `${n > 0 ? '+' : ''}${inr(n)}`);

function ReviewPanel({shop, date}: {shop: DayCloseShop; date: string}) {
  const resolve = useResolveDifference();
  const [reason, setReason] = useState(shop.reason || REASONS[0]);
  const [action, setAction] = useState(shop.action || ACTIONS[0]);
  const [note, setNote] = useState(shop.note || '');
  const [error, setError] = useState('');
  const done = shop.status === 'ACCEPTED';

  const submit = () => {
    setError('');
    if (!shop.sessionId) return;
    resolve.mutate(
      {sessionId: shop.sessionId, reason, action, note: note.trim() || undefined},
      {onError: (err) => setError(getErrorMessage(err, 'Could not accept the day close'))},
    );
  };

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-ivory-300 pb-3">
        <div>
          <h2 className="font-serif text-headline-sm text-burgundy">{shop.shopName} — difference</h2>
          <p className="text-[11px] text-outline">
            {date} · closed by {shop.closedBy} · expected {inr(shop.expected)}, counted {inr(shop.counted)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS[shop.status].cls}`}>
          {signed(shop.diff)}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <label htmlFor="dc-reason" className="field-label">Reason</label>
          <select id="dc-reason" className="field-input" value={reason} disabled={done} onChange={(e) => setReason(e.target.value)}>
            {[...new Set([reason, ...REASONS])].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dc-action" className="field-label">Action</label>
          <select id="dc-action" className="field-input" value={action} disabled={done} onChange={(e) => setAction(e.target.value)}>
            {[...new Set([action, ...ACTIONS])].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dc-note" className="field-label">Note</label>
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
        {error && <p role="alert" className="field-error">{error}</p>}
        {done ? (
          <p className="text-body-sm text-[#3F6B3A]">Accepted.</p>
        ) : (
          <button type="button" className="btn-primary w-full" disabled={resolve.isPending} onClick={submit}>
            {resolve.isPending ? 'Saving…' : 'Accept day close'}
          </button>
        )}
      </div>
    </section>
  );
}

function DepositPanel({date, toBank, deposited}: {date: string; toBank: number; deposited: number}) {
  const record = useRecordBankDeposit();
  const pending = Math.max(0, Math.round((toBank - deposited) * 100) / 100);
  const [amount, setAmount] = useState(String(pending || ''));
  const [bank, setBank] = useState('');
  const [utr, setUtr] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setAmount(String(pending || '')), [pending, date]);

  const submit = () => {
    setError('');
    if (!(Number(amount) > 0)) return setError('Enter the amount deposited.');
    if (bank.trim().length < 2) return setError('Enter the bank.');
    record.mutate(
      {amount: Number(amount), bank: bank.trim(), depositSlipUtr: utr.trim() || undefined, date},
      {
        onSuccess: () => {
          setUtr('');
        },
        onError: (err) => setError(getErrorMessage(err, 'Could not record the deposit')),
      },
    );
  };

  return (
    <section className="panel p-4">
      <h2 className="mb-1 font-serif text-headline-sm text-burgundy">Bank deposit</h2>
      <p className="mb-3 text-[11px] text-outline">
        Shops set aside {inr(toBank)} to deposit · {inr(deposited)} recorded
      </p>
      <div className="space-y-3">
        <div>
          <label htmlFor="bd-amount" className="field-label">Amount</label>
          <input id="bd-amount" type="number" min={0} step="0.01" className="field-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bd-bank" className="field-label">Bank</label>
          <input id="bd-bank" className="field-input" maxLength={120} placeholder="e.g. HDFC current a/c" value={bank} onChange={(e) => setBank(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bd-utr" className="field-label">Deposit slip / UTR</label>
          <input id="bd-utr" className="field-input" maxLength={60} value={utr} onChange={(e) => setUtr(e.target.value)} />
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <button type="button" className="btn-primary w-full" disabled={record.isPending} onClick={submit}>
          {record.isPending ? 'Saving…' : 'Record deposit'}
        </button>
      </div>
    </section>
  );
}

export default function BranchCashDayClosePage() {
  const [date, setDate] = useState(todayKey());
  const {data, isLoading, isError, error, refetch} = useDayCloseData(date);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shops = data?.shops ?? [];
  const reviewable = shops.filter((s) => s.diff !== 0 && (s.status === 'NEEDS_REVIEW' || s.status === 'ACCEPTED'));
  const active =
    reviewable.find((s) => s.id === selectedId) ?? reviewable.find((s) => s.status === 'NEEDS_REVIEW') ?? null;
  const summary = data?.summary;

  const cols = ['Opening', 'Cash sales', 'Dues collected', 'Cash out', 'Expected', 'Counted', 'Diff'];

  return (
    <div className="pb-12">
      <PageHeader
        breadcrumbs={[{label: 'Accounts'}, {label: 'Cash & day close'}]}
        title="Cash & day close"
        subtitle="Every shop counter's day close: expected vs counted cash, differences to review, and the bank deposit."
        actions={
          <>
            <label htmlFor="dc-date" className="sr-only">Date</label>
            <input
              id="dc-date"
              type="date"
              max={todayKey()}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="field-input w-auto py-2"
            />
          </>
        }
      />

      {isError && (
        <div className="panel mb-4 p-4 text-body-sm text-error">
          {getErrorMessage(error, 'Could not load day close')}{' '}
          <button type="button" className="btn-text" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {label: 'Cash sales', value: summary ? inr(summary.cashSales) : '—', note: summary ? `${summary.countersCount} of ${summary.shopsCount} counters closed` : ''},
          {label: 'Counted', value: summary ? inr(summary.counted) : '—', note: summary ? `Incl. ${inr(summary.openingFloats)} opening floats` : ''},
          {label: 'Difference', value: summary ? signed(summary.difference) : '—', note: summary?.differenceShop ?? '', bad: !!summary?.difference},
          {label: 'To bank', value: summary ? inr(summary.toBank) : '—', note: summary?.depositStatus ?? ''},
        ].map((k) => (
          <div key={k.label} className="panel p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{k.label}</p>
            <p className={`mt-2 font-serif text-[26px] leading-none ${k.bad ? 'text-error' : 'text-espresso'}`}>{k.value}</p>
            <p className="mt-1.5 truncate text-[11px] text-outline">{k.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="panel min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-body-sm">
              <thead>
                <tr className="border-b border-ivory-300 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th scope="col" className="px-4 py-3">Shop</th>
                  {cols.map((c) => (
                    <th key={c} scope="col" className="px-3 py-3 text-right">{c}</th>
                  ))}
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200 text-espresso">
                {isLoading && (
                  <tr><td colSpan={9} className="py-10 text-center text-outline">Loading…</td></tr>
                )}
                {data && !shops.length && (
                  <tr><td colSpan={9} className="py-10 text-center text-outline">No active shops in this branch.</td></tr>
                )}
                {shops.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => s.diff !== 0 && setSelectedId(s.id)}
                    className={`${s.diff !== 0 ? 'cursor-pointer' : ''} hover:bg-ivory-50 ${active?.id === s.id ? 'bg-blush/20' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.shopName}</p>
                      <p className="text-[11px] text-outline">{s.closedBy}</p>
                    </td>
                    <td className="px-3 py-3 text-right">{inr(s.opening)}</td>
                    <td className="px-3 py-3 text-right">{inr(s.cashSales)}</td>
                    <td className="px-3 py-3 text-right">{inr(s.duesCollected)}</td>
                    <td className="px-3 py-3 text-right">{inr(s.cashOut)}</td>
                    <td className="px-3 py-3 text-right">{inr(s.expected)}</td>
                    <td className="px-3 py-3 text-right">{s.status === 'OPEN' || s.status === 'NOT_OPENED' ? '—' : inr(s.counted)}</td>
                    <td className={`px-3 py-3 text-right font-medium ${s.diff < 0 ? 'text-error' : s.diff > 0 ? 'text-[#8A5A12]' : ''}`}>
                      {signed(s.diff)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS[s.status].cls}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {STATUS[s.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {data && shops.length > 0 && (
                <tfoot>
                  <tr className="border-t border-ivory-300 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    {(['opening', 'cashSales', 'duesCollected', 'cashOut', 'expected', 'counted'] as const).map((k) => (
                      <td key={k} className="px-3 py-3 text-right">{inr(data.totals[k])}</td>
                    ))}
                    <td className={`px-3 py-3 text-right ${data.totals.diff < 0 ? 'text-error' : ''}`}>{signed(data.totals.diff)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <div className="space-y-4">
          {active ? (
            <ReviewPanel key={active.id} shop={active} date={date} />
          ) : (
            data && (
              <section className="panel p-4 text-body-sm text-on-surface-variant">
                No differences to review for this day.
              </section>
            )
          )}
          {summary && <DepositPanel date={date} toBank={summary.toBank} deposited={summary.deposited} />}
          {!!data?.deposits.length && (
            <section className="panel p-4">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Deposits recorded</h3>
              <ul className="space-y-1 text-body-sm">
                {data.deposits.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2">
                    <span>{d.bank}{d.reference ? ` · ${d.reference}` : ''}</span>
                    <span className="font-medium">{inr(d.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
