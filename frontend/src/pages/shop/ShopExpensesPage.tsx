import {useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Plus} from 'lucide-react';
import {api} from '@/utils/axios';
import {ExpenseModal} from '@/components/Bills/CounterModals';
import useCurrentUser from '@/hooks/useCurrentUser';
import {levelOf} from '@/lib/shopModules';

/* Running expenses of this shop (tea, transport, repairs…). Cash ones come out of the counter drawer. */

type Expense = {
  id: string;
  category: string;
  amount: number;
  mode: string;
  expenseDate: string;
  notes: string | null;
  createdBy?: {fullname: string} | null;
};
type ExpenseList = {items: Expense[]; pagination: {total: number; page: number; totalPages: number}};

const inr = (n: number) => `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;
const ymd = (d: Date) => d.toLocaleDateString('en-CA');
const monthStart = () => {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
};
const serif = {fontFamily: "'Playfair Display', Georgia, serif"};
const input = 'border border-[#ded5ce] rounded px-2.5 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]';

export default function ShopExpensesPage() {
  const qc = useQueryClient();
  const {data: me} = useCurrentUser();
  // Employees with view-only access to Accounts see the list without the add button
  const canAdd = !!me && (me.role !== 'EMPLOYEE' || levelOf(me.permissions, 'accounts') === 'edit');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(ymd(new Date()));
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  const {data, isLoading, isError} = useQuery({
    queryKey: ['shop-expenses', from, to, page],
    queryFn: () =>
      (api.get('/shop-admin/expenses', {params: {from, to, page, limit: 25, sortBy: 'expenseDate', sortDir: 'desc'}}) as unknown as Promise<{data: ExpenseList}>).then((r) => r.data),
  });
  const items = data?.items ?? [];
  const total = items.reduce((n, e) => n + e.amount, 0);
  const byCategory = Object.entries(
    items.reduce<Record<string, number>>((acc, e) => ({...acc, [e.category]: (acc[e.category] ?? 0) + e.amount}), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#832729]">Accounts / Expenses</p>
          <h1 className="text-3xl text-[#832729]" style={serif}>
            Shop expenses
          </h1>
          <p className="mt-1 text-xs text-[#736862]">Tea, transport, repairs and other running costs of this shop. Cash expenses come out of the counter drawer.</p>
        </div>
        {canAdd && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded bg-[#832729] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#6b1f21]">
            <Plus size={14} /> Add expense
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded border border-[#ded5ce] bg-white p-4">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#736862]">
          From
          <input type="date" value={from} max={to} onChange={(e) => (setFrom(e.target.value), setPage(1))} className={`${input} mt-1 block`} />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#736862]">
          To
          <input type="date" value={to} min={from} max={ymd(new Date())} onChange={(e) => (setTo(e.target.value), setPage(1))} className={`${input} mt-1 block`} />
        </label>
        <div className="ml-auto text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#736862]">Total{data && data.pagination.totalPages > 1 ? ' (this page)' : ''}</p>
          <p className="text-2xl text-[#2a2220]" style={serif}>
            {inr(total)}
          </p>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCategory.map(([c, v]) => (
            <span key={c} className="rounded-full border border-[#ded5ce] bg-white px-3 py-1 text-xs text-[#2a2220]">
              {c} · <b>{inr(v)}</b>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-[#ded5ce] bg-white">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-[#ded5ce] bg-[#faf7f4] text-[11px] uppercase tracking-wider text-[#736862]">
            <tr>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Category</th>
              <th className="px-4 py-3 font-bold">Paid by</th>
              <th className="px-4 py-3 font-bold">Notes</th>
              <th className="px-4 py-3 font-bold">Added by</th>
              <th className="px-4 py-3 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efe8e2]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#736862]">
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-red-700">
                  Could not load expenses.
                </td>
              </tr>
            ) : !items.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#736862]">
                  No expenses in these dates.
                </td>
              </tr>
            ) : (
              items.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">{new Date(e.expenseDate).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                  <td className="px-4 py-3 font-medium">{e.category}</td>
                  <td className="px-4 py-3">{e.mode}</td>
                  <td className="px-4 py-3 text-[#736862]">{e.notes || '—'}</td>
                  <td className="px-4 py-3 text-[#736862]">{e.createdBy?.fullname ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(e.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`${input} disabled:opacity-40`}>
            Previous
          </button>
          <span>
            Page {page} of {data.pagination.totalPages}
          </span>
          <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)} className={`${input} disabled:opacity-40`}>
            Next
          </button>
        </div>
      )}

      {adding && (
        <ExpenseModal
          panel="shop-admin"
          onClose={() => {
            setAdding(false);
            qc.invalidateQueries({queryKey: ['shop-expenses']});
          }}
        />
      )}
    </div>
  );
}
