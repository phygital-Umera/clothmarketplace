import {Field, PageHeader} from '@/components/ui';
import FormDialog from '@/components/ui/FormDialog';
import useCurrentUser from '@/hooks/useCurrentUser';
import {
  useCreateTransferRequest,
  useDispatchTransfer,
  useReceiveTransfer,
  useShopTransfers,
  useTransferShops,
  useTransferVariants,
} from '@/lib/react-query/queriesAndMutations/stockTransfer';
import {StockTransfer, TRANSFER_REASONS, TransferStatus, TransferVariant} from '@/types/stockTransfer';
import {getErrorMessage} from '@/utils/axios';
import {Search, X} from 'lucide-react';
import {Fragment, useEffect, useMemo, useRef, useState} from 'react';

type Props = {panel?: string};
type Tab = 'REQUEST' | 'DISPATCH' | 'HISTORY';

const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dateOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'}) : '—';

const STATUS_PILL: Record<TransferStatus, {label: string; cls: string}> = {
  REQUESTED: {label: 'Awaiting approval', cls: 'bg-[#F6E6C8] text-[#8A5A12]'},
  APPROVED: {label: 'Approved', cls: 'bg-[#E4E9F4] text-[#2F4A7A]'},
  DISPATCHED: {label: 'In transit', cls: 'bg-[#E4E9F4] text-[#2F4A7A]'},
  RECEIVED: {label: 'Received', cls: 'bg-[#E3EEDD] text-[#3F6B3A]'},
  SHORT: {label: 'Received short', cls: 'bg-[#F7DEDE] text-[#9B2C2C]'},
  REJECTED: {label: 'Rejected', cls: 'bg-[#F7DEDE] text-[#9B2C2C]'},
};

