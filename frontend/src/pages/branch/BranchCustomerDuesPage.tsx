import {useEffect, useState} from 'react';
import {
  useCustomerDues,
  useCustomerDueSummary,
  useSendReminders,
  useUpdateCreditLimit,
} from '@/lib/react-query/queriesAndMutations/customerDue';
import type {CustomerDue, CustomerDueListParams, DueReminder} from '@/types/customerDue';
import {exportCustomerDues} from '@/lib/api/customerDue';
import {ChevronLeft, ChevronRight, Download, MessageCircle, Search, X} from 'lucide-react';
import {useDebounceValue} from 'usehooks-ts';
import toast from 'react-hot-toast';

const inr = (n?: number | null) =>
  n === undefined || n === null
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

type Tab = NonNullable<CustomerDueListParams['tab']>;
const TABS: {key: Tab; label: string}[] = [
  {key: 'WITH_DUE', label: 'With due'},
  {key: 'OVERDUE', label: 'Overdue'},
  {key: 'OVER_LIMIT', label: 'Over limit'},
  {key: 'ALL', label: 'All customers'},
];

const csvCell = (v: string | number) => {
  const s = String(v ?? '');
  // Quote, and stop spreadsheet formulas
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

const input =
  'w-full rounded border border-ivory-300 bg-white px-3 py-2 text-body-sm text-espresso focus:border-burgundy-deep focus:outline-none';

export default function BranchCustomerDuesPage() {
  const [tab, setTab] = useState<Tab>('WITH_DUE');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounceValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limit, setLimit] = useState('');
  const [days, setDays] = useState('');
  const [reminders, setReminders] = useState<DueReminder[] | null>(null);

  const {data: summary} = useCustomerDueSummary();
  const {data, isLoading} = useCustomerDues({
    tab,
    search: debouncedSearch || undefined,
    page,
    limit: 10,
  });
  const updateLimit = useUpdateCreditLimit();
  const prepareReminders = useSendReminders();

  const customers = data?.items ?? [];
  const pagination = data?.pagination;
  const active: CustomerDue | null =
    customers.find((c) => c.id === selectedId) ?? customers[0] ?? null;

  useEffect(() => {
    if (active) {
      setLimit(String(active.creditLimit));
      setDays(String(active.creditDays));
    }
  }, [active?.id, active?.creditLimit, active?.creditDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveLimit = () => {
    if (!active) return;
    const creditLimit = Number(limit);
    const creditDays = Number(days);
    if (!(creditLimit >= 0) || !Number.isInteger(creditDays) || creditDays < 0) {
      toast.error('Enter a valid credit limit and credit days');
      return;
    }
    updateLimit.mutate({id: active.id, payload: {creditLimit, creditDays}});
  };

  const openReminders = async () => {
    const res: any = await prepareReminders.mutateAsync(undefined);
    const list: DueReminder[] = res?.data?.reminders ?? res?.reminders ?? [];
    if (!list.length) toast('No customer has a due older than 30 days');
    else setReminders(list);
  };

  const exportCsv = async () => {
    try {
      const res: any = await exportCustomerDues({tab, search: debouncedSearch || undefined});
      const items: CustomerDue[] = res?.data ?? [];
      if (!items.length) {
        toast.error('Nothing to export');
        return;
      }
      const head = ['Customer', 'Phone', 'Type', 'GSTIN', 'Shop', 'Credit limit', '0-30 days', '30+ days', 'Total due'];
      const rows = items.map((c) =>
        [c.name, c.phone, c.customerType, c.gstin ?? '', c.shopName, c.creditLimit, c.due0To30, c.due30Plus, c.totalDue]
          .map(csvCell)
          .join(','),
      );
      const blob = new Blob([[head.join(','), ...rows].join('\n')], {type: 'text/csv;charset=utf-8;'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `customer_dues_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Could not export');
    }
  };

  const cards = [
    {
      title: 'Total due',
      value: inr(summary?.totalDue),
      sub: summary ? `${summary.customerCount} customers` : '',
    },
    {
      title: 'Older than 30 days',
      value: inr(summary?.over30DaysDue),
      sub: summary ? `${summary.over30DaysCount} customers` : '',
    },
    {title: 'Overdue', value: String(summary?.overdueCount ?? '—'), sub: 'past their credit days'},
    {title: 'Over limit', value: String(summary?.overLimitCount ?? '—'), sub: 'due above credit limit'},
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-caps uppercase tracking-wider text-outline">
            Sales / Customers & Dues
          </p>
          <h1 className="font-serif text-headline-md font-normal text-burgundy-deep">
            Customers & dues
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Credit customers of all shops in the branch. Dues update with every bill and payment.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded border border-burgundy-deep px-3 py-2 text-xs font-semibold uppercase tracking-wider text-burgundy-deep hover:bg-burgundy-deep/5"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={openReminders}
            disabled={prepareReminders.isPending}
            className="inline-flex items-center gap-1.5 rounded bg-burgundy-deep px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-50"
          >
            <MessageCircle size={14} /> Remind 30+ days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.title} className="rounded-lg border border-ivory-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-outline">{c.title}</p>
            <p className="mt-1 font-serif text-xl text-burgundy-deep">{c.value}</p>
            <p className="text-[11px] text-on-surface-variant">{c.sub}</p>
          </div>
        ))}
      </div>

      {!!summary?.shopBreakdown.length && (
        <div className="flex flex-wrap gap-2 text-xs">
          {summary.shopBreakdown.map((s) => (
            <span key={s.shopName} className="rounded-full border border-ivory-300 bg-white px-3 py-1">
              {s.shopName}: <strong>{inr(s.amount)}</strong> · {s.customerCount}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-3 rounded-lg border border-ivory-200 bg-white p-4 shadow-sm lg:col-span-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setTab(t.key);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                    tab === t.key ? 'bg-burgundy-deep text-white' : 'text-on-surface-variant hover:bg-ivory-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative md:w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-outline" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Name or mobile"
                className={`${input} pl-8`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-body-sm">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory-50 text-[10px] font-semibold uppercase tracking-wider text-outline">
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Shop</th>
                  <th className="px-3 py-2.5 text-right">Limit</th>
                  <th className="px-3 py-2.5 text-right">0–30 d</th>
                  <th className="px-3 py-2.5 text-right">30+ d</th>
                  <th className="px-3 py-2.5 text-right">Total due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && !customers.length && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      No customers here.
                    </td>
                  </tr>
                )}
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`cursor-pointer hover:bg-ivory-50 ${active?.id === c.id ? 'bg-ivory-100' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-espresso">{c.name}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        +91 {c.phone} · {c.customerType}
                        {c.isOverdue && <span className="ml-1 font-semibold text-red-700">· overdue</span>}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant">{c.shopName}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{c.creditLimit ? inr(c.creditLimit) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{inr(c.due0To30)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${c.due30Plus ? 'text-red-700' : ''}`}>
                      {inr(c.due30Plus)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono font-semibold ${c.isOverLimit ? 'text-red-700' : ''}`}
                    >
                      {inr(c.totalDue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-end gap-2 text-[11px] text-on-surface-variant">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="rounded border border-ivory-300 p-1 disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              Page {pagination.page} of {pagination.pages}
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.pages}
                className="rounded border border-ivory-300 p-1 disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-ivory-200 bg-white p-5 shadow-sm lg:col-span-4">
          {!active ? (
            <p className="text-body-sm text-on-surface-variant">Choose a customer to set their credit.</p>
          ) : (
            <>
              <div>
                <h3 className="font-serif text-lg text-burgundy-deep">{active.name}</h3>
                <p className="text-[11px] text-on-surface-variant">
                  {active.shopName} · +91 {active.phone}
                  {active.gstin ? ` · ${active.gstin}` : ''}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-outline">
                    Credit limit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className={input}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-outline">
                    Credit days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className={input}
                  />
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant">0 = no limit.</p>
              <button
                onClick={saveLimit}
                disabled={updateLimit.isPending}
                className="w-full rounded bg-burgundy-deep py-2 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-50"
              >
                {updateLimit.isPending ? 'Saving…' : 'Save credit'}
              </button>
            </>
          )}
        </div>
      </div>

      {reminders && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-4 sm:items-center"
          onClick={() => setReminders(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Payment reminders"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg text-burgundy-deep">Payment reminders</h3>
              <button onClick={() => setReminders(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-xs text-on-surface-variant">
              Tap a customer to open WhatsApp with the message ready to send.
            </p>
            <ul className="divide-y divide-ivory-100">
              {reminders.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between py-2.5 hover:bg-ivory-50"
                  >
                    <span>
                      <span className="block text-sm font-medium text-espresso">{r.name}</span>
                      <span className="text-[11px] text-on-surface-variant">+91 {r.phone}</span>
                    </span>
                    <span className="font-mono text-sm">{inr(r.amount)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
