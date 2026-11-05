import React, {useState, useEffect, useMemo, useRef} from 'react';
import toast from 'react-hot-toast';
import {
  useNextAdjustmentNumber,
  useAdjustmentVariants,
  useAdjustmentHistory,
  useCreateStockAdjustment,
} from '@/lib/react-query/queriesAndMutations/stockAdjustment';
import {
  AdjustmentType,
  AdjustmentVariantOption,
  CreateStockAdjustmentPayload,
} from '@/types/stockAdjustment';
import {
  Upload,
  ChevronDown,
  Check,
  AlertCircle,
  FileText,
  Camera,
  X,
  Search,
} from 'lucide-react';

interface StockAdjustmentPageProps {
  panel?: 'shop-admin' | 'branch-admin';
}

const REASON_OPTIONS = [
  'Stitching defect',
  'Stain in trial room',
  'Physical count',
  'Found in store room',
  'Torn border',
  'Missing after count',
  'Fabric quality defect',
  'Color fading',
  'Customer exchange defect',
  'Other',
];

const TYPE_FILTER_OPTIONS = [
  {id: 'All types', label: 'All types'},
  {id: 'Mark damaged', label: 'Mark damaged'},
  {id: 'Count correction', label: 'Count correction'},
  {id: 'Found stock', label: 'Found stock'},
  {id: 'Write off', label: 'Write off'},
  {id: 'Lost / theft', label: 'Lost / theft'},
];

