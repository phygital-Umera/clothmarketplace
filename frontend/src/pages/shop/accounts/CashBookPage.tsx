import {OpenCounterModal} from '@/components/Bills/CounterModals';
import {Field, PageHeader} from '@/components/ui';
import FormDialog from '@/components/ui/FormDialog';
import {
  useAddCashEntry,
  useCashBook,
  useCloseCashDay,
  useShopBankDeposit,
} from '@/lib/react-query/queriesAndMutations/cashBook';
import {CashBookDay} from '@/types/cashBook';
import {getErrorMessage} from '@/utils/axios';
import {inr} from '@/utils/money';
import {useEffect, useMemo, useState} from 'react';

type Props = {panel?: string};

const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit', hour12: true}).toUpperCase();
const dayTitle = (key: string, isToday: boolean) => {
  const label = new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return isToday ? `Today · ${label}` : label;
};
const round2 = (v: number) => Math.round(v * 100) / 100;
const fieldErrorsOf = (err: any) =>
  Object.fromEntries(
    ((err?.response?.data?.errors as Array<{field: string; message: string}>) ?? []).map((e) => [
      e.field,
      e.message,
    ]),
  ) as Record<string, string>;

function Kpi({label, value, note}: {label: string; value: string; note: string}) {
  return (
    <div className="panel p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="mt-2 font-serif text-[26px] leading-none text-espresso">{value}</p>
      <p className="mt-1.5 text-[11px] text-outline">{note}</p>
    </div>
  );
}

// ---------------------------------------------------------------- dialogs

function CashInOutDialog({panel, open, onClose}: {panel: string; open: boolean; onClose: () => void}) {
  const add = useAddCashEntry(panel);
  const [type, setType] = useState<'IN' | 'OUT'>('OUT');
  const [amount, setAmount] = useState('');
  const [particulars, setParticulars] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setType('OUT');
    setAmount('');
    setParticulars('');
    setReference('');
    setError('');
    setFieldErrors({});
  }, [open]);

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!(Number(amount) > 0)) errs.amount = 'Enter an amount more than 0';
    if (particulars.trim().length < 2) errs.particulars = 'Say what the cash is for';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setError('');
    add.mutate(
      {type, amount: Number(amount), particulars: particulars.trim(), reference: reference.trim() || undefined},
      {
        onSuccess: onClose,
        onError: (err) => {
          setFieldErrors(fieldErrorsOf(err));
          setError(getErrorMessage(err, 'Could not save'));
        },
      },
    );
  };

  return (
    <FormDialog open={open} title="Cash in / out" onClose={onClose} onSubmit={submit} saving={add.isPending} error={error}>
      <div role="radiogroup" aria-label="Direction" className="grid grid-cols-2 gap-2">
        {(['IN', 'OUT'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`border px-3 py-2.5 text-label-caps uppercase ${
              type === t ? 'border-burgundy bg-blush/30 text-burgundy' : 'border-ivory-300 text-on-surface-variant'
            }`}
          >
            {t === 'IN' ? 'Cash in (to drawer)' : 'Cash out (from drawer)'}
          </button>
        ))}
      </div>
      <Field label="Amount" htmlFor="ce-amount" required error={fieldErrors.amount}>
        <input
          id="ce-amount"
          type="number"
          min={0}
          step="0.01"
          className="field-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={!!fieldErrors.amount}
        />
      </Field>
      <Field
        label="Particulars"
        htmlFor="ce-part"
        required
        error={fieldErrors.particulars}
        hint={type === 'IN' ? 'e.g. Change brought from owner' : 'e.g. Porter charges, handed to owner'}
      >
        <input
          id="ce-part"
          className="field-input"
          maxLength={120}
          value={particulars}
          onChange={(e) => setParticulars(e.target.value)}
          aria-invalid={!!fieldErrors.particulars}
        />
      </Field>
      <Field label="Reference" htmlFor="ce-ref">
        <input id="ce-ref" className="field-input" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

