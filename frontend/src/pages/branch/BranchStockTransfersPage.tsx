import {useEffect, useState} from 'react';
import {Search} from 'lucide-react';
import {PageHeader} from '@/components/ui';
import {
  useDecideTransfer,
  useStockTransfers,
  useStockTransferSummary,
  useTransferSources,
} from '@/lib/react-query/queriesAndMutations/stockTransfer';
import {StockTransfer, TransferStatus} from '@/types/stockTransfer';
import {getErrorMessage} from '@/utils/axios';

type TabType = 'ALL' | 'TO_APPROVE' | 'TO_DISPATCH' | 'IN_TRANSIT' | 'DONE';

const TABS: Array<{id: TabType; label: string}> = [
  {id: 'ALL', label: 'All'},
  {id: 'TO_APPROVE', label: 'To approve'},
  {id: 'TO_DISPATCH', label: 'To dispatch'},
  {id: 'IN_TRANSIT', label: 'In transit'},
  {id: 'DONE', label: 'Done'},
];

const STATUS: Record<TransferStatus, {label: string; cls: string}> = {
  REQUESTED: {label: 'Requested', cls: 'bg-[#F6E6C8] text-[#8A5A12]'},
  APPROVED: {label: 'Approved', cls: 'bg-[#E4E9F4] text-[#2F4A7A]'},
  DISPATCHED: {label: 'In transit', cls: 'bg-[#E4E9F4] text-[#2F4A7A]'},
  RECEIVED: {label: 'Received', cls: 'bg-[#E3EEDD] text-[#3F6B3A]'},
  SHORT: {label: 'Short', cls: 'bg-[#F7DEDE] text-[#9B2C2C]'},
  REJECTED: {label: 'Rejected', cls: 'bg-[#EFE6DC] text-[#7A6A5C]'},
};

