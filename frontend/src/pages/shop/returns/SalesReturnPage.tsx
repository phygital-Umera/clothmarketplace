import {useAuthContext} from '@/context/AuthContext';
import {
  useBillByNumber,
  useBills,
} from '@/lib/react-query/queriesAndMutations/bill';
import {useInventory} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {
  useCreateSalesReturn,
  useSalesReturns,
} from '@/lib/react-query/queriesAndMutations/shopOps';
import {Bill} from '@/types/bill';
import {RefundMode, SalesReturnPayload} from '@/types/shopOps';
import {inr} from '@/utils/money';
import {Link, useNavigate, useSearch} from '@tanstack/react-router';
import {
  AlertCircle,
  Barcode,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Minus,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import toast from 'react-hot-toast';

const PANEL = 'shop-admin';
const round2 = (v: number) => Math.round(v * 100) / 100;

interface ReturnItemSelection {
  billItemId: string;
  selected: boolean;
  quantity: number;
  reason: string;
  soldQuantity: number;
  maxReturnable: number;
  unitPrice: number;
  taxRate: number;
  productName: string;
  variantSku: string;
  size: string;
  color: string;
  hsn: string;
  isNonReturnable?: boolean;
}

interface NewExchangeItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  rate: number;
  quantity: number;
  taxRate: number;
}

const SETTLE_MODES: {
  id: RefundMode;
  label: string;
  description: string;
}[] = [
  {
    id: 'EXCHANGE',
    label: 'Exchange',
    description: 'Bill new items now',
  },
  {
    id: 'STORE_CREDIT',
    label: 'Store credit',
    description: 'Use on next bill',
  },
  {
    id: 'CASH',
    label: 'Cash / UPI refund',
    description: 'Manager PIN',
  },
  {
    id: 'ADJUST_DUE',
    label: 'Adjust in due',
    description: 'Reduce credit balance',
  },
];

const REASONS = [
  'Size',
  'Defective / Damaged',
  'Color Mismatch',
  'Fit Issue',
  'Customer Changed Mind',
  'Fabric Quality',
];

