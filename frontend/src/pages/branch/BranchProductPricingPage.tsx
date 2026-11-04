import {useState, useEffect} from 'react';
import {
  useBranchProductPrices,
  useSaveBranchPrices,
  useScheduleBulkPrice,
} from '@/lib/react-query/queriesAndMutations/branchPricing';
import {Search, Upload, Printer} from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n: number) =>
  `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

type TabType = 'ALL' | 'CHANGED_THIS_WEEK' | 'BELOW_MIN_MARGIN';

export default function BranchProductPricingPage() {
  const [tab, setTab] = useState<TabType>('ALL');
  const [category, setCategory] = useState('All categories');
  const [search, setSearch] = useState('');

  const {data, isLoading, refetch} = useBranchProductPrices({
    tab,
    category: category === 'All categories' ? undefined : category,
    search: search.trim() || undefined,
  });

  const savePricesMutation = useSaveBranchPrices();
  const scheduleBulkMutation = useScheduleBulkPrice();

  // Local state for editable prices
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (data?.items) {
      const initial: Record<string, number> = {};
      data.items.forEach((item) => {
        initial[item.id] = item.branchPrice;
      });
      setEditedPrices(initial);
    }
  }, [data]);

  const handlePriceChange = (id: string, val: number) => {
    setEditedPrices((prev) => ({
      ...prev,
      [id]: Math.max(0, val),
    }));
  };

  const handleSavePrices = async () => {
    await savePricesMutation.mutateAsync(editedPrices);
    refetch();
  };

  // Bulk price states
  const [bulkApplyTo, setBulkApplyTo] = useState('Category: Kids');
  const [bulkChange, setBulkChange] = useState('Discount % off MRP');
  const [bulkValue, setBulkValue] = useState(20);
  const [bulkFrom, setBulkFrom] = useState('2026-11-10');
  const [bulkTo, setBulkTo] = useState('2026-11-17');
  const [bulkName, setBulkName] = useState('Kids week');

  const handleScheduleBulk = async () => {
    await scheduleBulkMutation.mutateAsync({
      applyTo: bulkApplyTo,
      changeType: bulkChange,
      value: bulkValue,
      fromDate: bulkFrom,
      toDate: bulkTo,
      name: bulkName,
    });
    refetch();
  };

  const items = data?.items || [];
  const counts = data?.counts || {all: 298, changedThisWeek: 4, belowMinMargin: 1};

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-caps uppercase text-ivory-600 tracking-wider">
            Stock / Products & Prices
          </p>
          <h1 className="font-serif text-headline-md font-normal text-burgundy-deep">
            Products & price list
          </h1>
          <p className="mt-1 text-body-sm text-espresso-muted">
            One price list for all shops in the branch. MRP comes from the company; you can set the branch sale price within the allowed range.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toast('Import Excel opened', {icon: '📊'})}
            className="btn-outline flex items-center gap-1.5 border-burgundy/30 text-burgundy hover:bg-burgundy/5"
          >
            <Upload size={15} />
            <span>IMPORT EXCEL</span>
          </button>
          <button
            type="button"
            onClick={() => toast('Price labels ready for print', {icon: '🏷️'})}
            className="btn-outline flex items-center gap-1.5 border-burgundy/30 text-burgundy hover:bg-burgundy/5"
          >
            <Printer size={15} />
            <span>PRINT PRICE LABELS</span>
          </button>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="space-y-4 rounded-lg border border-ivory-300 bg-white p-5 shadow-sm">
        {/* Tabs and Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-ivory-200 pb-3">
          <div className="flex border-b lg:border-b-0 border-ivory-200">
            <button
              type="button"
              onClick={() => setTab('ALL')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-label-caps font-semibold uppercase transition-colors ${
                tab === 'ALL'
                  ? 'border-burgundy text-burgundy'
                  : 'border-transparent text-espresso-muted hover:text-espresso'
              }`}
            >
              <span>All</span>
              <span className="rounded bg-ivory-200 px-1.5 py-0.2 text-[11px] text-espresso">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('CHANGED_THIS_WEEK')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-label-caps font-semibold uppercase transition-colors ${
                tab === 'CHANGED_THIS_WEEK'
                  ? 'border-burgundy text-burgundy'
                  : 'border-transparent text-espresso-muted hover:text-espresso'
              }`}
            >
              <span>Price Changed This Week</span>
              <span className="rounded bg-ivory-200 px-1.5 py-0.2 text-[11px] text-espresso">
                {counts.changedThisWeek}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('BELOW_MIN_MARGIN')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-label-caps font-semibold uppercase transition-colors ${
                tab === 'BELOW_MIN_MARGIN'
                  ? 'border-burgundy text-burgundy'
                  : 'border-transparent text-espresso-muted hover:text-espresso'
              }`}
            >
              <span>Below Min Margin</span>
              <span className="rounded bg-error/10 px-1.5 py-0.2 text-[11px] font-semibold text-error">
                {counts.belowMinMargin}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded border border-ivory-300 bg-white px-3 py-1.5 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            >
              <option value="All categories">All categories</option>
              <option value="Men's">Men's</option>
              <option value="Women's">Women's</option>
              <option value="Kids">Kids</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-2 text-ivory-600" size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, code, barcode"
                className="w-48 sm:w-64 rounded border border-ivory-300 bg-ivory-50/50 py-1.5 pl-8 pr-3 text-body-sm text-espresso placeholder-espresso-muted/60 focus:border-burgundy focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-body-sm">
            <thead>
              <tr className="border-b border-ivory-300 text-label-caps uppercase text-ivory-600">
                <th className="py-2.5 pl-3 pr-2 font-medium">Product</th>
                <th className="px-2 py-2.5 font-medium">HSN / GST</th>
                <th className="px-2 py-2.5 text-right font-medium">Avg Cost</th>
                <th className="px-2 py-2.5 text-right font-medium">MRP</th>
                <th className="px-2 py-2.5 text-right font-medium">Branch Price</th>
                <th className="px-2 py-2.5 text-right font-medium">Margin</th>
                <th className="px-2 py-2.5 text-center font-medium">Men's</th>
                <th className="px-2 py-2.5 text-center font-medium">Women's</th>
                <th className="py-2.5 pl-2 pr-3 text-center font-medium">Kids</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-espresso-muted">
                    Loading product pricing...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-espresso-muted">
                    No products found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const currentBranchPrice = editedPrices[item.id] ?? item.branchPrice;
                  const calculatedMargin =
                    currentBranchPrice > 0
                      ? Math.round(((currentBranchPrice - item.avgCost) / currentBranchPrice) * 1000) / 10
                      : 0;
                  const isBelowMin = calculatedMargin < 25;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-ivory-50 ${
                        isBelowMin ? '!bg-[#FDF4F4]' : ''
                      }`}
                    >
                      <td className="py-3 pl-3 pr-2">
                        <p className="font-serif font-medium text-espresso">{item.name}</p>
                        <p className="text-[11px] text-espresso-muted">{item.code}</p>
                      </td>
                      <td className="px-2 py-3 text-espresso-muted">{item.hsnGst}</td>
                      <td className="px-2 py-3 text-right text-espresso">{inr(item.avgCost)}</td>
                      <td className="px-2 py-3 text-right text-espresso-muted">{inr(item.mrp)}</td>
                      <td className="px-2 py-3 text-right">
                        <input
                          type="number"
                          value={currentBranchPrice}
                          onChange={(e) =>
                            handlePriceChange(item.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 rounded border border-ivory-300 bg-ivory-50/50 py-1 text-right text-xs font-medium text-espresso pr-1 focus:border-burgundy focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-3 text-right font-medium">
                        <span className={isBelowMin ? 'text-error font-bold' : 'text-emerald-700'}>
                          {calculatedMargin}%
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-espresso">{item.mensStock}</td>
                      <td className="px-2 py-3 text-center text-espresso">{item.womensStock}</td>
                      <td className="py-3 pl-2 pr-3 text-center text-espresso">{item.kidsStock}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer save note */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-ivory-200 pt-3">
          <p className="text-body-sm text-espresso-muted">
            Price changes apply to all 3 shop counters from the next bill
          </p>
          <button
            type="button"
            onClick={handleSavePrices}
            disabled={savePricesMutation.isPending}
            className="btn-primary bg-burgundy hover:bg-burgundy-deep text-white shadow-sm self-end"
          >
            SAVE PRICES
          </button>
        </div>
      </div>

      {/* Bulk Price Change Card */}
      <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm space-y-4">
        <h3 className="font-serif text-title-lg font-normal text-burgundy-deep border-b border-ivory-200 pb-2">
          Bulk price change
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-body-sm">
          <div>
            <label className="block text-label-caps uppercase text-ivory-600">Apply To</label>
            <select
              value={bulkApplyTo}
              onChange={(e) => setBulkApplyTo(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
            >
              <option value="Category: Kids">Category: Kids</option>
              <option value="Category: Men's">Category: Men's</option>
              <option value="Category: Women's">Category: Women's</option>
              <option value="All categories">All categories</option>
            </select>
          </div>

          <div>
            <label className="block text-label-caps uppercase text-ivory-600">Change</label>
            <select
              value={bulkChange}
              onChange={(e) => setBulkChange(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
            >
              <option value="Discount % off MRP">Discount % off MRP</option>
              <option value="Flat ₹ off MRP">Flat ₹ off MRP</option>
              <option value="Set Margin %">Set Margin %</option>
            </select>
          </div>

          <div>
            <label className="block text-label-caps uppercase text-ivory-600">Value</label>
            <input
              type="number"
              value={bulkValue}
              onChange={(e) => setBulkValue(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-label-caps uppercase text-ivory-600">From</label>
            <input
              type="date"
              value={bulkFrom}
              onChange={(e) => setBulkFrom(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-label-caps uppercase text-ivory-600">To</label>
            <input
              type="date"
              value={bulkTo}
              onChange={(e) => setBulkTo(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-label-caps uppercase text-ivory-600">
              Name (Shows on Bill)
            </label>
            <input
              type="text"
              value={bulkName}
              onChange={(e) => setBulkName(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded border border-burgundy/20 bg-[#FDF4F4] p-3 text-body-sm text-burgundy-deep">
          Items that would go below the company minimum margin (25%) are skipped and listed for review.
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => toast('Preview 64 items opened', {icon: '🔍'})}
            className="btn-outline border-burgundy/30 text-burgundy hover:bg-burgundy/5"
          >
            PREVIEW 64 ITEMS
          </button>
          <button
            type="button"
            onClick={handleScheduleBulk}
            disabled={scheduleBulkMutation.isPending}
            className="btn-primary bg-burgundy hover:bg-burgundy-deep text-white shadow-sm"
          >
            SCHEDULE
          </button>
        </div>
      </div>
    </div>
  );
}

