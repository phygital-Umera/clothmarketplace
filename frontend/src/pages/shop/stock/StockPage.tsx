import React, {useState, useEffect, useMemo} from 'react';
import {useNavigate} from '@tanstack/react-router';
import toast from 'react-hot-toast';
import {format, parseISO} from 'date-fns';
import {
  useStockSummary,
  useAdjustStock,
  usePhysicalStockCount,
} from '@/lib/react-query/queriesAndMutations/stock';
import {
  StockPeriod,
  StockTab,
  StockItemRow,
  AdjustStockPayload,
  PhysicalStockCountItem,
} from '@/types/stock';
import {
  Search,
  Plus,
  SlidersHorizontal,
  ClipboardCheck,
  ChevronDown,
  X,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  ArrowUpDown,
  Barcode,
} from 'lucide-react';

interface StockPageProps {
  panel?: 'shop-admin' | 'branch-admin';
}

const PERIOD_OPTIONS: {id: StockPeriod; label: string}[] = [
  {id: 'this-month', label: 'This month'},
  {id: 'today', label: 'Today'},
  {id: 'this-week', label: 'This week'},
  {id: 'last-30-days', label: 'Last 30 days'},
  {id: 'all-time', label: 'All time'},
];

const ADJUST_REASONS = [
  'Damage in transit/handling',
  'Display piece shrinkage',
  'Physical audit variance',
  'Supplier return rejected',
  'Promotion/Sample gift',
  'Customer exchange adjustment',
  'Other',
];