export default function SalesReturnPage() {
  const {user} = useAuthContext();
  const navigate = useNavigate();

  // Read URL query params (e.g. ?billNumber=SB-20261103-0001)
  const searchParams = useSearch({strict: false}) as {billNumber?: string};

  // Recent Confirmed Sales Bills from backend
  const {data: recentBillsData, isLoading: isRecentBillsLoading} = useBills(
    PANEL,
    'sales',
    {
      status: 'CONFIRMED',
      limit: 8,
    },
  );

  // Bill number state
  const [billNumberInput, setBillNumberInput] = useState<string>(
    searchParams?.billNumber || '',
  );
  const [activeBillNumber, setActiveBillNumber] = useState<string>(
    searchParams?.billNumber || '',
  );

  // Automatically select the most recent bill if no search query provided
  useEffect(() => {
    if (!activeBillNumber && recentBillsData?.items && recentBillsData.items.length > 0) {
      const firstBill = recentBillsData.items[0];
      setBillNumberInput(firstBill.billNumber);
      setActiveBillNumber(firstBill.billNumber);
    }
  }, [recentBillsData, activeBillNumber]);

  // Load selected bill dynamically from API
  const {
    data: loadedBill,
    isFetching: isBillLoading,
    error: billError,
    refetch: refetchBill,
  } = useBillByNumber(PANEL, 'sales', activeBillNumber);

  // Recent Credit Notes query
  const {data: recentReturnsData, isFetching: isReturnsLoading} = useSalesReturns(
    PANEL,
    {limit: 5},
  );

  // Mutation for saving return
  const createReturn = useCreateSalesReturn(PANEL);

  // State: items selected for return
  const [returnItems, setReturnItems] = useState<ReturnItemSelection[]>([]);

  // State: Settlement mode
  const [settleMode, setSettleMode] = useState<RefundMode>('EXCHANGE');

  // State: Exchange items
  const [exchangeItems, setExchangeItems] = useState<NewExchangeItem[]>([]);
  const [exchangeSearch, setExchangeSearch] = useState<string>('');
  const [showExchangePicker, setShowExchangePicker] = useState<boolean>(false);

  // Success modal
  const [completedReturn, setCompletedReturn] = useState<any | null>(null);

  // Live inventory for scanning / adding exchange items
  const {data: inventoryData} = useInventory(PANEL, {
    view: 'variant',
    limit: 20,
    search: exchangeSearch.trim() || undefined,
  });

  // Effective Bill
  const currentBill = loadedBill || null;

  // Load Bill on click or form submit
  const handleLoadBill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!billNumberInput.trim()) {
      toast.error('Please enter a bill number');
      return;
    }
    setActiveBillNumber(billNumberInput.trim());
  };

  // Populate return items table whenever a bill loads
  useEffect(() => {
    if (!currentBill?.items) {
      setReturnItems([]);
      return;
    }

    const items: ReturnItemSelection[] = currentBill.items.map((i, index) => {
      const returnedAlready = (i.returnItems || []).reduce(
        (sum, r) => sum + r.quantity,
        0,
      );
      const left = Math.max(0, i.quantity - returnedAlready);
      const returnEligible = (i.variant?.product as any)?.returnEligible ?? true;
      const isNonReturnable = !returnEligible;

      return {
        billItemId: i.id,
        selected: index === 0 && left > 0 && !isNonReturnable,
        quantity: 1,
        reason: 'Size',
        soldQuantity: i.quantity,
        maxReturnable: left,
        unitPrice:
          i.unitPrice || (i.totalPrice ? i.totalPrice / i.quantity : 0),
        taxRate: i.taxRate ?? (i.variant?.product as any)?.taxRate ?? 5,
        productName: i.productName || i.variant?.product?.name || 'Product',
        variantSku: i.variantSku || i.variant?.variantSku || i.variant?.sku || '',
        size: i.size || i.variant?.size || 'Free',
        color: i.color || i.variant?.color || 'N/A',
        hsn: (i.variant?.product as any)?.hsn || '6204',
        isNonReturnable,
      };
    });

    setReturnItems(items);
  }, [currentBill]);

  // Handle return selection toggle
  const toggleItemSelection = (billItemId: string) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        item.billItemId === billItemId &&
        !item.isNonReturnable &&
        item.maxReturnable > 0
          ? {...item, selected: !item.selected}
          : item,
      ),
    );
  };

  // Handle return quantity change
  const handleItemQtyChange = (billItemId: string, newQty: number) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.billItemId === billItemId) {
          const qty = Math.max(1, Math.min(newQty, item.maxReturnable));
          return {...item, quantity: qty};
        }
        return item;
      }),
    );
  };

  // Handle reason change
  const handleItemReasonChange = (billItemId: string, reason: string) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        item.billItemId === billItemId ? {...item, reason} : item,
      ),
    );
  };

  // Add Exchange item
  const handleAddExchangeItem = (invItem: any) => {
    const variantId = invItem.variantId ?? invItem.variant?.id ?? invItem.id;
    const rate = Number(
      invItem.variant?.sellingPrice ??
        invItem.sellingPrice ??
        invItem.product?.sellingPrice ??
        0,
    );

    const newItem: NewExchangeItem = {
      id: `ex-${Date.now()}-${Math.random()}`,
      variantId,
      productId: invItem.productId ?? invItem.product?.id ?? '',
      productName: invItem.product?.name ?? 'Exchange Item',
      sku: invItem.variant?.sku ?? invItem.variant?.variantSku ?? 'SKU',
      size: invItem.variant?.size ?? 'M',
      color: invItem.variant?.color ?? 'Standard',
      rate,
      quantity: 1,
      taxRate: Number(invItem.product?.taxRate ?? 5),
    };

    setExchangeItems((prev) => [...prev, newItem]);
    setExchangeSearch('');
    setShowExchangePicker(false);
  };

  // Calculations
  const calculations = useMemo(() => {
    const selectedItems = returnItems.filter((i) => i.selected);

    let returnGross = 0;
    let taxableReversed = 0;
    let taxReversed = 0;

    for (const item of selectedItems) {
      const itemTotal = round2(item.unitPrice * item.quantity);
      returnGross += itemTotal;
      const taxRate = item.taxRate || 5;
      const baseTaxable = round2(itemTotal / (1 + taxRate / 100));
      taxableReversed += baseTaxable;
      taxReversed += round2(itemTotal - baseTaxable);
    }

    let newItemsTotal = 0;
    if (settleMode === 'EXCHANGE') {
      newItemsTotal = exchangeItems.reduce(
        (sum, item) => sum + round2(item.rate * item.quantity),
        0,
      );
    }

    const difference = round2(newItemsTotal - returnGross);
    const customerPays = Math.max(0, difference);
    const refundAmount = Math.max(0, round2(returnGross - newItemsTotal));

    return {
      returnGross: round2(returnGross),
      taxableReversed: round2(taxableReversed),
      taxReversed: round2(taxReversed),
      newItemsTotal: round2(newItemsTotal),
      customerPays,
      refundAmount,
      selectedCount: selectedItems.length,
    };
  }, [returnItems, exchangeItems, settleMode]);

  // Policy calculation: purchased date within 7 days
  const policyInfo = useMemo(() => {
    if (!currentBill?.billDate) return null;
    const boughtDate = new Date(currentBill.billDate);
    const diffDays = Math.floor(
      (Date.now() - boughtDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isWithin7Days = diffDays <= 7;
    const dateStr = boughtDate
      .toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })
      .toUpperCase();

    return {
      dateStr,
      isWithin7Days,
      diffDays,
    };
  }, [currentBill]);

  // Submit Sales Return
  const handleSubmitReturn = async () => {
    const selected = returnItems.filter((i) => i.selected);
    if (selected.length === 0) {
      toast.error('Select at least one item to return');
      return;
    }

    if (!currentBill?.id) {
      toast.error('No bill loaded to return items against');
      return;
    }

    if (settleMode === 'EXCHANGE' && exchangeItems.length === 0) {
      toast.error('Add at least one exchange item');
      return;
    }

    if (settleMode === 'ADJUST_DUE' && currentBill.balanceDue <= 0) {
      toast.error('This bill has ₹0 balance due. Choose another refund mode.');
      return;
    }

    const payload: SalesReturnPayload = {
      salesBillId: currentBill.id,
      refundMode: settleMode,
      reason: selected[0]?.reason || 'Customer return',
      items: selected.map((i) => ({
        salesBillItemId: i.billItemId,
        quantity: i.quantity,
      })),
      ...(settleMode === 'EXCHANGE'
        ? {
            exchangeItems: exchangeItems.map((ex) => ({
              variantId: ex.variantId,
              quantity: ex.quantity,
              unitPrice: ex.rate,
              taxRate: ex.taxRate,
            })),
          }
        : {}),
    };

    try {
      const res = await createReturn.mutateAsync(payload);
      setCompletedReturn(res?.data || res);
      toast.success('Credit note issued and stock restocked!');
      refetchBill();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to process return',
      );
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] -m-4 md:-m-6 2xl:-m-10 bg-[#FAF8F5] text-espresso select-none font-sans">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="border-b border-ivory-300 bg-[#FAF8F5] px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-outline">
              BILLING / SALES RETURN
            </p>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-burgundy mt-1">
              Sales return & exchange
            </h1>
            <p className="text-xs text-outline mt-1 font-medium">
              Take items back against the original bill and issue a GST credit note. Policy: 7 days, tags on.
            </p>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex flex-col lg:flex-row flex-1 p-4 md:p-8 gap-6 overflow-hidden">
        {/* LEFT COLUMN: Original Bill Search, Item Table, Settlement Radio Cards */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* ORIGINAL BILL SEARCH CARD */}
          <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-2">
              ORIGINAL BILL
            </label>
            <form
              onSubmit={handleLoadBill}
              className="flex flex-wrap items-center gap-3"
            >
              <input
                type="text"
                value={billNumberInput}
                onChange={(e) => setBillNumberInput(e.target.value)}
                placeholder="Enter sales bill number (e.g. SB-20261103-0001)"
                className="flex-1 min-w-[240px] border border-ivory-300 rounded px-3 py-2 text-sm font-mono text-espresso bg-[#FAF8F5] focus:bg-white focus:border-burgundy focus:outline-none"
              />
              <button
                type="submit"
                disabled={isBillLoading}
                className="px-6 py-2 bg-burgundy hover:bg-burgundy-deep text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isBillLoading ? 'LOADING…' : 'LOAD BILL'}
              </button>

              {/* Policy Indicator Badge */}
              {policyInfo && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide ml-auto ${
                    policyInfo.isWithin7Days
                      ? 'bg-emerald-100/80 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      policyInfo.isWithin7Days ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}
                  />
                  BOUGHT {policyInfo.dateStr} ·{' '}
                  {policyInfo.isWithin7Days
                    ? 'WITHIN 7 DAYS'
                    : `OVER 7 DAYS (${policyInfo.diffDays}D AGO)`}
                </span>
              )}
            </form>

            {/* Quick Confirmed Bills Chips */}
            {recentBillsData?.items && recentBillsData.items.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-ivory-200 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  Quick Select Bill:
                </span>
                {recentBillsData.items.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBillNumberInput(b.billNumber);
                      setActiveBillNumber(b.billNumber);
                    }}
                    className={`text-xs px-2.5 py-1 rounded border font-mono transition-all ${
                      activeBillNumber === b.billNumber
                        ? 'bg-burgundy text-white border-burgundy shadow-xs'
                        : 'bg-ivory-50 hover:bg-ivory-100 text-espresso border-ivory-300'
                    }`}
                  >
                    {b.billNumber}
                    <span className="ml-1 opacity-75 font-sans">
                      ({inr(b.totalAmount)})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* BILL DETAILS & RETURN ITEMS TABLE */}
          {isBillLoading ? (
            <div className="bg-white border border-ivory-300 rounded-lg p-10 text-center">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-burgundy border-t-transparent rounded-full mb-2"></div>
              <p className="text-xs font-semibold text-outline">
                Loading sales bill details...
              </p>
            </div>
          ) : currentBill ? (
            <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs">
              {/* Loaded Bill Metadata */}
              <div className="mb-4">
                <h2 className="font-serif text-xl font-bold text-espresso">
                  Bill {currentBill.billNumber}
                </h2>
                <p className="text-xs text-outline font-medium mt-0.5">
                  {currentBill.customerName || 'Walk-in Customer'} ·{' '}
                  {currentBill.customerPhone || 'No Phone'} ·{' '}
                  {new Date(
                    currentBill.billDate || currentBill.createdAt,
                  ).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  · paid {currentBill.paymentMethod} {inr(currentBill.totalAmount)}
                  {currentBill.balanceDue > 0 && (
                    <span className="text-rose-700 ml-1">
                      · Due: {inr(currentBill.balanceDue)}
                    </span>
                  )}
                </p>
              </div>

              {/* Return Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ivory-300 bg-[#FAF8F5] text-outline uppercase font-semibold text-[11px] tracking-wider">
                      <th className="py-2.5 px-3 text-center w-14">RETURN</th>
                      <th className="py-2.5 px-4 min-w-[200px]">ITEM</th>
                      <th className="py-2.5 px-3 text-center w-16">SOLD</th>
                      <th className="py-2.5 px-3 text-right w-20">RATE</th>
                      <th className="py-2.5 px-3 text-center w-24">RETURN QTY</th>
                      <th className="py-2.5 px-4 text-left w-36">REASON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-200">
                    {returnItems.map((item) => (
                      <tr
                        key={item.billItemId}
                        className={`transition-colors ${
                          item.isNonReturnable
                            ? 'bg-ivory-50/50 opacity-60'
                            : item.selected
                            ? 'bg-[#FCF9F5]'
                            : 'hover:bg-ivory-50/40'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={
                              item.isNonReturnable || item.maxReturnable === 0
                            }
                            onChange={() => toggleItemSelection(item.billItemId)}
                            className="w-4 h-4 rounded text-burgundy accent-burgundy cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Item Name & Meta */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-espresso text-[13px] leading-tight">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-outline mt-0.5 font-medium">
                            {item.isNonReturnable ? (
                              <span className="text-amber-800 font-semibold">
                                Sale item - not returnable
                              </span>
                            ) : item.maxReturnable === 0 ? (
                              <span className="text-rose-700 font-semibold">
                                Already fully returned
                              </span>
                            ) : (
                              `${item.size} · ${item.color} · HSN ${item.hsn} · GST ${item.taxRate}%`
                            )}
                          </p>
                        </td>

                        {/* Sold Qty */}
                        <td className="py-3 px-3 text-center text-outline font-medium">
                          {item.soldQuantity}
                        </td>

                        {/* Rate */}
                        <td className="py-3 px-3 text-right font-medium text-espresso">
                          {inr(item.unitPrice)}
                        </td>

                        {/* Return Qty */}
                        <td className="py-3 px-3 text-center">
                          {item.selected ? (
                            <div className="inline-flex items-center border border-ivory-300 rounded bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() =>
                                  handleItemQtyChange(
                                    item.billItemId,
                                    item.quantity - 1,
                                  )
                                }
                                disabled={item.quantity <= 1}
                                className="px-1.5 py-0.5 text-outline hover:text-burgundy disabled:opacity-30 cursor-pointer"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="w-6 text-center font-bold text-espresso text-xs">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleItemQtyChange(
                                    item.billItemId,
                                    item.quantity + 1,
                                  )
                                }
                                disabled={item.quantity >= item.maxReturnable}
                                className="px-1.5 py-0.5 text-outline hover:text-burgundy disabled:opacity-30 cursor-pointer"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-outline">—</span>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-4 text-left">
                          {item.selected ? (
                            <select
                              value={item.reason}
                              onChange={(e) =>
                                handleItemReasonChange(
                                  item.billItemId,
                                  e.target.value,
                                )
                              }
                              className="border border-ivory-300 rounded px-2 py-1 text-xs text-espresso bg-white focus:border-burgundy focus:outline-none cursor-pointer"
                            >
                              {REASONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-outline">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-ivory-300 rounded-lg p-10 text-center shadow-2xs">
              <FileText
                size={36}
                className="mx-auto text-outline/50 mb-2"
                strokeWidth={1.5}
              />
              <h3 className="font-serif text-lg font-bold text-espresso">
                No Sales Bill Loaded
              </h3>
              <p className="text-xs text-outline mt-1 max-w-sm mx-auto">
                Enter a bill number above or select from the recent bills list to begin a return or exchange.
              </p>
            </div>
          )}

          {/* SETTLE AS * RADIO CARDS */}
          <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-3">
              SETTLE AS *
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SETTLE_MODES.map((mode) => {
                const isSelected = settleMode === mode.id;
                const isAdjustDueDisabled =
                  mode.id === 'ADJUST_DUE' &&
                  (!currentBill || currentBill.balanceDue <= 0);

                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={isAdjustDueDisabled}
                    onClick={() => setSettleMode(mode.id)}
                    className={`flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected
                        ? 'border-burgundy bg-[#FCF0F2] ring-1 ring-burgundy shadow-xs'
                        : 'border-ivory-300 bg-white hover:bg-ivory-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-burgundy bg-burgundy'
                            : 'border-ivory-300 bg-white'
                        }`}
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-burgundy' : 'text-espresso'
                        }`}
                      >
                        {mode.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-outline font-medium mt-1.5 pl-5.5">
                      {isAdjustDueDisabled
                        ? 'No outstanding due'
                        : mode.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* EXCHANGE ITEMS — SCAN NEW ITEM SECTION */}
          {settleMode === 'EXCHANGE' && (
            <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-2">
                EXCHANGE ITEMS — SCAN NEW ITEM
              </label>

              {/* Barcode Search Input */}
              <div className="relative mb-4">
                <div className="flex items-center border border-ivory-300 rounded-lg bg-[#FAF8F5] px-3.5 py-2 focus-within:bg-white focus-within:border-burgundy transition-all">
                  <Barcode size={16} className="text-outline mr-2 shrink-0" />
                  <input
                    type="text"
                    value={exchangeSearch}
                    placeholder="Scan barcode or type replacement product name..."
                    onFocus={() => setShowExchangePicker(true)}
                    onChange={(e) => {
                      setExchangeSearch(e.target.value);
                      setShowExchangePicker(true);
                    }}
                    className="w-full text-xs font-medium text-espresso bg-transparent focus:outline-none placeholder-outline/60"
                  />
                  {exchangeSearch && (
                    <button
                      type="button"
                      onClick={() => setExchangeSearch('')}
                      className="p-1 text-outline hover:text-espresso cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions from Live Inventory */}
                {showExchangePicker && exchangeSearch.trim().length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowExchangePicker(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-ivory-300 rounded-lg shadow-lg z-40 max-h-56 overflow-y-auto divide-y divide-ivory-200">
                      {inventoryData?.items && inventoryData.items.length > 0 ? (
                        inventoryData.items.map((item: any) => (
                          <div
                            key={item.variantId || item.id}
                            onClick={() => handleAddExchangeItem(item)}
                            className="p-2.5 flex items-center justify-between hover:bg-ivory-50 cursor-pointer text-xs"
                          >
                            <div>
                              <p className="font-bold text-espresso">
                                {item.product?.name || item.name}
                              </p>
                              <p className="text-[11px] text-outline">
                                {item.variant?.color || 'Std'} /{' '}
                                {item.variant?.size || 'Free'} · Stock:{' '}
                                {item.quantity ?? 0}
                              </p>
                            </div>
                            <span className="font-bold text-burgundy">
                              {inr(
                                item.variant?.sellingPrice ||
                                  item.product?.sellingPrice ||
                                  0,
                              )}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-outline">
                          No matching inventory items found
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* List of Exchange Items */}
              {exchangeItems.length > 0 ? (
                <div className="border border-ivory-200 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-ivory-200 text-outline text-[11px] uppercase font-semibold">
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-center">Size / Color</th>
                        <th className="py-2 px-3 text-right">Rate</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Total</th>
                        <th className="py-2 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ivory-200">
                      {exchangeItems.map((ex) => (
                        <tr key={ex.id} className="hover:bg-ivory-50/50">
                          <td className="py-2 px-3 font-bold text-espresso">
                            {ex.productName}
                          </td>
                          <td className="py-2 px-3 text-center text-outline">
                            {ex.size} / {ex.color}
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {inr(ex.rate)}
                          </td>
                          <td className="py-2 px-3 text-center font-bold">
                            {ex.quantity}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-burgundy">
                            {inr(ex.rate * ex.quantity)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setExchangeItems((prev) =>
                                  prev.filter((i) => i.id !== ex.id),
                                )
                              }
                              className="text-outline hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-outline italic text-center py-3 bg-[#FAF8F5] rounded border border-dashed border-ivory-300">
                  Scan barcode or search replacement items from live inventory above.
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Settlement Summary & Recent Credit Notes */}
        <div className="w-full lg:w-[360px] flex flex-col gap-6 shrink-0">
          {/* SETTLEMENT CARD */}
          <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs">
            <h2 className="font-serif text-xl font-bold text-espresso mb-4">
              Settlement
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-outline">
                <span>Return value (incl. GST)</span>
                <span className="font-bold text-espresso">
                  {inr(calculations.returnGross)}
                </span>
              </div>

              <div className="flex justify-between text-outline">
                <span>Taxable reversed</span>
                <span className="font-medium text-espresso">
                  {inr(calculations.taxableReversed)}
                </span>
              </div>

              <div className="flex justify-between text-outline">
                <span>CGST + SGST reversed</span>
                <span className="font-medium text-espresso">
                  {inr(calculations.taxReversed)}
                </span>
              </div>

              {settleMode === 'EXCHANGE' && (
                <div className="flex justify-between text-outline">
                  <span>New items</span>
                  <span className="font-medium text-espresso">
                    {inr(calculations.newItemsTotal)}
                  </span>
                </div>
              )}

              {/* Customer Pays / Refund Display */}
              <div className="border-t border-ivory-300 pt-3 mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-base font-bold text-espresso">
                    {calculations.customerPays > 0
                      ? 'Customer pays'
                      : calculations.refundAmount > 0
                      ? 'Refund amount'
                      : 'Customer pays'}
                  </span>
                  <span className="font-serif text-3xl font-bold text-espresso">
                    {inr(
                      calculations.customerPays ||
                        calculations.refundAmount ||
                        0,
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-outline font-medium mt-2 leading-relaxed">
                  {settleMode === 'EXCHANGE'
                    ? 'Creates Credit Note and replacement Sales Bill. Returned items are restocked and replacement items deducted.'
                    : settleMode === 'STORE_CREDIT'
                    ? 'Creates Credit Note for store credit. Returned items are restocked.'
                    : settleMode === 'CASH'
                    ? 'Creates Credit Note for cash/UPI refund. Returned items are restocked.'
                    : 'Creates Credit Note and adjusts outstanding bill due. Returned items are restocked.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  onClick={handleSubmitReturn}
                  disabled={
                    createReturn.isPending || calculations.selectedCount === 0
                  }
                  className="w-full py-3 bg-burgundy hover:bg-burgundy-deep text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {createReturn.isPending ? 'PROCESSING…' : 'SAVE & PRINT'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate({to: '/shop-admin/new-bill'});
                  }}
                  className="w-full py-2.5 border border-ivory-300 hover:bg-ivory-100 text-espresso font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>

          {/* RECENT CREDIT NOTES CARD */}
          <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs">
            <h3 className="font-serif text-base font-bold text-espresso mb-3.5">
              Recent credit notes
            </h3>

            <div className="divide-y divide-ivory-200">
              {recentReturnsData?.items && recentReturnsData.items.length > 0 ? (
                recentReturnsData.items.map((cn: any) => (
                  <div key={cn.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-espresso">
                        {cn.returnNumber}
                      </span>
                      <span className="text-xs font-bold text-espresso">
                        {inr(cn.totalAmount)}
                      </span>
                    </div>
                    <p className="text-[11px] text-outline mt-0.5 font-medium">
                      {cn.customerName || 'Customer'} ·{' '}
                      {cn.refundMode.toLowerCase().replace('_', ' ')} ·{' '}
                      {new Date(cn.createdAt || cn.returnDate).toLocaleDateString(
                        'en-IN',
                        {
                          day: 'numeric',
                          month: 'short',
                        },
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-outline">
                  <RotateCcw
                    size={24}
                    className="mx-auto text-outline/40 mb-1.5"
                    strokeWidth={1.5}
                  />
                  <p className="text-xs font-medium">No credit notes yet</p>
                  <p className="text-[11px] text-outline/70 mt-0.5">
                    Completed returns will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. RECEIPT MODAL */}
      {completedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-ivory-300 shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-serif text-xl font-bold text-espresso">
              Return Processed!
            </h3>
            <p className="font-mono text-sm font-bold text-burgundy mt-1">
              Credit Note #{completedReturn.returnNumber}
            </p>
            {completedReturn.newBillNumber && (
              <p className="font-mono text-xs font-bold text-espresso mt-0.5">
                New Exchange Bill #{completedReturn.newBillNumber}
              </p>
            )}
            <p className="text-xs text-outline mt-1.5">
              Return Total:{' '}
              {inr(completedReturn.totalAmount || calculations.returnGross)}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 bg-burgundy text-white text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-burgundy-deep cursor-pointer"
              >
                <Printer size={15} /> Print Credit Note
              </button>

              <button
                type="button"
                onClick={() => setCompletedReturn(null)}
                className="w-full py-2 border border-ivory-300 rounded text-xs font-semibold text-espresso hover:bg-ivory-100 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
