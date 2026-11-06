import useCurrentUser from '@/hooks/useCurrentUser';
import {useBranchOverview} from '@/lib/react-query/queriesAndMutations/org';
import {useCustomerDueSummary} from '@/lib/react-query/queriesAndMutations/customerDue';
import {useBranchPurchaseSummary} from '@/lib/react-query/queriesAndMutations/branchPurchase';
import {useBranchApprovals} from '@/lib/react-query/queriesAndMutations/branchExtras';
import {Link} from '@tanstack/react-router';
import {ArrowLeftRight} from 'lucide-react';

const inr = (n?: number | null) =>
  n === undefined || n === null
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

const card = 'rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm';
const cardTitle = 'text-[10px] font-bold uppercase tracking-wider text-stone-400';

export default function BranchDashboardPage() {
  const {data: me} = useCurrentUser();
  const {data: overview, isLoading} = useBranchOverview();
  const {data: dues} = useCustomerDueSummary();
  const {data: purchases} = useBranchPurchaseSummary();
  const {data: approvals} = useBranchApprovals();

  const pendingApprovals = approvals?.counts.pending ?? 0;
  const shops = overview?.shops.rows ?? [];
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const change = overview?.today.changePct;

  const kpis = [
    {
      title: 'Sales today',
      value: inr(overview?.today.sales),
      sub: overview ? `${overview.today.bills} bills` : '',
      extra:
        change === null || change === undefined
          ? null
          : {text: `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% vs yesterday`, good: change >= 0},
    },
    {
      title: 'Sales this month',
      value: inr(overview?.month.sales),
      sub: overview ? `${overview.month.salesBills} bills` : '',
    },
    {title: 'Cash sales today', value: inr(overview?.today.cash), sub: `UPI / card ${inr(overview?.today.digital)}`},
    {
      title: 'Customer dues',
      value: inr(dues?.totalDue),
      sub: dues ? `${dues.customerCount} customers · ${dues.overdueCount} overdue` : '',
      alert: !!dues?.overdueCount,
      to: '/branch-admin/customers',
    },
    {
      title: 'Supplier payable',
      value: inr(purchases?.payable),
      sub: purchases?.overdueCount ? `${purchases.overdueCount} overdue` : 'Nothing overdue',
      alert: !!purchases?.overdueCount,
      to: '/branch-admin/suppliers',
    },
    {
      title: 'Stock',
      value: overview ? `${overview.stock.units.toLocaleString('en-IN')} pcs` : '—',
      sub: overview ? `${inr(overview.stock.value)} at selling price` : '',
    },
    {
      title: 'Low stock items',
      value: String(overview?.stock.lowStock ?? '—'),
      sub: 'at or below their alert level',
      alert: !!overview?.stock.lowStock,
    },
    {
      title: 'GST this month (net)',
      value: inr(overview?.month.netTax),
      sub: overview ? `Output ${inr(overview.month.outputTax)} − input ${inr(overview.month.inputTax)}` : '',
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col gap-2 border-b border-stone-200/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={cardTitle}>Overview · {today}</p>
          <h1 className="font-serif text-xl font-bold text-[#4A1521]">{me?.branch?.name ?? 'Branch'}</h1>
          <p className="text-xs text-stone-500">
            {overview ? `${overview.shops.active} of ${overview.shops.total} shops active` : '…'}
            {pendingApprovals ? ` · ${pendingApprovals} approval${pendingApprovals === 1 ? '' : 's'} waiting` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/branch-admin/approvals"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 hover:text-[#4A1521]"
          >
            Approvals
            {pendingApprovals > 0 && (
              <span className="rounded bg-[#4A1521] px-1.5 text-[10px] text-white">{pendingApprovals}</span>
            )}
          </Link>
          <Link
            to="/branch-admin/stock-transfers"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4A1521] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#380e18]"
          >
            <ArrowLeftRight size={14} /> Stock transfers
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const body = (
            <>
              <p className={cardTitle}>{k.title}</p>
              <p className="mt-1 font-serif text-lg font-bold text-[#4A1521]">{isLoading ? '…' : k.value}</p>
              <p className={`mt-0.5 text-[11px] ${k.alert ? 'font-semibold text-red-600' : 'text-stone-500'}`}>
                {k.sub}
              </p>
              {k.extra && (
                <p className={`text-[11px] font-semibold ${k.extra.good ? 'text-emerald-700' : 'text-red-600'}`}>
                  {k.extra.text}
                </p>
              )}
            </>
          );
          return k.to ? (
            <Link key={k.title} to={k.to} className={`${card} transition hover:border-[#4A1521]/40`}>
              {body}
            </Link>
          ) : (
            <div key={k.title} className={card}>
              {body}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-wider text-stone-600">Shops today</h2>
          <Link
            to="/branch-admin/day-close"
            className="text-[11px] font-bold uppercase tracking-wider text-[#4A1521] hover:underline"
          >
            Day close →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="py-2 pl-3 pr-2">Shop</th>
                <th className="px-2 py-2 text-center">Bills</th>
                <th className="px-2 py-2 text-right">Sales</th>
                <th className="px-2 py-2 text-right">Cash</th>
                <th className="px-2 py-2 text-right">UPI / card</th>
                <th className="px-2 py-2 text-right">On credit</th>
                <th className="px-2 py-2 text-right">This month</th>
                <th className="py-2 pl-2 pr-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!shops.length ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-stone-400">
                    {isLoading ? 'Loading…' : 'No shops in this branch yet.'}
                  </td>
                </tr>
              ) : (
                shops.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-stone-50/60">
                    <td className="py-2.5 pl-3 pr-2">
                      <p className="font-serif font-semibold text-stone-800">{s.name}</p>
                      <p className="text-[10px] text-stone-400">{s.manager ?? s.code}</p>
                    </td>
                    <td className="px-2 py-2.5 text-center text-stone-700">{s.bills}</td>
                    <td className="px-2 py-2.5 text-right font-medium text-stone-800">{inr(s.sales)}</td>
                    <td className="px-2 py-2.5 text-right text-stone-600">{inr(s.cash)}</td>
                    <td className="px-2 py-2.5 text-right text-stone-600">{inr(s.digital)}</td>
                    <td className={`px-2 py-2.5 text-right ${s.credit ? 'font-medium text-red-600' : 'text-stone-600'}`}>
                      {inr(s.credit)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-[#4A1521]">{inr(s.monthSales)}</td>
                    <td className="py-2.5 pl-2 pr-3 text-center">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          s.status === 'ACTIVE'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-stone-200 bg-stone-50 text-stone-500'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