export default function StockPage({panel = 'shop-admin'}: StockPageProps) {

  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<StockTab>('STOCK_SUMMARY');
  const [selectedPeriod, setSelectedPeriod] = useState<StockPeriod>('this-month');
  const [search, setSearch] = useState('');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  // Modals
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Stock Adjustment Form State
  const [adjustPayload, setAdjustPayload] = useState<AdjustStockPayload>({
    variantId: '',
    type: 'DECREASE',
    quantity: 1,
    reason: 'Damage in transit/handling',
    notes: '',
  });

  // Physical Audit State
  const [auditCounts, setAuditCounts] = useState<Record<string, number>>({});
  const [auditNotes, setAuditNotes] = useState('');

  // Query
  const {data, isLoading, isFetching} = useStockSummary(panel, {
    period: selectedPeriod,
    tab: activeTab,
    search,
  });

  // Mutations
  const adjustMutation = useAdjustStock(panel);
  const auditMutation = usePhysicalStockCount(panel);

  const metrics = data?.metrics;
  const counts = data?.counts;
  const items: StockItemRow[] = data?.items || [];

  // The selected period with the dates the server counted, e.g. "This month (1 Nov – 12 Nov)"
  const periodName = PERIOD_OPTIONS.find((p) => p.id === selectedPeriod)?.label;
  const range = data?.period;
  const periodLabel = !range?.from
    ? periodName
    : range.from === range.to
      ? `${periodName} (${format(parseISO(range.to), 'd MMM')})`
      : `${periodName} (${format(parseISO(range.from), 'd MMM')} – ${format(parseISO(range.to), 'd MMM')})`;
  const pcs = (n?: number) =>
    n === undefined ? '—' : `${n.toLocaleString('en-IN')} pcs`;

  // When clicking Adjust on a specific row
  const openAdjustForRow = (item: StockItemRow) => {
    setAdjustPayload({
      variantId: item.variantId,
      type: 'DECREASE',
      quantity: 1,
      reason: 'Display piece shrinkage',
      notes: '',
    });
    setAdjustModalOpen(true);
  };

  // Open Physical Stock Count Modal with current items
  const openAuditModal = () => {
    const initialMap: Record<string, number> = {};
    items.forEach((it) => {
      initialMap[it.variantId] = it.closing;
    });
    setAuditCounts(initialMap);
    setAuditNotes('');
    setAuditModalOpen(true);
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustPayload.variantId) {
      toast.error('Please select an item');
      return;
    }
    if (adjustPayload.quantity <= 0) {
      toast.error('Quantity must be at least 1');
      return;
    }

    try {
      await adjustMutation.mutateAsync(adjustPayload);
      toast.success('Stock adjusted successfully');
      setAdjustModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to adjust stock');
    }
  };

  // Submit Physical Audit
  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payloadItems: PhysicalStockCountItem[] = items.map((it) => ({
      variantId: it.variantId,
      systemQty: it.closing,
      countedQty: auditCounts[it.variantId] !== undefined ? auditCounts[it.variantId] : it.closing,
      reason: 'Physical stock reconciliation',
    }));

    try {
      await auditMutation.mutateAsync({
        notes: auditNotes,
        items: payloadItems,
      });
      toast.success('Physical stock count reconciled successfully');
      setAuditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record audit');
    }
  };

  // Format INR helper
  const formatInr = (n?: number | null) => {
    if (n === null || n === undefined) return '—';
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-4 font-sans text-espresso">
      {/* Top Breadcrumb & Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-1">
            STOCK / STOCK
          </div>
          <h1 className="font-serif text-headline-lg-mobile font-normal text-burgundy md:text-headline-md">
            Stock
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Live stock by item and size, with every movement from purchase, sale, return, transfer and adjustment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={openAuditModal}
            className="flex items-center gap-2 rounded-md border border-burgundy bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-burgundy shadow-sm hover:bg-stone-50 transition-colors"
          >
            <ClipboardCheck size={14} />
            Physical Stock Count
          </button>

          <button
            onClick={() => setAdjustModalOpen(true)}
            className="flex items-center gap-2 rounded-md border border-burgundy bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-burgundy shadow-sm hover:bg-stone-50 transition-colors"
          >
            <SlidersHorizontal size={14} />
            Adjust
          </button>

          <button
            onClick={() => navigate({to: '/shop-admin/purchase-bills'})}
            className="flex items-center gap-2 rounded-md bg-burgundy px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-burgundy-deep transition-colors"
          >
            <Plus size={15} />
            Purchase
          </button>
        </div>
      </div>

      {/* 5 Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        {/* Card 1: SELLABLE STOCK */}
        <div className="rounded-lg border border-stone-200/90 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">
            SELLABLE STOCK
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-stone-900 tracking-tight">
            {pcs(metrics?.sellablePcs)}
          </div>
          <div className="mt-1 text-xs text-stone-500">
            {metrics ? `${metrics.sellableItemSizes} item-sizes` : '—'}
          </div>
        </div>

        {/* Card 2: VALUE AT COST */}
        <div className="rounded-lg border border-stone-200/90 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">
            VALUE AT COST
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-stone-900 tracking-tight">
            {/* No purchase bill yet means no cost: show "—", not a guess */}
            {metrics && (metrics.costValue || !metrics.withoutCost)
              ? formatInr(metrics.costValue)
              : '—'}
          </div>
          <div className="mt-1 text-xs text-stone-500">
            {metrics ? `At MRP ${formatInr(metrics.mrpValue)}` : '—'}
            {!!metrics?.withoutCost &&
              ` · ${metrics.withoutCost} item-sizes without cost`}
          </div>
        </div>

        {/* Card 3: DAMAGED */}
        <div className="rounded-lg border border-stone-200/90 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">
            DAMAGED
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-stone-900 tracking-tight">
            {pcs(metrics?.damagedPcs)}
          </div>
          <div className="mt-1 text-xs text-stone-500">
            {metrics ? `${metrics.damagedItemSizes} item-sizes` : '—'}
          </div>
        </div>

        {/* Card 4: LOW / OUT */}
        <div className="rounded-lg border border-stone-200/90 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">
            LOW / OUT
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-stone-900 tracking-tight">
            {metrics ? `${metrics.lowCount} / ${metrics.outCount}` : '—'}
          </div>
          <div className="mt-1 text-xs text-stone-500">Reorder</div>
        </div>

        {/* Card 5: SLOW MOVERS */}
        <div className="rounded-lg border border-stone-200/90 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">
            SLOW MOVERS
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-stone-900 tracking-tight">
            {metrics?.slowCount ?? '—'}
          </div>
          <div className="mt-1 text-xs text-stone-500">
            {metrics ? `No sale in ${metrics.slowDays} days` : '—'}
          </div>
        </div>
      </div>

      {/* Main Stock Table Container */}
      <div className="rounded-xl border border-stone-200/90 bg-white shadow-sm overflow-hidden">
        {/* Tabs & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 px-5 py-3 gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('STOCK_SUMMARY')}
              className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors relative whitespace-nowrap ${
                activeTab === 'STOCK_SUMMARY'
                  ? 'text-burgundy border-b-2 border-burgundy font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Stock Summary
            </button>

            <button
              onClick={() => setActiveTab('LOW_OUT')}
              className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'LOW_OUT'
                  ? 'text-burgundy border-b-2 border-burgundy font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Low / Out</span>
              <span className="inline-flex items-center justify-center rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-700">
                {counts?.lowOut ?? '—'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DAMAGED')}
              className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors relative whitespace-nowrap ${
                activeTab === 'DAMAGED'
                  ? 'text-burgundy border-b-2 border-burgundy font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Damaged
            </button>

            <button
              onClick={() => setActiveTab('SLOW_MOVING')}
              className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors relative whitespace-nowrap ${
                activeTab === 'SLOW_MOVING'
                  ? 'text-burgundy border-b-2 border-burgundy font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Slow Moving
            </button>
          </div>

          {/* Right Controls: Period Dropdown & Search Input */}
          <div className="flex items-center gap-3">
            {/* Period Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPeriodDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-md border border-stone-200/90 bg-ivory-50 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <span>{periodLabel}</span>
                <ChevronDown size={14} className="text-stone-400" />
              </button>

              {periodDropdownOpen && (
                <div className="absolute right-0 mt-1 z-30 w-48 rounded-md border border-stone-200 bg-white py-1 shadow-lg">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedPeriod(opt.id);
                        setPeriodDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        selectedPeriod === opt.id
                          ? 'bg-burgundy/10 text-burgundy font-semibold'
                          : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                placeholder="Item or scan barcode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-stone-200/90 bg-ivory-50 pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-burgundy focus:bg-white focus:outline-none transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Stock Movement Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-ivory-50 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3.5">ITEM / SIZE</th>
                <th className="px-3 py-3.5 text-center">OPENING</th>
                <th className="px-3 py-3.5 text-center">+ PURCHASE</th>
                <th className="px-3 py-3.5 text-center">- SOLD</th>
                <th className="px-3 py-3.5 text-center">+ SALES RETURN</th>
                <th className="px-3 py-3.5 text-center">± TRANSFER</th>
                <th className="px-3 py-3.5 text-center">± ADJUST</th>
                <th className="px-3 py-3.5 text-center font-bold text-stone-700">CLOSING</th>
                <th className="px-5 py-3.5 text-right">VALUE (COST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-stone-400">
                    Loading live stock movements...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-stone-400">
                    No items found for the selected tab and filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openAdjustForRow(row)}
                    className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Item / Size & Barcode */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-stone-900 group-hover:text-burgundy transition-colors">
                        {row.productName}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono tracking-tight mt-0.5">
                        {row.size} · {row.barcode}
                      </div>
                    </td>

                    {/* Opening */}
                    <td className="px-3 py-3.5 text-center font-mono text-stone-600">
                      {row.opening}
                    </td>

                    {/* + Purchase */}
                    <td className="px-3 py-3.5 text-center font-mono font-medium">
                      {row.purchase > 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          +{row.purchase}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* - Sold */}
                    <td className="px-3 py-3.5 text-center font-mono font-medium">
                      {row.sold > 0 ? (
                        <span className="text-rose-700 font-semibold">
                          -{row.sold}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* + Sales Return */}
                    <td className="px-3 py-3.5 text-center font-mono font-medium">
                      {row.salesReturn > 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          +{row.salesReturn}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* ± Transfer */}
                    <td className="px-3 py-3.5 text-center font-mono text-stone-700 font-medium">
                      {row.transfer !== 0 ? (
                        <span>{row.transfer > 0 ? `+${row.transfer}` : row.transfer}</span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* ± Adjust */}
                    <td className="px-3 py-3.5 text-center font-mono text-stone-700 font-medium">
                      {row.adjust !== 0 ? (
                        <span>{row.adjust > 0 ? `+${row.adjust}` : row.adjust}</span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* Closing */}
                    <td className="px-3 py-3.5 text-center font-mono font-bold text-stone-900">
                      {row.closing === 0 ? (
                        <span className="text-rose-600 font-bold">0</span>
                      ) : row.closing <= row.threshold ? (
                        <span className="text-amber-700 font-bold">{row.closing}</span>
                      ) : (
                        row.closing
                      )}
                    </td>

                    {/* Value (Cost) */}
                    <td className="px-5 py-3.5 text-right font-mono text-stone-700 font-medium">
                      {formatInr(row.valueCost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-[8px] p-4">
          <div className="max-h-[90vh] overflow-y-auto w-full max-w-md rounded-xl bg-white p-4 sm:p-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-burgundy-deep">
                  Adjust Stock
                </h3>
                <p className="text-xs text-stone-500">
                  Update inventory count or record loss/damage for a variant.
                </p>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              {/* Variant Selector */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Item / Variant *
                </label>
                <select
                  value={adjustPayload.variantId}
                  onChange={(e) =>
                    setAdjustPayload((prev) => ({...prev, variantId: e.target.value}))
                  }
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-xs focus:border-burgundy focus:outline-none"
                  required
                >
                  <option value="">Select variant</option>
                  {items.map((it) => (
                    <option key={it.variantId} value={it.variantId}>
                      {it.productName} ({it.size}) · On hand: {it.closing}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['INCREASE', 'DECREASE', 'CORRECTION', 'DAMAGE'] as const).map(
                    (type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() =>
                          setAdjustPayload((prev) => ({...prev, type}))
                        }
                        className={`rounded-md border py-2 text-center font-medium transition-all ${
                          adjustPayload.type === type
                            ? 'border-burgundy bg-burgundy text-white font-semibold'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {type === 'INCREASE' && '+ Increase'}
                        {type === 'DECREASE' && '- Decrease'}
                        {type === 'CORRECTION' && '= Set Exact'}
                        {type === 'DAMAGE' && '⚠ Flag Damage'}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {adjustPayload.type === 'CORRECTION'
                    ? 'New Physical Count *'
                    : 'Adjustment Quantity *'}
                </label>
                <input
                  type="number"
                  min={adjustPayload.type === 'CORRECTION' ? 0 : 1}
                  value={adjustPayload.quantity}
                  onChange={(e) =>
                    setAdjustPayload((prev) => ({
                      ...prev,
                      quantity: parseInt(e.target.value || '0', 10),
                    }))
                  }
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-xs font-mono focus:border-burgundy focus:outline-none"
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Reason *
                </label>
                <select
                  value={adjustPayload.reason}
                  onChange={(e) =>
                    setAdjustPayload((prev) => ({...prev, reason: e.target.value}))
                  }
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-xs focus:border-burgundy focus:outline-none"
                  required
                >
                  {ADJUST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={adjustPayload.notes}
                  onChange={(e) =>
                    setAdjustPayload((prev) => ({...prev, notes: e.target.value}))
                  }
                  placeholder="Additional context or rack/bin details..."
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-xs focus:border-burgundy focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="rounded-md border border-stone-200 px-4 py-2 font-medium text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="rounded-md bg-burgundy px-5 py-2 font-semibold text-white hover:bg-burgundy-deep disabled:opacity-50"
                >
                  {adjustMutation.isPending ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Physical Stock Count Modal */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-[8px] p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-4 sm:p-5 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-burgundy-deep">
                  Physical Stock Count (Audit)
                </h3>
                <p className="text-xs text-stone-500">
                  Verify actual counted inventory on the shop floor. Variances will be automatically reconciled.
                </p>
              </div>
              <button
                onClick={() => setAuditModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAuditSubmit} className="flex-1 flex flex-col overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto mb-4 border border-stone-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 sticky top-0">
                      <th className="px-4 py-2.5">Item & Variant</th>
                      <th className="px-3 py-2.5 text-center">System Stock</th>
                      <th className="px-4 py-2.5 text-center w-32">Physical Counted</th>
                      <th className="px-3 py-2.5 text-center">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    {items.map((it) => {
                      const counted = auditCounts[it.variantId] !== undefined ? auditCounts[it.variantId] : it.closing;
                      const variance = counted - it.closing;
                      return (
                        <tr key={it.variantId} className="hover:bg-stone-50/50">
                          <td className="px-4 py-2 font-sans font-medium text-stone-900">
                            {it.productName} ({it.size})
                            <div className="text-[10px] text-stone-400 font-mono">
                              {it.barcode}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center text-stone-600">
                            {it.closing}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={counted}
                              onChange={(e) => {
                                const val = parseInt(e.target.value || '0', 10);
                                setAuditCounts((prev) => ({
                                  ...prev,
                                  [it.variantId]: isNaN(val) ? 0 : val,
                                }));
                              }}
                              className="w-24 rounded border border-stone-200 px-2 py-1 text-center font-bold text-stone-900 focus:border-burgundy focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            {variance === 0 ? (
                              <span className="text-stone-300">0</span>
                            ) : variance > 0 ? (
                              <span className="text-emerald-700">+{variance}</span>
                            ) : (
                              <span className="text-rose-700">{variance}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block font-semibold text-stone-700 mb-1">
                  Audit Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Month-end floor count"
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-xs focus:border-burgundy focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setAuditModalOpen(false)}
                  className="rounded-md border border-stone-200 px-4 py-2 font-medium text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={auditMutation.isPending}
                  className="rounded-md bg-burgundy px-5 py-2 font-semibold text-white hover:bg-burgundy-deep disabled:opacity-50"
                >
                  {auditMutation.isPending ? 'Reconciling...' : 'Reconcile & Save Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

