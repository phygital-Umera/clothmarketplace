import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from '@tanstack/react-router';
import {Globe} from 'lucide-react';
import {api} from '@/utils/axios';
import {inr} from '@/utils/money';

type OnlineBuyer = {id: string; fullname: string; phoneNumber: string; email: string | null; orders: number; spent: number; lastOrderAt: string};

/** Shoppers who bought from this shop on the online store (kept apart from counter / credit customers) */
export default function OnlineBuyers() {
  const [search, setSearch] = useState('');
  const {data, isLoading, isError} = useQuery({
    queryKey: ['shop-online-customers', search],
    queryFn: () =>
      (api.get('/shop-admin/customers/online', {params: {search: search || undefined}}) as unknown as Promise<{data: {items: OnlineBuyer[]; total: number}}>).then((r) => r.data),
  });
  const items = data?.items ?? [];

  return (
    <section className="rounded-lg border border-ivory-300 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory-200 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-subheading text-espresso">
            <Globe size={16} className="text-burgundy" /> Online store buyers
            <span className="rounded-full bg-ivory-200 px-2 text-xs font-semibold">{data?.total ?? 0}</span>
          </h2>
          <p className="text-xs text-outline">People who ordered from this shop on the website. Their orders are under Online Orders.</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, mobile, email"
          className="w-full rounded border border-ivory-300 bg-[#FAF8F5] px-3 py-1.5 text-xs focus:border-burgundy focus:bg-white focus:outline-none sm:w-56"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="bg-ivory-100 text-[11px] uppercase tracking-wider text-outline">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Customer</th>
              <th className="px-3 py-2.5 font-semibold">Contact</th>
              <th className="px-3 py-2.5 text-right font-semibold">Orders</th>
              <th className="px-3 py-2.5 text-right font-semibold">Spent</th>
              <th className="px-4 py-2.5 font-semibold">Last order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-outline">
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rose-700">
                  Could not load online buyers.
                </td>
              </tr>
            ) : !items.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-outline">
                  {search ? 'No online buyers match.' : 'No online orders yet.'}
                </td>
              </tr>
            ) : (
              items.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2.5 font-semibold text-espresso">{b.fullname}</td>
                  <td className="px-3 py-2.5 text-outline">
                    +91 {b.phoneNumber}
                    {b.email && <span className="block">{b.email}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">{b.orders}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{inr(b.spent)}</td>
                  <td className="px-4 py-2.5">
                    {new Date(b.lastOrderAt).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-ivory-200 px-4 py-2.5 text-right">
        <Link to="/shop-admin/orders" className="text-[11px] font-bold uppercase tracking-wider text-burgundy hover:underline">
          Go to online orders
        </Link>
      </div>
    </section>
  );
}