function BankDepositDialog({
  panel,
  open,
  onClose,
  expected,
}: {
  panel: string;
  open: boolean;
  onClose: () => void;
  expected: number;
}) {
  const deposit = useShopBankDeposit(panel);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setBankName('');
    setReference('');
    setError('');
    setFieldErrors({});
  }, [open]);

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!(Number(amount) > 0)) errs.amount = 'Enter an amount more than 0';
    else if (Number(amount) > expected) errs.amount = `Only ${inr(expected)} is expected in the drawer`;
    if (bankName.trim().length < 2) errs.bankName = 'Enter the bank';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setError('');
    deposit.mutate(
      {amount: Number(amount), bankName: bankName.trim(), reference: reference.trim() || undefined},
      {
        onSuccess: onClose,
        onError: (err) => {
          setFieldErrors(fieldErrorsOf(err));
          setError(getErrorMessage(err, 'Could not save the deposit'));
        },
      },
    );
  };

  return (
    <FormDialog open={open} title="Bank deposit" onClose={onClose} onSubmit={submit} saving={deposit.isPending} error={error} saveLabel="Record deposit">
      <p className="text-body-sm text-on-surface-variant">
        Cash taken from the drawer to the bank during the day. {inr(expected)} is expected in the drawer now.
      </p>
      <Field label="Amount" htmlFor="bd-amount" required error={fieldErrors.amount}>
        <input id="bd-amount" type="number" min={0} step="0.01" className="field-input" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!fieldErrors.amount} />
      </Field>
      <Field label="Bank" htmlFor="bd-bank" required error={fieldErrors.bankName}>
        <input id="bd-bank" className="field-input" maxLength={80} value={bankName} onChange={(e) => setBankName(e.target.value)} aria-invalid={!!fieldErrors.bankName} />
      </Field>
      <Field label="Deposit slip / UTR" htmlFor="bd-ref">
        <input id="bd-ref" className="field-input" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

// ---------------------------------------------------------------- day close