function StatusPill({status}: {status: TransferStatus}) {
  const s = STATUS_PILL[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${s.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const qtyOf = (i: StockTransfer['items'][number]) => i.approvedQty ?? i.requestedQty;

/** A small printable pick list for the shop floor */
const printPickList = (t: StockTransfer) => {
  const w = window.open('', '_blank', 'width=720,height=640');
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]!);
  const rows = t.items
    .filter((i) => qtyOf(i) > 0)
    .map(
      (i) =>
        `<tr><td>${esc(i.productName)}</td><td>${esc(i.size)} / ${esc(i.color)}</td><td>${esc(i.variantSku)}</td><td style="text-align:right">${qtyOf(i)}</td><td>&#9744;</td></tr>`,
    )
    .join('');
  w.document.write(`<!doctype html><html><head><title>Pick list ${esc(t.transferNumber)}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#1F1B1D}h1{font-size:18px;margin:0 0 4px}
    p{margin:0 0 16px;color:#555;font-size:13px}table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{font-size:11px;text-transform:uppercase;color:#666}</style>
    </head><body><h1>Pick list · ${esc(t.transferNumber)}</h1>
    <p>${esc(t.fromShop?.name ?? '')} → ${esc(t.toShop.name)} · ${t.units} units · approved by ${esc(t.approvedBy ?? '—')}</p>
    <table><thead><tr><th>Item</th><th>Size / colour</th><th>SKU</th><th style="text-align:right">Qty</th><th>Picked</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`);
  w.document.close();
  w.focus();
  w.print();
};

// ---------------------------------------------------------------- request form

type Line = TransferVariant & {qty: string};

function NewRequest({panel}: {panel: string}) {
  const {data: me} = useCurrentUser();
  const {data: shops} = useTransferShops(panel);
  const create = useCreateTransferRequest(panel);
  const [fromShopId, setFromShopId] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if (!searchOpen) return;
    const close = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [searchOpen]);

  const lowStock = useTransferVariants(panel, undefined);
  const found = useTransferVariants(panel, debounced, debounced.length >= 2);

  const addLine = (v: TransferVariant) => {
    setLines((cur) => (cur.some((l) => l.variantId === v.variantId) ? cur : [...cur, {...v, qty: String(v.suggestedQty)}]));
    setErrors((e) => ({...e, items: ''}));
  };
  const addAllLow = () => (lowStock.data ?? []).forEach(addLine);
  const foreignShop = useMemo(() => lines.find((l) => !l.own)?.ownerShopId ?? null, [lines]);

  // Items the shop does not carry come from the shop that has them
  useEffect(() => {
    if (foreignShop) setFromShopId(foreignShop);
  }, [foreignShop]);

  const reset = () => {
    setLines([]);
    setReason('');
    setNote('');
    setNeededBy('');
    setFromShopId('');
    setErrors({});
    setFormError('');
  };

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!lines.length) errs.items = 'Add at least one item';
    if (lines.some((l) => !(Number(l.qty) >= 1) || !Number.isInteger(Number(l.qty))))
      errs.items = 'Every quantity must be a whole number of 1 or more';
    if (!reason) errs.reason = 'Select a reason';
    if (neededBy && neededBy < todayKey()) errs.neededBy = 'Needed-by date cannot be in the past';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setFormError('');
    create.mutate(
      {
        fromShopId: fromShopId || null,
        neededBy: neededBy || undefined,
        reason,
        note: note.trim() || undefined,
        items: lines.map((l) => ({variantId: l.variantId, qty: Number(l.qty)})),
      },
      {
        onSuccess: reset,
        onError: (err: any) => {
          const list = err?.response?.data?.errors as Array<{field: string; message: string}> | undefined;
          if (list?.length) setErrors(Object.fromEntries(list.map((e) => [e.field, e.message])));
          setFormError(getErrorMessage(err, 'Could not send the request'));
        },
      },
    );
  };

  const cell = 'px-3 py-3';

  return (
    <section className="panel min-w-0" aria-labelledby="new-request">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-300 px-4 py-3">
        <h2 id="new-request" className="font-serif text-headline-sm text-burgundy">
          New request
        </h2>
        <span className="text-[11px] text-outline">Goes to Branch Admin for approval</span>
      </div>

      <div className="grid gap-3 px-4 pt-4 sm:grid-cols-2">
        <Field label="Request from" htmlFor="tr-from" required error={errors.fromShopId}>
          <select
            id="tr-from"
            className="field-input"
            value={fromShopId}
            disabled={!!foreignShop}
            onChange={(e) => setFromShopId(e.target.value)}
          >
            <option value="">
              Any shop in {me?.branch?.name ?? 'the branch'} (branch admin picks)
            </option>
            {shops?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Needed by" htmlFor="tr-needed" error={errors.neededBy}>
          <input
            id="tr-needed"
            type="date"
            min={todayKey()}
            className="field-input"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4 overflow-x-auto border-y border-ivory-300">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ivory-300 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              <th scope="col" className="px-4 py-3">Variant</th>
              <th scope="col" className={`${cell} text-center`}>I have</th>
              <th scope="col" className={`${cell} text-center`}>Sold 30 d</th>
              <th scope="col" className={cell}>Available elsewhere</th>
              <th scope="col" className={`${cell} text-right`}>Request qty</th>
              <th scope="col" className="w-8 py-3"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200 text-body-sm text-espresso">
            {!lines.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-outline">
                  Add low-stock items or search for an item below.
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr key={l.variantId}>
                <td className="px-4 py-3">
                  <p className="font-medium leading-tight">{l.productName}</p>
                  <p className="text-[11px] text-outline">
                    {l.size} · {l.color} · {l.variantSku}
                  </p>
                  {!l.own && <p className="text-[11px] text-burgundy">New to your shop</p>}
                </td>
                <td className={`${cell} text-center ${l.have <= l.threshold ? 'font-semibold text-error' : ''}`}>{l.have}</td>
                <td className={`${cell} text-center`}>{l.sold30}</td>
                <td className={cell}>
                  {l.elsewhere ? (
                    <span>
                      {l.elsewhere.qty} · <span className="text-burgundy">{l.elsewhere.shopName}</span>
                    </span>
                  ) : (
                    <span className="text-outline">None in branch</span>
                  )}
                </td>
                <td className={`${cell} text-right`}>
                  <input
                    aria-label={`Request quantity for ${l.productName} ${l.size}`}
                    inputMode="numeric"
                    className="w-16 border border-ivory-300 bg-ivory-100 px-2 py-1 text-right focus:border-burgundy focus:outline-none"
                    value={l.qty}
                    onChange={(e) =>
                      setLines((cur) =>
                        cur.map((x) => (x.variantId === l.variantId ? {...x, qty: e.target.value.replace(/\D/g, '')} : x)),
                      )
                    }
                  />
                </td>
                <td className="py-3 pr-2">
                  <button
                    type="button"
                    className="btn-icon h-7 w-7"
                    aria-label={`Remove ${l.productName}`}
                    onClick={() => setLines((cur) => cur.filter((x) => x.variantId !== l.variantId))}
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-start gap-3 px-4 py-3">
        <button
          type="button"
          className="btn-ghost px-3 py-2"
          disabled={lowStock.isLoading || !lowStock.data?.length}
          onClick={addAllLow}
          title={!lowStock.data?.length ? 'No low-stock items right now' : undefined}
        >
          + Add all low-stock items{lowStock.data?.length ? ` (${lowStock.data.length})` : ''}
        </button>
        <div ref={searchRef} className="relative min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            aria-label="Search an item to add"
            placeholder="Search item or SKU to add…"
            className="field-input py-2 pl-9"
            value={search}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
          />
          {searchOpen && debounced.length >= 2 && (
            <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto border border-ivory-300 bg-white shadow-lg">
              {found.isLoading && <li className="px-3 py-2 text-body-sm text-outline">Searching…</li>}
              {found.data?.length === 0 && <li className="px-3 py-2 text-body-sm text-outline">No items found</li>}
              {found.data?.map((v) => (
                <li key={v.variantId}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-body-sm hover:bg-ivory-100"
                    onClick={() => {
                      addLine(v);
                      setSearch('');
                      setSearchOpen(false);
                    }}
                  >
                    <span className="font-medium text-espresso">{v.productName}</span>{' '}
                    <span className="text-outline">
                      {v.size} · {v.color} · {v.own ? `you have ${v.have}` : 'not in your shop'}
                      {v.elsewhere ? ` · ${v.elsewhere.qty} at ${v.elsewhere.shopName}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {errors.items && (
        <p role="alert" className="field-error px-4">
          {errors.items}
        </p>
      )}

      <div className="grid gap-3 border-t border-ivory-300 px-4 py-4 sm:grid-cols-2">
        <Field label="Reason" htmlFor="tr-reason" required error={errors.reason}>
          <select
            id="tr-reason"
            className="field-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={!!errors.reason}
          >
            <option value="">Select a reason</option>
            {TRANSFER_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Note" htmlFor="tr-note">
          <input
            id="tr-note"
            className="field-input"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for the branch admin"
          />
        </Field>
      </div>
      {formError && (
        <p role="alert" className="field-error px-4">
          {formError}
        </p>
      )}
      <div className="flex justify-end gap-2 px-4 pb-4 pt-2">
        <button type="button" className="btn-ghost" onClick={reset} disabled={create.isPending}>
          Clear
        </button>
        <button type="button" className="btn-primary" onClick={submit} disabled={create.isPending}>
          {create.isPending ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- cards

function DispatchCard({panel, t}: {panel: string; t: StockTransfer}) {
  const dispatch = useDispatchTransfer(panel);
  return (
    <div className="border-b border-ivory-200 px-4 py-4 last:border-b-0">
      <p className="font-medium text-espresso">
        {t.transferNumber} → {t.toShop.name}
      </p>
      <p className="text-[11px] text-outline">
        Approved by {t.approvedBy ?? '—'} · {t.units} units
        {t.neededBy ? ` · needed by ${dateOf(t.neededBy)}` : ''}
      </p>
      <ul className="mt-3 space-y-1.5 text-body-sm">
        {t.items
          .filter((i) => qtyOf(i) > 0)
          .map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="text-espresso">
                {i.productName} {i.size} / {i.color}
              </span>
              <span className="font-semibold">{qtyOf(i)}</span>
            </li>
          ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost px-3 py-2" onClick={() => printPickList(t)}>
          Print pick list
        </button>
        <button
          type="button"
          className="btn-primary px-3 py-2"
          disabled={dispatch.isPending}
          onClick={() => dispatch.mutate(t.id)}
        >
          {dispatch.isPending ? 'Saving…' : 'Mark dispatched'}
        </button>
      </div>
    </div>
  );
}

function ReceiveDialog({panel, t, onClose}: {panel: string; t: StockTransfer; onClose: () => void}) {
  const receive = useReceiveTransfer(panel);
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(t.items.map((i) => [i.id, String(i.dispatchedQty ?? 0)])),
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const short = t.items.reduce((s, i) => s + Math.max(0, (i.dispatchedQty ?? 0) - (Number(counts[i.id]) || 0)), 0);

  const submit = () => {
    const bad = t.items.find((i) => counts[i.id] === '' || (Number(counts[i.id]) || 0) > (i.dispatchedQty ?? 0));
    if (bad) return setError(`Check the count for ${bad.productName}: 0 to ${bad.dispatchedQty ?? 0}.`);
    setError('');
    receive.mutate(
      {id: t.id, data: {items: t.items.map((i) => ({itemId: i.id, receivedQty: Number(counts[i.id]) || 0})), note: note.trim() || undefined}},
      {onSuccess: onClose, onError: (err) => setError(getErrorMessage(err, 'Could not save the count'))},
    );
  };

  return (
    <FormDialog
      open
      title={`Receive & count · ${t.transferNumber}`}
      onClose={onClose}
      onSubmit={submit}
      saving={receive.isPending}
      error={error}
      saveLabel="Add to stock"
    >
      <p className="text-body-sm text-on-surface-variant">
        From {t.fromShop?.name ?? '—'}, dispatched {dateOf(t.dispatchedAt)}. Count what actually arrived.
      </p>
      <table className="w-full text-body-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <th scope="col" className="py-2 text-left">Item</th>
            <th scope="col" className="py-2 text-right">Sent</th>
            <th scope="col" className="py-2 text-right">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ivory-200">
          {t.items.map((i) => (
            <tr key={i.id}>
              <td className="py-2 pr-2">
                {i.productName}
                <span className="block text-[11px] text-outline">
                  {i.size} · {i.color}
                </span>
              </td>
              <td className="py-2 text-right">{i.dispatchedQty ?? 0}</td>
              <td className="py-2 text-right">
                <input
                  aria-label={`Received quantity of ${i.productName}`}
                  inputMode="numeric"
                  className="w-16 border border-ivory-300 bg-ivory-100 px-2 py-1 text-right focus:border-burgundy focus:outline-none"
                  value={counts[i.id]}
                  onChange={(e) => setCounts((c) => ({...c, [i.id]: e.target.value.replace(/\D/g, '')}))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {short > 0 && (
        <p className="text-body-sm text-error">{short} unit(s) short. The Branch Admin will see the difference.</p>
      )}
      <Field label="Note" htmlFor="rc-note">
        <input id="rc-note" className="field-input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

function MyRequests({panel, onReceive}: {panel: string; onReceive: (t: StockTransfer) => void}) {
  const {data, isLoading} = useShopTransfers(panel, 'MINE');
  const items = data?.items.slice(0, 8) ?? [];
  const sub = (t: StockTransfer) => {
    const from = t.fromShop?.name ?? 'any shop';
    if (t.status === 'DISPATCHED') return `${t.units} units from ${from} · on the way`;
    if (t.status === 'REJECTED') return `${t.requestedUnits} units · ${t.rejectReason ?? 'rejected'}`;
    if (t.status === 'SHORT') return `${t.units} of ${t.units + t.shortUnits} units from ${from}`;
    return `${t.units} units from ${from}`;
  };
  return (
    <section className="panel" aria-labelledby="my-requests">
      <h2 id="my-requests" className="border-b border-ivory-300 px-4 py-3 font-serif text-headline-sm text-burgundy">
        My requests
      </h2>
      {isLoading && <p className="px-4 py-4 text-body-sm text-outline">Loading…</p>}
      {!isLoading && !items.length && <p className="px-4 py-4 text-body-sm text-outline">No requests yet.</p>}
      <ul className="divide-y divide-ivory-200">
        {items.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-espresso">{t.transferNumber}</p>
              <p className="text-[11px] text-outline">{sub(t)}</p>
            </div>
            {t.status === 'DISPATCHED' ? (
              <button type="button" className="btn-primary shrink-0 px-3 py-2" onClick={() => onReceive(t)}>
                Receive &amp; count
              </button>
            ) : (
              <StatusPill status={t.status} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ToDispatchList({panel, compact}: {panel: string; compact?: boolean}) {
  const {data, isLoading} = useShopTransfers(panel, 'DISPATCH');
  const items = data?.items ?? [];
  return (
    <section className="panel" aria-labelledby={compact ? 'to-dispatch-side' : 'to-dispatch'}>
      <h2
        id={compact ? 'to-dispatch-side' : 'to-dispatch'}
        className="border-b border-ivory-300 px-4 py-3 font-serif text-headline-sm text-burgundy"
      >
        To dispatch
      </h2>
      {isLoading && <p className="px-4 py-4 text-body-sm text-outline">Loading…</p>}
      {!isLoading && !items.length && (
        <p className="px-4 py-4 text-body-sm text-outline">Nothing to send. Approved requests from other shops show here.</p>
      )}
      {(compact ? items.slice(0, 2) : items).map((t) => (
        <DispatchCard key={t.id} panel={panel} t={t} />
      ))}
    </section>
  );
}

function History({panel}: {panel: string}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const {data, isLoading} = useShopTransfers(panel, 'HISTORY', debounced || undefined);
  const myShop = data?.shopId;
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="panel">
      <div className="border-b border-ivory-300 px-4 py-3">
        <div className="relative max-w-sm">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            aria-label="Search transfers"
            placeholder="Search TRF number or item…"
            className="field-input py-2 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ivory-300 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              <th scope="col" className="px-4 py-3">Transfer</th>
              <th scope="col" className="px-3 py-3">Date</th>
              <th scope="col" className="px-3 py-3">Direction</th>
              <th scope="col" className="px-3 py-3">Reason</th>
              <th scope="col" className="px-3 py-3 text-right">Units</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200 text-body-sm text-espresso">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-outline">Loading…</td>
              </tr>
            )}
            {data && !data.items.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-outline">No transfers found.</td>
              </tr>
            )}
            {data?.items.map((t) => {
              const incoming = t.toShop.id === myShop;
              return (
                <Fragment key={t.id}>
                  <tr
                    className="cursor-pointer hover:bg-ivory-50"
                    onClick={() => setOpen(open === t.id ? null : t.id)}
                    aria-expanded={open === t.id}
                  >
                    <td className="px-4 py-3 font-medium">{t.transferNumber}</td>
                    <td className="px-3 py-3">{dateOf(t.createdAt)}</td>
                    <td className="px-3 py-3">
                      {incoming ? `In from ${t.fromShop?.name ?? 'any shop'}` : `Out to ${t.toShop.name}`}
                    </td>
                    <td className="px-3 py-3">{t.reason}</td>
                    <td className="px-3 py-3 text-right">{t.units}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={t.status} />
                    </td>
                  </tr>
                  {open === t.id && (
                    <tr className="bg-ivory-50">
                      <td colSpan={6} className="px-4 py-3">
                        <ul className="space-y-1 text-body-sm">
                          {t.items.map((i) => (
                            <li key={i.id} className="flex flex-wrap justify-between gap-2">
                              <span>
                                {i.productName} · {i.size} / {i.color}
                              </span>
                              <span className="text-outline">
                                asked {i.requestedQty}
                                {i.approvedQty !== null ? ` · approved ${i.approvedQty}` : ''}
                                {i.dispatchedQty !== null ? ` · sent ${i.dispatchedQty}` : ''}
                                {i.receivedQty !== null ? ` · received ${i.receivedQty}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {(t.rejectReason || t.receiveNote || t.note) && (
                          <p className="mt-2 text-[11px] text-outline">
                            {t.note ? `Note: ${t.note}. ` : ''}
                            {t.rejectReason ? `Rejected: ${t.rejectReason}. ` : ''}
                            {t.receiveNote ? `Receiving note: ${t.receiveNote}.` : ''}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- page

export default function StockTransferPage({panel = 'shop-admin'}: Props) {
  const [tab, setTab] = useState<Tab>('REQUEST');
  const [receiving, setReceiving] = useState<StockTransfer | null>(null);
  const {data: dispatchList} = useShopTransfers(panel, 'DISPATCH');
  const toDispatch = dispatchList?.counts.toDispatch ?? 0;

  const tabs: Array<{key: Tab; label: string; count?: number}> = [
    {key: 'REQUEST', label: 'Request stock'},
    {key: 'DISPATCH', label: 'To dispatch', count: toDispatch},
    {key: 'HISTORY', label: 'History'},
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{label: 'Products & stock'}, {label: 'Transfer'}]}
        title="Stock transfer"
        subtitle="Request stock you need, or prepare and dispatch stock another shop asked for."
      />

      <div role="tablist" aria-label="Stock transfer" className="mb-5 flex gap-1 overflow-x-auto border-b border-ivory-300">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-label-caps uppercase ${
              tab === t.key ? 'border-burgundy text-burgundy' : 'border-transparent text-on-surface-variant hover:text-burgundy'
            }`}
          >
            {t.label}
            {!!t.count && (
              <span className="min-w-[18px] rounded-sm bg-ivory-200 px-1.5 text-[10px] font-bold text-espresso">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'REQUEST' && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <NewRequest panel={panel} />
          <div className="space-y-5">
            <ToDispatchList panel={panel} compact />
            <MyRequests panel={panel} onReceive={setReceiving} />
          </div>
        </div>
      )}
      {tab === 'DISPATCH' && (
        <div className="max-w-3xl">
          <ToDispatchList panel={panel} />
        </div>
      )}
      {tab === 'HISTORY' && <History panel={panel} />}

      {receiving && <ReceiveDialog panel={panel} t={receiving} onClose={() => setReceiving(null)} />}
    </div>
  );
}