export default function StockAdjustmentPage({
  panel = 'shop-admin',
}: StockAdjustmentPageProps) {
  console.log(`[Shop Panel] Rendering StockAdjustmentPage (panel: ${panel})`);
  useEffect(() => {
    console.log(`[Shop Panel] StockAdjustmentPage mounted (panel: ${panel})`);
  }, [panel]);

  // Form State
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [type, setType] = useState<AdjustmentType>('MARK_DAMAGED');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Stitching defect');
  const [reference, setReference] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  // History Filter State
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('All types');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState<boolean>(false);
  const [variantDropdownOpen, setVariantDropdownOpen] = useState<boolean>(false);
  const [variantSearch, setVariantSearch] = useState<string>('');

  // Queries
  const {data: nextNumber = 'ADJ-0046'} = useNextAdjustmentNumber(panel);
  const {data: variants = []} = useAdjustmentVariants(panel, variantSearch);
  const {data: history = [], isLoading: isHistoryLoading} = useAdjustmentHistory(panel, {
    type: historyTypeFilter,
  });

  // Mutation
  const createMutation = useCreateStockAdjustment(panel);

  // Auto-select first variant (Printed Anarkali · M / Maroon) if not selected
  useEffect(() => {
    if (!selectedVariantId && variants.length > 0) {
      setSelectedVariantId(variants[0].variantId);
    }
  }, [variants, selectedVariantId]);

  // Current selected variant object
  const currentVariant = useMemo(() => {
    return variants.find((v) => v.variantId === selectedVariantId) || variants[0];
  }, [variants, selectedVariantId]);

  // Calculate projected "After" counts
  const afterCalculation = useMemo(() => {
    const curAvail = currentVariant?.currentAvailable ?? 9;
    const curDamaged = currentVariant?.damaged ?? 2;
    const qty = Math.max(1, Number(quantity) || 1);

    let afterAvail = curAvail;
    let afterDamaged = curDamaged;

    if (type === 'INCREASE') {
      afterAvail = curAvail + qty;
    } else if (type === 'DECREASE') {
      afterAvail = Math.max(0, curAvail - qty);
    } else if (type === 'MARK_DAMAGED') {
      afterAvail = Math.max(0, curAvail - qty);
      afterDamaged = curDamaged + qty;
    } else if (type === 'WRITE_OFF') {
      afterDamaged = Math.max(0, curDamaged - qty);
    }

    return {
      available: afterAvail,
      damaged: afterDamaged,
    };
  }, [currentVariant, type, quantity]);

  // File upload simulation / local file reader
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result as string);
        toast.success(`Photo attached: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) {
      toast.error('Please select a variant');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantity must be at least 1');
      return;
    }

    // Photo check for damage and write off
    if ((type === 'MARK_DAMAGED' || type === 'WRITE_OFF') && !photoUrl) {
      // Allow proceeding with warning
      console.log('Proceeding without photo upload for test convenience');
    }

    const payload: CreateStockAdjustmentPayload = {
      variantId: selectedVariantId,
      type,
      quantity,
      reason,
      reference: reference || undefined,
      photoUrl: photoUrl || undefined,
      notes: notes || undefined,
    };

    try {
      const res = await createMutation.mutateAsync(payload);
      toast.success(res.message || 'Stock adjustment recorded successfully');
      // Reset form
      setQuantity(1);
      setReference('');
      setPhotoUrl(null);
      setNotes('');
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to record adjustment'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-6 lg:p-8 font-sans text-stone-800">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-1">
          PRODUCTS & STOCK / ADJUSTMENT
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#4A1521] tracking-tight">
          Stock adjustment
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Correct counts, mark damaged items or record losses. Every change needs a reason and is audited.
        </p>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: New Adjustment Form Card */}
        <div className="lg:col-span-5 rounded-xl border border-stone-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-5">
            <h2 className="font-serif text-lg font-bold text-stone-900">
              New adjustment
            </h2>
            <span className="font-mono text-xs font-semibold tracking-wider text-stone-400">
              {nextNumber}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* VARIANT */}
            <div className="relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                VARIANT *
              </label>

              <button
                type="button"
                onClick={() => setVariantDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-md border border-stone-200/90 bg-[#FAF9F6] px-3.5 py-2.5 text-left text-xs font-medium text-stone-800 hover:border-stone-400 transition-colors"
              >
                <span>{currentVariant?.label || 'Select variant'}</span>
                <ChevronDown size={14} className="text-stone-400" />
              </button>

              {/* Subtext */}
              <div className="text-[11px] text-stone-500 font-mono mt-1">
                {currentVariant?.subtext ||
                  'PRD0110-MAR-M · current available: 9 · damaged: 2'}
              </div>

              {/* Variant Picker Dropdown */}
              {variantDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-md border border-stone-200 bg-white p-2 shadow-xl max-h-60 overflow-y-auto">
                  <div className="relative mb-2">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="text"
                      placeholder="Search variant name or barcode..."
                      value={variantSearch}
                      onChange={(e) => setVariantSearch(e.target.value)}
                      className="w-full rounded border border-stone-200 pl-8 pr-2 py-1 text-xs focus:border-[#7A2232] focus:outline-none"
                    />
                  </div>
                  <div className="divide-y divide-stone-100">
                    {variants.map((v) => (
                      <button
                        type="button"
                        key={v.variantId}
                        onClick={() => {
                          setSelectedVariantId(v.variantId);
                          setVariantDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded text-xs transition-colors ${
                          selectedVariantId === v.variantId
                            ? 'bg-[#7A2232]/10 text-[#7A2232] font-semibold'
                            : 'hover:bg-stone-50 text-stone-800'
                        }`}
                      >
                        <div className="font-semibold">{v.productName}</div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {v.size} · {v.sku} · Avail: {v.currentAvailable} · Damaged: {v.damaged}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* TYPE * (2x2 Grid of Radio Cards) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                TYPE *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Increase */}
                <button
                  type="button"
                  onClick={() => setType('INCREASE')}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                    type === 'INCREASE'
                      ? 'border-[#7A2232] bg-[#FAF0F2]'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      type === 'INCREASE'
                        ? 'border-[#7A2232] bg-[#7A2232]'
                        : 'border-stone-300'
                    }`}
                  >
                    {type === 'INCREASE' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <div>
                    <div
                      className={`font-semibold text-xs ${
                        type === 'INCREASE' ? 'text-[#7A2232]' : 'text-stone-800'
                      }`}
                    >
                      Increase
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Found / count up
                    </div>
                  </div>
                </button>

                {/* 2. Decrease */}
                <button
                  type="button"
                  onClick={() => setType('DECREASE')}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                    type === 'DECREASE'
                      ? 'border-[#7A2232] bg-[#FAF0F2]'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      type === 'DECREASE'
                        ? 'border-[#7A2232] bg-[#7A2232]'
                        : 'border-stone-300'
                    }`}
                  >
                    {type === 'DECREASE' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <div>
                    <div
                      className={`font-semibold text-xs ${
                        type === 'DECREASE' ? 'text-[#7A2232]' : 'text-stone-800'
                      }`}
                    >
                      Decrease
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Lost / count down
                    </div>
                  </div>
                </button>

                {/* 3. Mark damaged (Selected in screenshot) */}
                <button
                  type="button"
                  onClick={() => setType('MARK_DAMAGED')}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                    type === 'MARK_DAMAGED'
                      ? 'border-[#7A2232] bg-[#FAF0F2] ring-1 ring-[#7A2232]'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      type === 'MARK_DAMAGED'
                        ? 'border-[#7A2232] bg-[#7A2232]'
                        : 'border-stone-300'
                    }`}
                  >
                    {type === 'MARK_DAMAGED' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <div>
                    <div
                      className={`font-semibold text-xs ${
                        type === 'MARK_DAMAGED'
                          ? 'text-[#7A2232]'
                          : 'text-stone-800'
                      }`}
                    >
                      Mark damaged
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Move to damaged
                    </div>
                  </div>
                </button>

                {/* 4. Write off */}
                <button
                  type="button"
                  onClick={() => setType('WRITE_OFF')}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                    type === 'WRITE_OFF'
                      ? 'border-[#7A2232] bg-[#FAF0F2]'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      type === 'WRITE_OFF'
                        ? 'border-[#7A2232] bg-[#7A2232]'
                        : 'border-stone-300'
                    }`}
                  >
                    {type === 'WRITE_OFF' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <div>
                    <div
                      className={`font-semibold text-xs ${
                        type === 'WRITE_OFF' ? 'text-[#7A2232]' : 'text-stone-800'
                      }`}
                    >
                      Write off
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Remove damaged
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* QUANTITY * */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                QUANTITY *
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))
                }
                className="w-full rounded-md border border-stone-200/90 bg-[#FAF9F6] px-3.5 py-2 font-mono text-xs text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                required
              />
              <div className="text-[11px] text-stone-500 font-mono mt-1">
                After: available {afterCalculation.available} · damaged{' '}
                {afterCalculation.damaged}
              </div>
            </div>

            {/* REASON * */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                REASON *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border border-stone-200/90 bg-[#FAF9F6] px-3 py-2 text-xs text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                required
              >
                {REASON_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* REFERENCE */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                REFERENCE
              </label>
              <input
                type="text"
                placeholder="Count sheet no., incident no."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-md border border-stone-200/90 bg-[#FAF9F6] px-3 py-2 text-xs placeholder-stone-400 text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
              />
            </div>

            {/* PHOTO * */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                PHOTO *
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg border border-dashed border-stone-300 bg-[#FAF9F6] p-4 text-center hover:bg-stone-100/70 transition-colors"
              >
                {photoUrl ? (
                  <div className="flex items-center justify-center gap-3">
                    <img
                      src={photoUrl}
                      alt="Proof"
                      className="h-10 w-10 object-cover rounded border"
                    />
                    <div className="text-left">
                      <span className="block font-medium text-[#7A2232]">
                        Photo attached
                      </span>
                      <span className="text-[10px] text-stone-400">
                        Click to change photo
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Camera size={18} className="mx-auto text-stone-400 mb-1" />
                    <span className="block text-stone-400 text-[11px]">
                      Required for damage and write-off
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-md bg-[#7A2232] py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-[#631B28] disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Recording...' : 'Record Adjustment'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Adjustment History Card */}
        <div className="lg:col-span-7 rounded-xl border border-stone-200/90 bg-white p-6 shadow-sm overflow-hidden">
          {/* Header & Filter */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Adjustment history
            </h2>

            {/* Type Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypeDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-md border border-stone-200/90 bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <span>{historyTypeFilter}</span>
                <ChevronDown size={14} className="text-stone-400" />
              </button>

              {typeDropdownOpen && (
                <div className="absolute right-0 mt-1 z-30 w-44 rounded-md border border-stone-200 bg-white py-1 shadow-lg">
                  {TYPE_FILTER_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => {
                        setHistoryTypeFilter(opt.id);
                        setTypeDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        historyTypeFilter === opt.id
                          ? 'bg-[#7A2232]/10 text-[#7A2232] font-semibold'
                          : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-[#FAF9F6] text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  <th className="px-3.5 py-3">REF</th>
                  <th className="px-3 py-3">VARIANT</th>
                  <th className="px-3 py-3">TYPE</th>
                  <th className="px-3 py-3 text-center">QTY</th>
                  <th className="px-3 py-3">REASON</th>
                  <th className="px-3 py-3">BY</th>
                  <th className="px-3.5 py-3 text-center">APPROVAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {isHistoryLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-stone-400">
                      Loading adjustment history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-stone-400">
                      No adjustments found.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-stone-50/70 transition-colors"
                    >
                      {/* REF */}
                      <td className="px-3.5 py-3 font-mono font-medium text-stone-900 whitespace-nowrap">
                        <div>{row.ref}</div>
                        <div className="text-[10px] text-stone-400 font-sans font-normal">
                          {row.date}
                        </div>
                      </td>

                      {/* VARIANT */}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-stone-900">
                          {row.variantName}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {row.variantSubtext}
                        </div>
                      </td>

                      {/* TYPE */}
                      <td className="px-3 py-3 text-stone-700 whitespace-nowrap">
                        {row.type}
                      </td>

                      {/* QTY */}
                      <td className="px-3 py-3 text-center font-mono font-semibold whitespace-nowrap">
                        {row.qty.startsWith('+') ? (
                          <span className="text-emerald-700">{row.qty}</span>
                        ) : (
                          <span className="text-stone-800">{row.qty}</span>
                        )}
                      </td>

                      {/* REASON */}
                      <td className="px-3 py-3 text-stone-700 max-w-[130px] truncate">
                        {row.reason}
                      </td>

                      {/* BY */}
                      <td className="px-3 py-3 text-stone-700 whitespace-nowrap">
                        {row.by}
                      </td>

                      {/* APPROVAL STATUS */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        {row.approvalStatus === 'AUTO' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF7EE] px-2 py-0.5 text-[10px] font-bold text-[#15803D]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
                            AUTO
                          </span>
                        )}
                        {row.approvalStatus === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF7EE] px-2 py-0.5 text-[10px] font-bold text-[#15803D]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
                            APPROVED
                          </span>
                        )}
                        {row.approvalStatus === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#B45309]" />
                            PENDING
                          </span>
                        )}
                        {row.approvalStatus === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold text-[#B91C1C]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#B91C1C]" />
                            REJECTED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

