import useCurrentUser from '@/hooks/useCurrentUser';
import {useBranchOverview, useShops, useShopStats} from '@/lib/react-query/queriesAndMutations/org';
import {Link} from '@tanstack/react-router';
import {
  Plus,
  ArrowUpRight,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n?: number | null) =>
  n === undefined || n === null
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

export default function BranchDashboardPage() {
  const {data: me} = useCurrentUser();
  const {data: overview} = useBranchOverview();
  const {data: shopsData} = useShops('branch-admin', {limit: 100});
  const {data: statsData} = useShopStats();

  const branchName = me?.branch?.name || 'Sangli Branch';

  const todayDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const registeredShops = shopsData?.items || [];

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Overview · {todayDateStr}
          </p>
          <h1 className="font-serif text-xl font-bold text-[#4A1521]">
            {branchName}
          </h1>
          <p className="text-xs text-stone-500">
            {registeredShops.length || 3} shop counters registered · 5 approvals waiting
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/branch-admin/approvals"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 hover:text-[#4A1521] transition"
          >
            <span>Approvals</span>
            <span className="rounded bg-[#4A1521] px-1.5 py-0.2 text-[10px] text-white">5</span>
          </Link>
          <Link
            to="/branch-admin/purchase-bills"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 hover:text-[#4A1521] transition"
          >
            <Plus size={14} />
            <span>Purchase</span>
          </Link>
          <Link
            to="/branch-admin/stock-transfers"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4A1521] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#380e18] transition"
          >
            <Plus size={14} />
            <span>Stock Transfer</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards - 8 KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {/* 1. Branch Sales Today */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Branch Sales Today</p>
          <p className="mt-1 font-serif text-lg font-bold text-[#4A1521]">
            {inr(overview?.today.sales ?? 36490)}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
            <span>27 bills</span>
            <span className="font-semibold">▲ 11%</span>
          </p>
        </div>

        {/* 2. Sales This Month */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Sales This Month</p>
          <p className="mt-1 font-serif text-lg font-bold text-stone-800">
            {inr(overview?.month.sales ?? 196750)}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">{registeredShops.length || 3} shops</p>
        </div>

        {/* 3. Gross Profit (MTD) */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Gross Profit (MTD)</p>
          <p className="mt-1 font-serif text-lg font-bold text-stone-800">
            ₹72,960
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">39.1% margin</p>
        </div>

        {/* 4. Cash In Drawers */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Cash in Drawers</p>
          <p className="mt-1 font-serif text-lg font-bold text-stone-800">
            {inr(overview?.today.cash ?? 10970)}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">Across counters</p>
        </div>

        {/* 5. Customer Dues */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Customer Dues</p>
          <p className="mt-1 font-serif text-lg font-bold text-[#4A1521]">
            ₹39,250
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-red-600">
            17 customers · 5 overdue
          </p>
        </div>

        {/* 6. Supplier Payable */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Supplier Payable</p>
          <p className="mt-1 font-serif text-lg font-bold text-stone-800">
            ₹84,790
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-red-600">1 overdue</p>
        </div>

        {/* 7. Stock Value (Cost) */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Stock Value (Cost)</p>
          <p className="mt-1 font-serif text-lg font-bold text-stone-800">
            ₹22.6 L
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">1,940 pcs</p>
        </div>

        {/* 8. GST Payable (Nov) */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">GST Payable (Net)</p>
          <p className="mt-1 font-serif text-lg font-bold text-stone-800">
            ₹10,540
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">After input credit</p>
        </div>
      </div>

      {/* Shops Today Table */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h2 className="font-serif text-sm font-semibold uppercase tracking-wider text-stone-600">
              Shops Performance
            </h2>
          </div>
          <Link
            to="/branch-admin/day-close"
            className="text-[11px] font-bold uppercase tracking-wider text-[#4A1521] hover:underline"
          >
            Day Close Status →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="py-2 pl-3 pr-2">Shop</th>
                <th className="px-2 py-2 text-center">Bills</th>
                <th className="px-2 py-2 text-right">Sales</th>
                <th className="px-2 py-2 text-right">Cash</th>
                <th className="px-2 py-2 text-right">UPI / Card</th>
                <th className="px-2 py-2 text-right">Credit Given</th>
                <th className="px-2 py-2 text-right">Cash in Drawer</th>
                <th className="px-2 py-2 text-right">Sales (MTD)</th>
                <th className="py-2 pl-2 pr-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {registeredShops.length > 0 ? (
                registeredShops.map((shop, idx) => {
                  const st = statsData?.shops[shop.id];
                  const fallbackBills = [9, 12, 6][idx % 3];
                  const fallbackSales = [11480, 20640, 4370][idx % 3];
                  const fallbackCash = [4120, 4720, 1610][idx % 3];
                  const fallbackUpi = [5460, 13920, 2260][idx % 3];
                  const fallbackCredit = [1900, 2000, 500][idx % 3];
                  const fallbackDrawer = [3860, 5470, 1640][idx % 3];
                  const mtdSales = st ? st.salesMtd : [82300, 93150, 21300][idx % 3];

                  return (
                    <tr key={shop.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-2.5 pl-3 pr-2">
                        <p className="font-serif font-semibold text-stone-800">{shop.name}</p>
                        <p className="text-[10px] text-stone-400">
                          {shop.shopAdmin?.fullname || shop.code || 'Shop Manager'}
                        </p>
                      </td>
                      <td className="px-2 py-2.5 text-center text-stone-700">{fallbackBills}</td>
                      <td className="px-2 py-2.5 text-right font-medium text-stone-800">{inr(fallbackSales)}</td>
                      <td className="px-2 py-2.5 text-right text-stone-600">{inr(fallbackCash)}</td>
                      <td className="px-2 py-2.5 text-right text-stone-600">{inr(fallbackUpi)}</td>
                      <td className="px-2 py-2.5 text-right text-red-600 font-medium">{inr(fallbackCredit)}</td>
                      <td className="px-2 py-2.5 text-right text-stone-700">{inr(fallbackDrawer)}</td>
                      <td className="px-2 py-2.5 text-right font-semibold text-[#4A1521]">{inr(mtdSales)}</td>
                      <td className="py-2.5 pl-2 pr-3 text-center">
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                          ● {shop.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <>
                  <tr className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-2.5 pl-3 pr-2">
                      <p className="font-serif font-semibold text-stone-800">Men's Wear</p>
                      <p className="text-[10px] text-stone-400">Rahul Mane</p>
                    </td>
                    <td className="px-2 py-2.5 text-center text-stone-700">9</td>
                    <td className="px-2 py-2.5 text-right font-medium text-stone-800">₹11,480</td>
                    <td className="px-2 py-2.5 text-right text-stone-600">₹4,120</td>
                    <td className="px-2 py-2.5 text-right text-stone-600">₹5,460</td>
                    <td className="px-2 py-2.5 text-right text-red-600 font-medium">₹1,900</td>
                    <td className="px-2 py-2.5 text-right text-stone-700">₹3,860</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-[#4A1521]">₹82,300</td>
                    <td className="py-2.5 pl-2 pr-3 text-center">
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        ● OPEN
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-2.5 pl-3 pr-2">
                      <p className="font-serif font-semibold text-stone-800">Women's Wear</p>
                      <p className="text-[10px] text-stone-400">Priya Shinde</p>
                    </td>
                    <td className="px-2 py-2.5 text-center text-stone-700">12</td>
                    <td className="px-2 py-2.5 text-right font-medium text-stone-800">₹20,640</td>
                    <td className="px-2 py-2.5 text-right text-stone-600">₹4,720</td>
                    <td className="px-2 py-2.5 text-right text-stone-600">₹13,920</td>
                    <td className="px-2 py-2.5 text-right text-red-600 font-medium">₹2,000</td>
                    <td className="px-2 py-2.5 text-right text-stone-700">₹5,470</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-[#4A1521]">₹93,150</td>
                    <td className="py-2.5 pl-2 pr-3 text-center">
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        ● OPEN
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lower Row: Stock Alert & Pending Approvals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Stock Alert */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-stone-600">
              Low Stock Alerts
            </h3>
            <Link
              to="/branch-admin/stock-transfers"
              className="text-[11px] font-bold uppercase tracking-wider text-[#4A1521] hover:underline"
            >
              Transfer Stock →
            </Link>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-stone-100 p-2 hover:bg-stone-50">
              <div>
                <p className="font-medium text-stone-800">Kids Denim Jacket (4Y)</p>
                <p className="text-[10px] text-stone-400">Kids Wear · Only 2 pcs left</p>
              </div>
              <span className="rounded bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-600">
                CRITICAL
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-stone-100 p-2 hover:bg-stone-50">
              <div>
                <p className="font-medium text-stone-800">Linen Kurti - Peach (M)</p>
                <p className="text-[10px] text-stone-400">Women's Wear · 4 pcs left</p>
              </div>
              <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                LOW
              </span>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-stone-600">
              Pending Approvals (5)
            </h3>
            <Link
              to="/branch-admin/approvals"
              className="text-[11px] font-bold uppercase tracking-wider text-[#4A1521] hover:underline"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-stone-100 p-2 hover:bg-stone-50">
              <div>
                <p className="font-medium text-stone-800">Patil Uniforms · Credit limit increase</p>
                <p className="text-[10px] text-stone-400">Requested ₹14,600 on credit (Limit ₹10,000)</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toast.success('Approved credit request')}
                  className="rounded bg-emerald-50 border border-emerald-200 p-1 text-emerald-700 hover:bg-emerald-100"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => toast.error('Rejected credit request')}
                  className="rounded bg-red-50 border border-red-200 p-1 text-red-700 hover:bg-red-100"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-stone-100 p-2 hover:bg-stone-50">
              <div>
                <p className="font-medium text-stone-800">Women's Wear · Cash Return ₹1,200</p>
                <p className="text-[10px] text-stone-400">Bill #SB-20261102-0012 · Customer return</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toast.success('Approved return')}
                  className="rounded bg-emerald-50 border border-emerald-200 p-1 text-emerald-700 hover:bg-emerald-100"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => toast.error('Rejected return')}
                  className="rounded bg-red-50 border border-red-200 p-1 text-red-700 hover:bg-red-100"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
