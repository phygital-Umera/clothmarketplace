import {useState, useEffect} from 'react';
import {
  useBranchPurchases,
  useBranchPurchaseSummary,
} from '@/lib/react-query/queriesAndMutations/branchPurchase';
import {Plus, Search, Calendar} from 'lucide-react';
import BranchNewPurchasePage from './BranchNewPurchasePage';

const inr = (n?: number | null) =>
  n === undefined || n === null
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

type TabType = 'ALL' | 'UNPAID' | 'BRANCH_PURCHASES' | 'SHOP_PURCHASES' | 'DRAFT';

const formatDate = (isoString?: string) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'});
};

interface BranchPurchaseBillsPageProps {
  initialMode?: 'LIST' | 'NEW';
}

export default function BranchPurchaseBillsPage({initialMode = 'LIST'}: BranchPurchaseBillsPageProps) {
  const [viewMode, setViewMode] = useState<'LIST' | 'NEW'>(initialMode);
  const [tab, setTab] = useState<TabType>('ALL');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('2026-11');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const {data: summary} = useBranchPurchaseSummary();
  const {data, isLoading} = useBranchPurchases({
    tab,
    supplierName: supplierFilter === 'All' ? undefined : supplierFilter,
    month: monthFilter,
    search: search.trim() || undefined,
    page,
    limit: 15,
  });

  const bills = data?.items || [];

  useEffect(() => {
    // If URL has ?new=1 or similar
    if (typeof window !== 'undefined' && window.location.search.includes('new=1')) {
      setViewMode('NEW');
    }
  }, []);

  if (viewMode === 'NEW') {
    return (
      <BranchNewPurchasePage
        onBack={() => {
          setViewMode('LIST');
          // clean URL param if present
          if (typeof window !== 'undefined' && window.location.search.includes('new=1')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Purchase / Purchase Bills
          </p>
          <h1 className="font-serif text-xl font-bold text-[#4A1521]">
            Purchase Bills
          </h1>
          <p className="text-xs text-stone-500">
            Goods purchased by branch or shops with automatic allocation and tracking
          </p>
        </div>
        <button
          type="button"
          onClick={() => setViewMode('NEW')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#4A1521] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#380e18]"
        >
          <Plus size={15} />
          <span>New Purchase</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Purchases (Nov)</p>
          <p className="mt-1 font-serif text-lg font-bold text-[#4A1521]">
            {inr(summary?.purchasesMonth ?? 146100)}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {summary?.billsCount ?? 3} bills · {summary?.pcsCount ?? 225} pcs
          </p>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Input GST (ITC)</p>
          <p className="mt-1 font-serif text-lg font-bold text-stone-800">
            {inr(summary?.inputGst ?? 13253)}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">Nov bills</p>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Payable</p>
          <p className="mt-1 font-serif text-lg font-bold text-stone-800">
            {inr(summary?.payable ?? 84790)}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-red-600">
            {summary?.overdueCount ?? 1} overdue
          </p>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Above ₹50,000</p>
          <p className="mt-1 font-serif text-lg font-bold text-stone-800">
            {summary?.above50kCount ?? 1}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Sent to Company Admin
          </p>
        </div>
      </div>

      {/* Main Panel */}
      <div className="space-y-3 rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
        {/* Tabs and Filters Row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-stone-100 pb-2.5">
          <div className="flex overflow-x-auto gap-1 border-b lg:border-b-0 border-stone-100">
            {(
              [
                {id: 'ALL', label: 'All'},
                {id: 'UNPAID', label: 'Unpaid'},
                {id: 'BRANCH_PURCHASES', label: 'Branch'},
                {id: 'SHOP_PURCHASES', label: 'Shops'},
                {id: 'DRAFT', label: 'Draft'},
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setPage(1);
                }}
                className={`border-b-2 px-2.5 py-1 text-xs font-semibold uppercase transition-colors whitespace-nowrap ${
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
            {/* Supplier select */}
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-200 bg-stone-50/50 px-2.5 py-1 text-xs text-stone-700 focus:border-[#4A1521] focus:bg-white focus:outline-none"
            >
              <option value="All">All suppliers</option>
              {(summary?.suppliers || [
                'Mumbai Denim Works',
                'Surat Textile House',
                'Varanasi Silk Emporium',
                'Tiruppur Knits',
                'Ichalkaranji Weavers Co-op',
                'Sangli Cloth Mart',
              ]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Month select */}
            <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50/50 px-2.5 py-1 text-xs text-stone-700">
              <Calendar size={13} className="text-stone-400" />
              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent focus:outline-none text-xs text-stone-700"
              >
                <option value="2026-11">Nov 2026</option>
                <option value="2026-10">Oct 2026</option>
                <option value="2026-09">Sep 2026</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2 text-stone-400" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by bill number, supplier name, or invoice..."
            className="w-full rounded-lg border border-stone-200 bg-stone-50/40 py-1.5 pl-8 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-[#4A1521] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="py-2 pl-3 pr-2">Our No.</th>
                <th className="px-2 py-2">Supplier / Invoice</th>
                <th className="px-2 py-2">Bought By</th>
                <th className="px-2 py-2">Stock To</th>
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
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-stone-400">
                    No purchase bills found.
                  </td>
                </tr>
              ) : (
                bills.map((b) => {
                  const statusColors: Record<string, string> = {
                    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    UNPAID: 'bg-amber-50 text-amber-700 border-amber-200',
                    PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
                    OVERDUE: 'bg-red-50 text-red-700 border-red-200',
                    DRAFT: 'bg-stone-100 text-stone-700 border-stone-300',
                  };

                  return (
                    <tr key={b.id} className="transition-colors hover:bg-stone-50/60">
                      <td className="py-2.5 pl-3 pr-2 whitespace-nowrap">
                        <p className="font-serif font-semibold text-[#4A1521]">{b.billNumber}</p>
                        <p className="text-[10px] text-stone-400">{formatDate(b.billDate)}</p>
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-stone-800">{b.supplierName}</p>
                        <p className="text-[10px] text-stone-400">{b.supplierInvoiceNo}</p>
                      </td>
                      <td className="px-2 py-2.5 text-stone-500 whitespace-nowrap">
                        {b.boughtBy}
                      </td>
                      <td className="px-2 py-2.5 text-stone-700 whitespace-nowrap font-medium">
                        {b.stockTo}
                      </td>
                      <td className="px-2 py-2.5 text-center text-stone-800 font-semibold">
                        {b.pcs}
                      </td>
                      <td className="px-2 py-2.5 text-right text-stone-600">
                        {inr(b.taxable)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-stone-600 whitespace-nowrap">
                        <p>{inr(b.gstAmount)}</p>
                        <p className="text-[9px] text-stone-400">{b.gstType}</p>
                      </td>
                      <td className="px-2 py-2.5 text-right font-serif font-bold text-[#4A1521]">
                        {inr(b.totalAmount)}
                      </td>
                      <td className="px-2 py-2.5 text-right font-medium">
                        {b.balanceAmount > 0 ? (
                          <span className={b.status === 'OVERDUE' ? 'text-red-600 font-bold' : 'text-stone-700'}>
                            {inr(b.balanceAmount)}
                          </span>
                        ) : (
                          <span className="text-stone-400">₹0</span>
                        )}
                      </td>
                      <td className="py-2.5 pl-2 pr-3 text-center">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            statusColors[b.status] || 'bg-stone-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-[11px] text-stone-500">
            <span>
              {bills.length > 0 ? `1–${bills.length} of ${data.pagination.total}` : '0 of 0'}
            </span>
            <div className="flex items-center gap-2">
              <span>Page {data.pagination.page} of {data.pagination.pages || 1}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
