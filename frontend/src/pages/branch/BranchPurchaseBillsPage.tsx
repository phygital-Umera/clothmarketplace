import {useMemo, useState} from 'react';
import {
  useBranchPurchases,
  useBranchPurchaseSummary,
} from '@/lib/react-query/queriesAndMutations/branchPurchase';
import type {BranchPurchaseQuery} from '@/types/branchPurchase';
import {Calendar, ChevronLeft, ChevronRight, Search} from 'lucide-react';
import {useDebounceValue} from 'usehooks-ts';

const inr = (n?: number | null) =>
  n === undefined || n === null
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'}) : '';

/** This month and the 11 before it, as YYYY-MM */
const lastMonths = () => {
  const now = new Date();
  return Array.from({length: 12}, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', {month: 'short', year: 'numeric'}),
    };
  });
};

const TABS = [
  {id: 'ALL', label: 'All'},
  {id: 'UNPAID', label: 'Unpaid'},
  {id: 'DRAFT', label: 'Draft'},
] as const;

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNPAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  DRAFT: 'bg-stone-100 text-stone-700 border-stone-300',
  CANCELLED: 'bg-stone-50 text-stone-400 border-stone-200 line-through',
};

const select =
  'rounded-lg border border-stone-200 bg-stone-50/50 px-2.5 py-1.5 text-xs text-stone-700 focus:border-[#4A1521] focus:bg-white focus:outline-none';

/** Purchase bills of all shops in the branch (shops create them) */
export default function BranchPurchaseBillsPage() {
  const months = useMemo(lastMonths, []);
  const [tab, setTab] = useState<NonNullable<BranchPurchaseQuery['tab']>>('ALL');
  const [supplier, setSupplier] = useState('');
  const [shopId, setShopId] = useState('');
  const [month, setMonth] = useState(months[0].value);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounceValue(search.trim(), 300);
  const [page, setPage] = useState(1);

  const {data: summary} = useBranchPurchaseSummary(month);
  const {data, isLoading} = useBranchPurchases({
    tab,
    supplierName: supplier || undefined,
    shopId: shopId || undefined,
    month,
    search: debouncedSearch || undefined,
    page,
    limit: 15,
  });
  const bills = data?.items ?? [];
  const pagination = data?.pagination;
  const monthLabel = months.find((m) => m.value === month)?.label;

  const filter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const cards = [
    {
      title: `Purchases (${monthLabel})`,
      value: inr(summary?.purchasesMonth),
      sub: summary ? `${summary.billsCount} bills · ${summary.pcsCount} pcs` : '',
    },
    {title: 'Input GST (ITC)', value: inr(summary?.inputGst), sub: monthLabel},
    {
      title: 'Payable now',
      value: inr(summary?.payable),
      sub: summary?.overdueCount ? `${summary.overdueCount} overdue` : 'Nothing overdue',
      alert: !!summary?.overdueCount,
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      <div className="border-b border-stone-200/80 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Purchase / Purchase Bills
        </p>
        <h1 className="font-serif text-xl font-bold text-[#4A1521]">Purchase Bills</h1>
        <p className="text-xs text-stone-500">
          Stock bought by the shops of this branch. Shops add purchase bills from their own
          Purchase Bills page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{c.title}</p>
            <p className="mt-1 font-serif text-lg font-bold text-[#4A1521]">{c.value}</p>
            <p className={`mt-0.5 text-[11px] ${c.alert ? 'font-semibold text-red-600' : 'text-stone-500'}`}>
              {c.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-100 pb-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => filter(setTab)(t.id)}
                className={`whitespace-nowrap border-b-2 px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
                  tab === t.id
                    ? 'border-[#4A1521] text-[#4A1521]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={shopId} onChange={(e) => filter(setShopId)(e.target.value)} className={select}>
              <option value="">All shops</option>
              {summary?.shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select value={supplier} onChange={(e) => filter(setSupplier)(e.target.value)} className={select}>
              <option value="">All suppliers</option>
              {summary?.suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label className={`flex items-center gap-1 ${select}`}>
              <Calendar size={13} className="text-stone-400" />
              <select
                value={month}
                onChange={(e) => filter(setMonth)(e.target.value)}
                className="bg-transparent text-xs focus:outline-none"
                aria-label="Month"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2 text-stone-400" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => filter(setSearch)(e.target.value)}
            placeholder="Search bill number, supplier or invoice"
            className="w-full rounded-lg border border-stone-200 bg-stone-50/40 py-1.5 pl-8 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-[#4A1521] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="py-2 pl-3 pr-2">Our no.</th>
                <th className="px-2 py-2">Supplier / Invoice</th>
                <th className="px-2 py-2">Shop</th>
                <th className="px-2 py-2">By</th>
                <th className="px-2 py-2 text-center">Pcs</th>
                <th className="px-2 py-2 text-right">Taxable</th>
                <th className="px-2 py-2 text-right">GST</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2 text-right">Balance</th>
                <th className="py-2 pl-2 pr-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-stone-400">
                    Loading purchase bills…
                  </td>
                </tr>
              ) : !bills.length ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-stone-400">
                    No purchase bills for these filters.
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-stone-50/60">
                    <td className="whitespace-nowrap py-2.5 pl-3 pr-2">
                      <p className="font-serif font-semibold text-[#4A1521]">{b.billNumber}</p>
                      <p className="text-[10px] text-stone-400">{shortDate(b.billDate)}</p>
                    </td>
                    <td className="px-2 py-2.5">
                      <p className="font-medium text-stone-800">{b.supplierName}</p>
                      {b.supplierInvoiceNo && (
                        <p className="text-[10px] text-stone-400">{b.supplierInvoiceNo}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-stone-700">{b.stockTo}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-stone-500">{b.boughtBy}</td>
                    <td className="px-2 py-2.5 text-center font-semibold text-stone-800">{b.pcs}</td>
                    <td className="px-2 py-2.5 text-right text-stone-600">{inr(b.taxable)}</td>
                    <td className="px-2 py-2.5 text-right text-stone-600">{inr(b.gstAmount)}</td>
                    <td className="px-2 py-2.5 text-right font-serif font-bold text-[#4A1521]">
                      {inr(b.totalAmount)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-medium">
                      {b.balanceAmount > 0 ? (
                        <span className={b.status === 'OVERDUE' ? 'font-bold text-red-600' : 'text-stone-700'}>
                          {inr(b.balanceAmount)}
                        </span>
                      ) : (
                        <span className="text-stone-400">₹0</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 pr-3 text-center">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          STATUS_COLORS[b.status] ?? ''
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-[11px] text-stone-500">
            <span>
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={pagination.page <= 1}
                className="rounded border border-stone-200 p-1 disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={pagination.page >= pagination.pages}
                className="rounded border border-stone-200 p-1 disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