function DayClosePanel({panel, day}: {panel: string; day: CashBookDay}) {
  const close = useCloseCashDay(panel);
  const session = day.session!;
  const closed = session.status === 'CLOSED';
  const notes = day.denominations;
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [deposit, setDeposit] = useState('');
  const [float, setFloat] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // A closed day shows what was counted
  useEffect(() => {
    if (closed) {
      const saved = session.denominations ?? {};
      setCounts(Object.fromEntries(notes.map((n) => [String(n), String(saved[String(n)] ?? 0)])));
      setDeposit(String(session.depositAmount ?? 0));
      setFloat(String(session.keptFloat ?? 0));
      setReason(session.differenceReason ?? '');
    }
  }, [closed, session, notes]);

  const counted = useMemo(
    () => round2(notes.reduce((s, n) => s + n * (Number(counts[String(n)]) || 0), 0)),
    [counts, notes],
  );
  const expected = closed ? (session.expectedCash ?? day.expected) : day.expected;
  const difference = round2(counted - expected);
  const anyCounted = notes.some((n) => counts[String(n)] !== undefined && counts[String(n)] !== '');

  // Deposit and float always add up to the counted cash
  const onCountsChange = (note: number, value: string) => {
    const next = {...counts, [String(note)]: value.replace(/\D/g, '')};
    setCounts(next);
    const total = round2(notes.reduce((s, n) => s + n * (Number(next[String(n)]) || 0), 0));
    const keep = float === '' ? Math.min(session.openingCash, total) : Math.min(Number(float) || 0, total);
    setFloat(String(keep));
    setDeposit(String(round2(total - keep)));
  };
  const onDeposit = (v: string) => {
    setDeposit(v);
    setFloat(String(Math.max(0, round2(counted - (Number(v) || 0)))));
  };
  const onFloat = (v: string) => {
    setFloat(v);
    setDeposit(String(Math.max(0, round2(counted - (Number(v) || 0)))));
  };

  const submit = () => {
    setError('');
    if (!anyCounted) return setError('Count the notes in the drawer first.');
    if (round2((Number(deposit) || 0) + (Number(float) || 0)) !== counted)
      return setError(`Deposit and float must add up to ${inr(counted)}.`);
    if (difference !== 0 && reason.trim().length < 3)
      return setError('Explain the difference before closing.');
    close.mutate(
      {
        denominations: Object.fromEntries(notes.map((n) => [String(n), Number(counts[String(n)]) || 0])),
        depositAmount: Number(deposit) || 0,
        keptFloat: Number(float) || 0,
        differenceReason: difference !== 0 ? reason.trim() : undefined,
      },
      {onError: (err) => setError(getErrorMessage(err, 'Could not close the day'))},
    );
  };

  const inputCls =
    'w-16 border border-ivory-300 bg-ivory-100 px-2 py-1 text-right text-body-sm text-espresso focus:border-burgundy focus:outline-none disabled:opacity-70';

  return (
    <section className="panel" aria-labelledby="day-close-title">
      <div className="flex items-center justify-between border-b border-ivory-300 px-4 py-3">
        <h2 id="day-close-title" className="font-serif text-headline-sm text-burgundy">
          Day close
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            closed ? 'bg-[#E3EEDD] text-[#3F6B3A]' : 'bg-[#F6E6C8] text-[#8A5A12]'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {closed ? 'Closed' : 'Open'}
        </span>
      </div>

      <div className="px-4 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          Count cash by notes
        </p>
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 text-body-sm">
              <label htmlFor={`note-${n}`} className="text-espresso">
                ₹{n} ×
              </label>
              <input
                id={`note-${n}`}
                inputMode="numeric"
                className={inputCls}
                value={counts[String(n)] ?? ''}
                placeholder="0"
                disabled={closed || !day.isToday}
                onChange={(e) => onCountsChange(n, e.target.value)}
              />
              <span className="min-w-[64px] text-right text-espresso">
                {inr(n * (Number(counts[String(n)]) || 0))}
              </span>
            </div>
          ))}
        </div>

        <dl className="mt-4 space-y-1.5 border-t border-ivory-300 pt-3 text-body-sm">
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Counted</dt>
            <dd className="font-semibold text-espresso">{inr(counted)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Expected</dt>
            <dd className="font-semibold text-espresso">{inr(expected)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Difference</dt>
            <dd
              className={`font-semibold ${
                !anyCounted ? 'text-outline' : difference === 0 ? 'text-[#3F6B3A]' : 'text-error'
              }`}
            >
              {anyCounted ? (difference === 0 ? `${inr(0)} ✓` : `${difference > 0 ? '+' : ''}${inr(difference)}`) : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-4 space-y-3 border-t border-ivory-300 pt-4">
          <Field label="Deposit to bank / hand to owner" htmlFor="dc-deposit">
            <input
              id="dc-deposit"
              type="number"
              min={0}
              step="0.01"
              className="field-input"
              value={deposit}
              disabled={closed || !day.isToday}
              onChange={(e) => onDeposit(e.target.value)}
            />
          </Field>
          <Field label="Keep as tomorrow's opening float" htmlFor="dc-float">
            <input
              id="dc-float"
              type="number"
              min={0}
              step="0.01"
              className="field-input"
              value={float}
              disabled={closed || !day.isToday}
              onChange={(e) => onFloat(e.target.value)}
            />
          </Field>
          {(difference !== 0 && anyCounted) || (closed && session.differenceReason) ? (
            <Field label="Reason for difference" htmlFor="dc-reason" required={!closed}>
              <textarea
                id="dc-reason"
                rows={2}
                maxLength={300}
                className="field-input"
                value={reason}
                disabled={closed}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          ) : null}
        </div>

        {error && (
          <p role="alert" className="field-error mt-3">
            {error}
          </p>
        )}

        {closed ? (
          <p className="mt-4 text-body-sm text-on-surface-variant">
            Closed {session.closedAt ? timeOf(session.closedAt) : ''}
            {session.closedBy ? ` by ${session.closedBy}` : ''}. Bills for the day are locked.
            {session.reviewStatus === 'ACCEPTED' || !session.difference
              ? ''
              : ' The difference is waiting for the Branch Admin.'}
          </p>
        ) : day.isToday ? (
          <button
            type="button"
            className="btn-primary mt-4 w-full"
            disabled={close.isPending}
            onClick={submit}
          >
            {close.isPending ? 'Closing…' : 'Close day & lock bills'}
          </button>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- page

export default function CashBookPage({panel = 'shop-admin'}: Props) {
  const [date, setDate] = useState(todayKey());
  const isTodaySelected = date === todayKey();
  const {data: day, isLoading, isError, error, refetch} = useCashBook(panel, isTodaySelected ? undefined : date);
  const [dialog, setDialog] = useState<null | 'cash' | 'bank' | 'open'>(null);

  const session = day?.session ?? null;
  const canMoveCash = !!day?.isToday && session?.status === 'OPEN';

  return (
    <div>
      <PageHeader
        breadcrumbs={[{label: 'Accounts'}, {label: 'Cash book'}]}
        title="Cash book & day close"
        subtitle="Every rupee in and out of the counter drawer. Close the day to lock today's bills."
        actions={
          <>
            <button
              type="button"
              className="btn-ghost"
              disabled={!canMoveCash}
              title={canMoveCash ? undefined : 'Open the counter to record cash'}
              onClick={() => setDialog('cash')}
            >
              Cash in / out
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={!canMoveCash}
              title={canMoveCash ? undefined : 'Open the counter to record cash'}
              onClick={() => setDialog('bank')}
            >
              Bank deposit
            </button>
          </>
        }
      />

      {isError && (
        <div className="panel mb-4 p-4 text-body-sm text-error">
          {getErrorMessage(error, 'Could not load the cash book')}{' '}
          <button type="button" className="btn-text" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Opening cash"
          value={day ? inr(day.openingCash) : '—'}
          note={session ? `Counted ${timeOf(session.openedAt)}` : 'Counter not opened'}
        />
        <Kpi
          label="Cash in"
          value={day ? inr(day.cashIn) : '—'}
          note={day ? `${day.cashBills} cash bill${day.cashBills === 1 ? '' : 's'}` : ''}
        />
        <Kpi
          label="Cash out"
          value={day ? inr(day.cashOut) : '—'}
          note={day ? `${day.outEntries} entr${day.outEntries === 1 ? 'y' : 'ies'}` : ''}
        />
        <Kpi
          label="Expected in drawer"
          value={day ? inr(day.expected) : '—'}
          note={session?.status === 'CLOSED' ? `Counted ${inr(session.closingCash ?? 0)}` : 'Before counting'}
        />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="panel min-w-0" aria-labelledby="ledger-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory-300 px-4 py-3">
            <h2 id="ledger-title" className="font-serif text-headline-sm text-burgundy">
              {dayTitle(date, isTodaySelected)}
            </h2>
            <label className="sr-only" htmlFor="cash-date">
              Date
            </label>
            <input
              id="cash-date"
              type="date"
              max={todayKey()}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="field-input w-auto py-1.5"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-ivory-300 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th scope="col" className="px-4 py-3">Time</th>
                  <th scope="col" className="px-3 py-3">Particulars</th>
                  <th scope="col" className="px-3 py-3">Ref</th>
                  <th scope="col" className="px-3 py-3 text-right">Cash in</th>
                  <th scope="col" className="px-3 py-3 text-right">Cash out</th>
                  <th scope="col" className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200 text-body-sm text-espresso">
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-outline">
                      Loading cash book…
                    </td>
                  </tr>
                )}
                {day && !day.rows.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-outline">
                      {day.isToday ? (
                        <>
                          The counter is not open yet.{' '}
                          <button type="button" className="btn-text" onClick={() => setDialog('open')}>
                            Open counter
                          </button>
                        </>
                      ) : (
                        'No cash movement on this day.'
                      )}
                    </td>
                  </tr>
                )}
                {day?.rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-ivory-50">
                    <td className="whitespace-nowrap px-4 py-3">{timeOf(r.time)}</td>
                    <td className="px-3 py-3">
                      <p>{r.particulars}</p>
                      {r.sub && <p className="text-[11px] text-burgundy/80">{r.sub}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-on-surface-variant">{r.ref ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{r.cashIn ? inr(r.cashIn) : ''}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[#B4532A]">
                      {r.cashOut ? inr(r.cashOut) : ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{inr(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
              {day && day.rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-ivory-300 text-body-sm font-semibold text-espresso">
                    <td className="px-4 py-3" colSpan={3}>
                      Total
                    </td>
                    <td className="px-3 py-3 text-right">{inr(day.openingCash + day.cashIn)}</td>
                    <td className="px-3 py-3 text-right text-[#B4532A]">{inr(day.cashOut)}</td>
                    <td className="px-4 py-3 text-right">{inr(day.expected)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <div className="space-y-4">
          {day && session ? (
            <>
              <DayClosePanel key={session.id} panel={panel} day={day} />
              {day.isToday && session.status === 'CLOSED' && (
                <button type="button" className="btn-ghost w-full" onClick={() => setDialog('open')}>
                  Open counter again
                </button>
              )}
            </>
          ) : day ? (
            <section className="panel p-4">
              <h2 className="font-serif text-headline-sm text-burgundy">Day close</h2>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                {day.isToday
                  ? 'Open the counter with the cash in the drawer to start today’s cash book.'
                  : 'The counter was not opened on this day.'}
              </p>
              {day.isToday && (
                <button type="button" className="btn-primary mt-4 w-full" onClick={() => setDialog('open')}>
                  Open counter
                </button>
              )}
            </section>
          ) : null}
        </div>
      </div>

      <CashInOutDialog panel={panel} open={dialog === 'cash'} onClose={() => setDialog(null)} />
      <BankDepositDialog
        panel={panel}
        open={dialog === 'bank'}
        onClose={() => setDialog(null)}
        expected={day?.expected ?? 0}
      />
      {dialog === 'open' && (
        <OpenCounterModal
          panel={panel}
          defaultCash={day?.lastFloat}
          onClose={() => {
            setDialog(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
