import {useMemo, useState} from 'react';
import {
  useBranchProductPrices,
  useSaveBranchPrices,
  useScheduleBulkPrice,
} from '@/lib/react-query/queriesAndMutations/branchPricing';
import type {BulkPriceInput, PriceTab} from '@/lib/api/branchPricing';
import {useDebounceValue} from 'usehooks-ts';
import toast from 'react-hot-toast';

const inr = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;

const TABS: {key: PriceTab; label: string; count: 'all' | 'changedThisWeek' | 'belowMinMargin'}[] = [
  {key: 'ALL', label: 'All', count: 'all'},
  {key: 'CHANGED_THIS_WEEK', label: 'Changed this week', count: 'changedThisWeek'},
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
  const savePrices = useSaveBranchPrices();
  const bulk = useScheduleBulkPrice();

  // Only prices the user actually changed
  const [edits, setEdits] = useState<Record<string, string>>({});
  const items = data?.items ?? [];
  const changed = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(edits)
          .map(([id, v]) => [id, Number(v)] as const)
          .filter(([id, v]) => {
            const item = items.find((i) => i.id === id);
            return item && v > 0 && v !== item.branchPrice;
          }),
      ),
    [edits, items],
  );
  const changedCount = Object.keys(changed).length;

  const save = async () => {
    const tooHigh = items.find((i) => changed[i.id] > i.mrp);
    if (tooHigh) {
      toast.error(`${tooHigh.name}: price cannot be more than MRP ${inr(tooHigh.mrp)}`);
      return;
    }
    await savePrices.mutateAsync(changed);
    setEdits({});
  };

  const [bulkInput, setBulkInput] = useState<BulkPriceInput>({
    categoryId: '',
    changeType: 'PERCENT_OFF_MRP',
    value: 10,
  });
  const applyBulk = async () => {
    if (!(bulkInput.value > 0)) {
      toast.error('Enter a value more than 0');
      return;
    }
    await bulk.mutateAsync({...bulkInput, categoryId: bulkInput.categoryId || undefined});
  };

  const categories = data?.categories ?? [];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-caps uppercase tracking-wider text-outline">
            Stock / Products & Prices
          </p>
          <h1 className="font-serif text-headline-md font-normal text-burgundy-deep">
            Products & price list
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Selling prices of all products in the branch's shops. The price can't go above MRP;
            the POS bills at this price.
          </p>
        </div>
        <button
          onClick={save}
          disabled={!changedCount || savePrices.isPending}
          className="self-start rounded bg-burgundy-deep px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
        >
          {savePrices.isPending
            ? 'Saving…'
            : changedCount
              ? `Save ${changedCount} change${changedCount === 1 ? '' : 's'}`
              : 'Save prices'}
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                tab === t.key ? 'bg-burgundy-deep text-white' : 'text-on-surface-variant hover:bg-ivory-100'
              }`}
            >
              {t.label} <span className="ml-1 opacity-80">{data?.counts[t.count] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
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
                  <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && !items.length && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                    No products found.
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const value = edits[item.id] ?? String(item.branchPrice);
                const low =
                  item.margin !== null && data && item.margin < data.minMargin;
                return (
                  <tr key={item.id} className={changed[item.id] ? 'bg-amber-50/60' : ''}>
                    <td className="px-3 py-3">
                      <p className="font-medium text-espresso">{item.name}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {item.code} · {item.category} · GST {item.taxRate}%
                      </p>
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant">{item.shop?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-right font-mono">{inr(item.avgCost)}</td>
                    <td className="px-3 py-3 text-right font-mono">{inr(item.mrp)}</td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min="1"
                        max={item.mrp}
                        step="0.01"
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => setEdits((p) => ({...p, [item.id]: e.target.value}))}
                        className="w-24 rounded border border-ivory-300 px-2 py-1 text-right font-mono focus:border-burgundy-deep focus:outline-none"
                        aria-label={`Price of ${item.name}`}
                      />
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono ${low ? 'font-semibold text-red-700' : ''}`}
                    >
                      {item.margin === null ? '—' : `${item.margin}%`}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{item.stock}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-ivory-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="font-serif text-lg text-burgundy-deep">Change many prices</h3>
          <p className="text-body-sm text-on-surface-variant">
            Sets the price from MRP for every product in a category, right away. The price never
            goes above MRP or below ₹1.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={bulkInput.categoryId}
            onChange={(e) => setBulkInput((b) => ({...b, categoryId: e.target.value}))}
            className={field}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={bulkInput.changeType}
            onChange={(e) =>
              setBulkInput((b) => ({...b, changeType: e.target.value as BulkPriceInput['changeType']}))
            }
            className={field}
          >
            <option value="PERCENT_OFF_MRP">% off MRP</option>
            <option value="FLAT_OFF_MRP">₹ off MRP</option>
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            value={bulkInput.value}
            onChange={(e) => setBulkInput((b) => ({...b, value: Number(e.target.value)}))}
            className={field}
            aria-label="Value"
          />
        </div>
        <button
          onClick={applyBulk}
          disabled={bulk.isPending}
          className="rounded border border-burgundy-deep px-4 py-2 text-xs font-semibold uppercase tracking-wider text-burgundy-deep transition hover:bg-burgundy-deep/5 disabled:opacity-50"
        >
          {bulk.isPending ? 'Applying…' : 'Apply now'}
        </button>
      </div>
    </div>
  );
}
