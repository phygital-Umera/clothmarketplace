import {useState} from 'react';
import {useBranchProductPrices} from '@/lib/react-query/queriesAndMutations/branchPricing';
import type {PriceTab} from '@/lib/api/branchPricing';
import {useDebounceValue} from 'usehooks-ts';

const inr = (n: number | null | undefined) =>
  n === null || n === undefined
    ? '—'
    : `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;

const TABS: {
  key: PriceTab;
  label: string;
  count: 'all' | 'changedThisWeek' | 'belowMinMargin';
}[] = [
  {key: 'ALL', label: 'All', count: 'all'},
  {
    key: 'CHANGED_THIS_WEEK',
    label: 'Changed this week',
    count: 'changedThisWeek',
  },
  {key: 'BELOW_MIN_MARGIN', label: 'Below min margin', count: 'belowMinMargin'},
];

const field =
  'w-full rounded border border-ivory-300 bg-white px-3 py-2 text-body-sm text-espresso focus:border-burgundy-deep focus:outline-none';

export default function BranchProductPricingPage() {
  const [tab, setTab] = useState<PriceTab>('ALL');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounceValue(search.trim(), 300);

  const {data, isLoading} = useBranchProductPrices({
    tab,
    categoryId: categoryId || undefined,
    search: debouncedSearch || undefined,
  });
  const items = data?.items ?? [];
  const categories = data?.categories ?? [];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-caps uppercase tracking-wider text-outline">
            Stock / Products & Prices
          </p>
          <h1 className="font-serif text-headline-lg-mobile font-normal text-burgundy md:text-headline-md">
            Products & price list
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Selling prices of all products in the branch's shops. Each shop sets
            its own prices; this list only shows them.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                tab === t.key
                  ? 'bg-burgundy-deep text-white'
                  : 'text-on-surface-variant hover:bg-ivory-100'
              }`}
            >
              {t.label}{' '}
              <span className="ml-1 opacity-80">
                {data?.counts[t.count] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={field}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or SKU"
            className={field}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-ivory-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead>
              <tr className="border-b border-ivory-200 bg-ivory-50 text-[10px] font-semibold uppercase tracking-wider text-outline">
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Shop</th>
                <th className="px-3 py-3 text-right">Avg cost</th>
                <th className="px-3 py-3 text-right">MRP</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3 text-right">Margin</th>
                <th className="px-3 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-on-surface-variant"
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && !items.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-on-surface-variant"
                  >
                    No products found.
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const low =
                  item.margin !== null && data && item.margin < data.minMargin;
                return (
                  <tr key={item.id}>
                    <td className="px-3 py-3">
                      <p className="font-medium text-espresso">{item.name}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {item.code} · {item.category} · GST {item.taxRate}%
                      </p>
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant">
                      {item.shop?.name ?? '—'}
                    </td>
                    <td className="font-mono px-3 py-3 text-right">
                      {inr(item.avgCost)}
                    </td>
                    <td className="font-mono px-3 py-3 text-right">
                      {inr(item.mrp)}
                    </td>
                    <td className="font-mono px-3 py-3 text-right">
                      {inr(item.branchPrice)}
                    </td>
                    <td
                      className={`font-mono px-3 py-3 text-right ${low ? 'font-semibold text-red-700' : ''}`}
                    >
                      {item.margin === null ? '—' : `${item.margin}%`}
                    </td>
                    <td className="font-mono px-3 py-3 text-right">
                      {item.stock}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