const Pill = ({status}: {status: TransferStatus}) => (
  <span
    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS[status].cls}`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {STATUS[status].label}
  </span>
);

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'}) : '';

/** Approve (pick the source shop and quantities) or reject a shop's request */
function ApprovePanel({t}: {t: StockTransfer}) {
  const {data: sources, isLoading} = useTransferSources(t.id);
  const decide = useDecideTransfer();
  const [fromShopId, setFromShopId] = useState(t.fromShop?.id ?? '');
  const [qty, setQty] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Default source: the requested shop, else the shop holding the most units
  useEffect(() => {
    if (!sources?.length || fromShopId) return;
    const best = [...sources].sort(
      (a, b) => b.items.reduce((s, i) => s + i.available, 0) - a.items.reduce((s, i) => s + i.available, 0),
    )[0];
    if (best) setFromShopId(best.id);
  }, [sources, fromShopId]);

  const source = sources?.find((s) => s.id === fromShopId);
  useEffect(() => {
    if (!source) return;
    setQty(
      Object.fromEntries(
        t.items.map((i) => {
          const opt = source.items.find((o) => o.itemId === i.id);
          return [i.id, String(Math.min(i.requestedQty, opt?.variantId ? opt.available : 0))];
        }),
      ),
    );
  }, [source, t.items]);

  const approve = () => {
    setError('');
    if (!fromShopId) return setError('Choose the shop that will send the stock.');
    const items = t.items.map((i) => ({itemId: i.id, approvedQty: Number(qty[i.id]) || 0}));
    if (!items.some((i) => i.approvedQty > 0)) return setError('Approve at least one unit, or reject.');
    decide.mutate(
      {id: t.id, data: {decision: 'APPROVE', fromShopId, items}},
      {onError: (err) => setError(getErrorMessage(err, 'Could not approve'))},
    );
  };
  const reject = () => {
    setError('');
    if (reason.trim().length < 3) return setError('Give a reason for rejecting.');
    decide.mutate(
      {id: t.id, data: {decision: 'REJECT', reason: reason.trim()}},
      {onError: (err) => setError(getErrorMessage(err, 'Could not reject'))},
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="src-shop" className="field-label">
          Send from
        </label>
        <select
          id="src-shop"
          className="field-input"
          value={fromShopId}
          disabled={isLoading}
          onChange={(e) => setFromShopId(e.target.value)}
        >
          <option value="">{isLoading ? 'Loading shops…' : 'Choose a shop'}</option>
          {sources?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.items.reduce((sum, i) => sum + i.available, 0)} available)
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-body-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <th scope="col" className="py-1.5 text-left">Item</th>
            <th scope="col" className="py-1.5 text-right">Asked</th>
            <th scope="col" className="py-1.5 text-right">Has</th>
            <th scope="col" className="py-1.5 text-right">Approve</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ivory-200">
          {t.items.map((i) => {
            const opt = source?.items.find((o) => o.itemId === i.id);
            return (
              <tr key={i.id}>
                <td className="py-2 pr-2">
                  {i.productName}
                  <span className="block text-[11px] text-outline">
                    {i.size} · {i.color}
                  </span>
                </td>
                <td className="py-2 text-right">{i.requestedQty}</td>
                <td className={`py-2 text-right ${opt?.variantId ? '' : 'text-outline'}`}>
                  {source ? (opt?.variantId ? opt.available : 'n/a') : '—'}
                </td>
                <td className="py-2 text-right">
                  <input
                    aria-label={`Approved quantity of ${i.productName}`}
                    inputMode="numeric"
                    disabled={!opt?.variantId}
                    className="w-14 border border-ivory-300 bg-ivory-100 px-2 py-1 text-right focus:border-burgundy focus:outline-none disabled:opacity-50"
                    value={qty[i.id] ?? ''}
                    onChange={(e) => setQty((q) => ({...q, [i.id]: e.target.value.replace(/\D/g, '')}))}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rejecting && (
        <div>
          <label htmlFor="rej-reason" className="field-label">
            Reason for rejecting
          </label>
          <textarea
            id="rej-reason"
            rows={2}
            maxLength={300}
            className="field-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {rejecting ? (
          <>
            <button type="button" className="btn-ghost flex-1 px-3 py-2" onClick={() => setRejecting(false)}>
              Back
            </button>
            <button type="button" className="btn-primary flex-1 px-3 py-2" disabled={decide.isPending} onClick={reject}>
              Reject
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-ghost flex-1 px-3 py-2" onClick={() => setRejecting(true)}>
              Reject
            </button>
            <button type="button" className="btn-primary flex-1 px-3 py-2" disabled={decide.isPending} onClick={approve}>
              {decide.isPending ? 'Saving…' : 'Approve'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Details({t}: {t: StockTransfer}) {
  const steps = [
    {label: 'Requested', by: t.requestedBy, at: t.createdAt},
    t.approvedAt && {label: t.status === 'REJECTED' ? 'Rejected' : 'Approved', by: t.approvedBy, at: t.approvedAt},
    t.dispatchedAt && {label: 'Dispatched', by: t.dispatchedBy, at: t.dispatchedAt},
    t.receivedAt && {label: t.status === 'SHORT' ? `Received short by ${t.shortUnits}` : 'Received', by: t.receivedBy, at: t.receivedAt},
  ].filter(Boolean) as Array<{label: string; by: string | null; at: string}>;
  return (
    <div className="space-y-4">
      <ul className="space-y-1.5 text-body-sm">
        {t.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span>
              {i.productName} · {i.size} / {i.color}
            </span>
            <span className="whitespace-nowrap text-outline">
              {i.requestedQty}
              {i.approvedQty !== null ? ` → ${i.approvedQty}` : ''}
              {i.receivedQty !== null ? ` → ${i.receivedQty}` : ''}
            </span>
          </li>
        ))}
      </ul>
      <ol className="space-y-1 border-t border-ivory-300 pt-3 text-[12px] text-on-surface-variant">
        {steps.map((s) => (
          <li key={s.label}>
            <span className="font-medium text-espresso">{s.label}</span> · {when(s.at)}
            {s.by ? ` · ${s.by}` : ''}
          </li>
        ))}
      </ol>
      {(t.note || t.rejectReason || t.receiveNote) && (
        <p className="text-[12px] text-on-surface-variant">
          {t.note && <>Note: {t.note}. </>}
          {t.rejectReason && <>Rejected: {t.rejectReason}. </>}
          {t.receiveNote && <>Receiving note: {t.receiveNote}.</>}
        </p>
      )}
    </div>
  );
}

export default function BranchStockTransfersPage() {
  const [tab, setTab] = useState<TabType>('ALL');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {data: summary} = useStockTransferSummary();
  const {data, isLoading, isError, error} = useStockTransfers({tab, search: debounced || undefined});
  const transfers = data?.items ?? [];
  const active =
    transfers.find((t) => t.id === selectedId) ??
    transfers.find((t) => t.status === 'REQUESTED') ??
    transfers[0] ??
    null;

  const kpis = [
    {label: 'To approve', value: summary?.toApprove, note: 'Requested by your shops'},
    {label: 'To dispatch', value: summary?.toDispatch, note: 'Approved, not sent'},
    {label: 'In transit', value: summary?.inTransit, note: 'Dispatched, not received'},
    {label: 'Discrepancies', value: summary?.discrepancies, note: 'Received short', bad: true},
  ];

  return (
    <div className="pb-12">
      <PageHeader
        breadcrumbs={[{label: 'Stock'}, {label: 'Transfers'}]}
        title="Stock transfers"
        subtitle="Shops request stock from each other. Approve and pick the source shop: Requested → Approved → Dispatched → Received."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="panel p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{k.label}</p>
            <p className={`mt-2 font-serif text-[26px] leading-none ${k.bad && k.value ? 'text-error' : 'text-espresso'}`}>
              {k.value ?? '—'}
            </p>
            <p className="mt-1.5 text-[11px] text-outline">{k.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel min-w-0">
          <div className="flex flex-col gap-3 border-b border-ivory-300 px-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
            <div role="tablist" aria-label="Transfer status" className="flex overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-label-caps uppercase ${
                    tab === t.id ? 'border-burgundy text-burgundy' : 'border-transparent text-on-surface-variant hover:text-burgundy'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative pb-2">
              <Search size={14} className="pointer-events-none absolute left-3 top-[45%] -translate-y-1/2 text-outline" />
              <input
                aria-label="Search transfers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Transfer no., shop or item"
                className="field-input w-full py-2 pl-9 sm:w-60"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-body-sm">
              <thead>
                <tr className="border-b border-ivory-300 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th scope="col" className="px-4 py-3">Transfer</th>
                  <th scope="col" className="px-3 py-3">From</th>
                  <th scope="col" className="px-3 py-3">To</th>
                  <th scope="col" className="px-3 py-3 text-right">Units</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200 text-espresso">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-outline">Loading stock transfers…</td>
                  </tr>
                )}
                {isError && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-error">
                      {getErrorMessage(error, 'Could not load transfers')}
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && !transfers.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-outline">No transfers here.</td>
                  </tr>
                )}
                {transfers.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    aria-selected={active?.id === t.id}
                    className={`cursor-pointer hover:bg-ivory-50 ${active?.id === t.id ? 'bg-blush/20' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-medium">{t.transferNumber}</p>
                      <p className="text-[11px] text-outline">
                        {t.requestedBy ?? '—'} · {new Date(t.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant">{t.fromShop?.name ?? 'Any shop'}</td>
                    <td className="px-3 py-3 text-on-surface-variant">{t.toShop.name}</td>
                    <td className="px-3 py-3 text-right font-medium">{t.units}</td>
                    <td className="px-4 py-3">
                      <Pill status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel p-4">
          {active ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-2 border-b border-ivory-300 pb-3">
                <div>
                  <h2 className="font-serif text-headline-sm text-burgundy">{active.transferNumber}</h2>
                  <p className="text-[11px] text-outline">
                    {active.fromShop?.name ?? 'Any shop'} → {active.toShop.name} · {active.reason}
                    {active.neededBy ? ` · needed by ${new Date(active.neededBy).toLocaleDateString('en-IN')}` : ''}
                  </p>
                </div>
                <Pill status={active.status} />
              </div>
              {active.status === 'REQUESTED' ? <ApprovePanel key={active.id} t={active} /> : <Details t={active} />}
            </>
          ) : (
            <p className="py-10 text-center text-body-sm text-outline">Select a transfer to see details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
