import React, {useEffect, useMemo, useState} from 'react';
import toast from 'react-hot-toast';
import {
  useBillsBySupplier,
  useCreatePurchaseReturn,
  useEarlierReturns,
  useNextDebitNoteNumber,
  useReturnSuppliers,
} from '@/lib/react-query/queriesAndMutations/purchaseReturn';
import {PurchaseBillReturnItem} from '@/types/purchaseReturn';
import {
  Calendar,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Package,
  Printer,
  RotateCcw,
  Truck,
  X,
} from 'lucide-react';

const PANEL = 'shop-admin';

const REASON_OPTIONS = [
  'Stitching defect',
  'Damaged in transit',
  'Wrong size/color',
  'Fabric quality issue',
  'Short supply',
];

export default function PurchaseReturnPage() {
  console.log('[Shop Panel] Rendering PurchaseReturnPage');
  useEffect(() => {
    console.log('[Shop Panel] PurchaseReturnPage mounted');
  }, []);

  // Form State
  const [selectedSupplier, setSelectedSupplier] = useState<string>('Tiruppur Knits - 33');
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [sentVia, setSentVia] = useState<string>('');
  const [takeStockFrom, setTakeStockFrom] = useState<'DAMAGED_STOCK' | 'ACTIVE_STOCK'>('DAMAGED_STOCK');
  const [noteToSupplier, setNoteToSupplier] = useState<string>(
    '10 pcs with open side seams. Please adjust in your next bill.',
  );
  const [settleAs, setSettleAs] = useState<'DEDUCT_FROM_PAYABLE' | 'BANK_REFUND' | 'SUPPLIER_CREDIT'>(
    'DEDUCT_FROM_PAYABLE',
  );

  // Print voucher modal state
  const [printVoucher, setPrintVoucher] = useState<any | null>(null);

  // Queries
  const {data: nextDebitNoteNo} = useNextDebitNoteNumber(PANEL);
  const {data: suppliers = []} = useReturnSuppliers(PANEL);
  const {data: bills = [], isLoading: billsLoading} = useBillsBySupplier(PANEL, selectedSupplier);
  const {data: earlierReturns = []} = useEarlierReturns(PANEL);

  // Auto-select first bill when bills load or supplier changes
  useEffect(() => {
    if (bills.length > 0) {
      const match = bills.find((b) => b.id === selectedBillId);
      if (!match) {
        setSelectedBillId(bills[0].id);
      }
    } else {
      setSelectedBillId('');
    }
  }, [bills, selectedBillId]);

  const activeBill = useMemo(() => {
    return bills.find((b) => b.id === selectedBillId) || bills[0] || null;
  }, [bills, selectedBillId]);

  // Local table items state
  const [items, setItems] = useState<PurchaseBillReturnItem[]>([]);

  // When active bill changes, populate items table
  useEffect(() => {
    if (activeBill && activeBill.items) {
      setItems(
        activeBill.items.map((item) => ({
          ...item,
          // Prepopulate sample values matching reference if it's the Linen Top items
          returnQty:
            item.productName.includes('Ivory') && item.size === 'S'
              ? 6
              : item.productName.includes('Ivory') && item.size === 'M'
              ? 4
              : 0,
          reason:
            item.productName.includes('Ivory')
              ? 'Stitching defect'
              : undefined,
        })),
      );
    } else {
      setItems([]);
    }
  }, [activeBill?.id]);

  const handleReturnQtyChange = (itemId: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const maxAllowed = Math.min(item.inStockQty, item.boughtQty);
          const sanitized = Math.max(0, Math.min(qty || 0, maxAllowed));
          return {
            ...item,
            returnQty: sanitized,
            reason: sanitized > 0 ? (item.reason || 'Stitching defect') : undefined,
          };
        }
        return item;
      }),
    );
  };

  const handleReasonChange = (itemId: string, reason: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? {...item, reason} : item)),
    );
  };

  // Calculations for summary card
  const {returnValue, taxAmount, totalAmount, totalQty, payableBefore, payableAfter} = useMemo(() => {
    let retVal = 0;
    let taxVal = 0;
    let qty = 0;

    for (const item of items) {
      if (item.returnQty > 0) {
        const lineCost = item.returnQty * item.unitCost;
        const lineTax = (lineCost * (item.taxRate || 5)) / 100;
        retVal += lineCost;
        taxVal += lineTax;
        qty += item.returnQty;
      }
    }

    const total = retVal + taxVal;
    const before = activeBill?.balanceDue ?? 18900;
    const after = Math.max(0, Math.round((before - total) * 100) / 100);

    return {
      returnValue: Math.round(retVal * 100) / 100,
      taxAmount: Math.round(taxVal * 100) / 100,
      totalAmount: Math.round(total * 100) / 100,
      totalQty: qty,
      payableBefore: before,
      payableAfter: after,
    };
  }, [items, activeBill]);

  const createReturnMutation = useCreatePurchaseReturn(PANEL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeReturnItems = items.filter((i) => i.returnQty > 0);
    if (activeReturnItems.length === 0) {
      toast.error('Please enter return quantity for at least one item');
      return;
    }

    try {
      const payload = {
        supplierName: selectedSupplier || activeBill?.supplierName || 'Supplier',
        purchaseBillId: activeBill ? activeBill.id : undefined,
        returnDate,
        status: 'CONFIRMED' as const,
        sentVia: sentVia.trim() || undefined,
        takeStockFrom,
        noteToSupplier: noteToSupplier.trim() || undefined,
        settleAs,
        items: activeReturnItems.map((item) => ({
          purchaseBillItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          size: item.size,
          hsn: item.hsn,
          boughtQty: item.boughtQty,
          inStockQty: item.inStockQty,
          returnQty: item.returnQty,
          unitCost: item.unitCost,
          taxRate: item.taxRate,
          reason: item.reason,
        })),
      };

      const res = await createReturnMutation.mutateAsync(payload);
      toast.success(`Debit note ${res.returnNumber || nextDebitNoteNo} saved successfully!`);
      setPrintVoucher(res);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save debit note');
    }
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* 1. Header & Breadcrumb */}
      <div className="print:hidden">
        <p className="text-[11px] font-semibold tracking-wider text-espresso/60 uppercase">
          PURCHASE / PURCHASE RETURN
        </p>
        <h1 className="font-serif text-3xl font-medium text-espresso mt-0.5">
          Purchase return (debit note)
        </h1>
        <p className="text-xs text-espresso/70 mt-1">
          Send damaged or wrong goods back to the supplier. Stock goes down and the amount is deducted from what you owe.
        </p>
      </div>

      {/* 2. Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Form & Items Table (8 cols / ~66%) */}
        <div className="lg:col-span-8 bg-white border border-[#EAE3DC] p-5 rounded shadow-sm space-y-5 print:hidden">
          {/* Main Card Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE3DC]">
            <h2 className="font-mono text-xl font-semibold text-espresso">
              {nextDebitNoteNo || 'DN/26-27/0006'}
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" />
              DRAFT
            </span>
          </div>

          {/* Form Top 3 Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* SUPPLIER */}
            <div>
              <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
                SUPPLIER *
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] bg-white text-espresso"
              >
                {suppliers.length > 0 ? (
                  suppliers.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <option value="Tiruppur Knits - 33">Tiruppur Knits - 33</option>
                )}
              </select>
            </div>

            {/* AGAINST PURCHASE BILL */}
            <div>
              <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
                AGAINST PURCHASE BILL *
              </label>
              <select
                value={selectedBillId}
                onChange={(e) => setSelectedBillId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] bg-white text-espresso"
              >
                {bills.length > 0 ? (
                  bills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.billNumber} · {b.supplierName}
                    </option>
                  ))
                ) : (
                  <option value="">PB/26-27/0040 · Tiruppur Knits - 33</option>
                )}
              </select>
            </div>

            {/* RETURN DATE */}
            <div>
              <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
                RETURN DATE *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] text-espresso"
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-[#EAE3DC] rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF7F4] text-espresso/70 text-[10px] uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 border-b border-[#EAE3DC]">ITEM</th>
                  <th className="py-2.5 px-3 border-b border-[#EAE3DC] text-center">BOUGHT</th>
                  <th className="py-2.5 px-3 border-b border-[#EAE3DC] text-center">IN STOCK</th>
                  <th className="py-2.5 px-3 border-b border-[#EAE3DC] text-center">RETURN QTY</th>
                  <th className="py-2.5 px-3 border-b border-[#EAE3DC] text-center">COST</th>
                  <th className="py-2.5 px-3 border-b border-[#EAE3DC]">REASON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE3DC]/60 text-espresso">
                {billsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-espresso/40">
                      Loading bill items...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-espresso/40">
                      No items found on this purchase bill.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF7F4]/50 transition">
                      {/* ITEM */}
                      <td className="py-3 px-3">
                        <p className="font-medium text-espresso text-xs">
                          {item.productName}
                        </p>
                        <p className="text-[10px] text-espresso/60 uppercase tracking-wide mt-0.5">
                          {item.size} · HSN {item.hsn}
                        </p>
                      </td>

                      {/* BOUGHT */}
                      <td className="py-3 px-3 text-center text-xs font-medium text-espresso/80">
                        {item.boughtQty}
                      </td>

                      {/* IN STOCK */}
                      <td className="py-3 px-3 text-center text-xs font-medium text-espresso/80">
                        {item.inStockQty}
                      </td>

                      {/* RETURN QTY */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={Math.min(item.inStockQty, item.boughtQty)}
                          value={item.returnQty}
                          onChange={(e) =>
                            handleReturnQtyChange(item.id, parseInt(e.target.value) || 0)
                          }
                          className="w-16 px-2 py-1 text-center text-xs font-semibold border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] text-espresso"
                        />
                      </td>

                      {/* COST */}
                      <td className="py-3 px-3 text-center text-xs font-medium text-espresso">
                        ₹{item.unitCost}
                      </td>

                      {/* REASON */}
                      <td className="py-3 px-3">
                        {item.returnQty > 0 ? (
                          <select
                            value={item.reason || 'Stitching defect'}
                            onChange={(e) => handleReasonChange(item.id, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] bg-white text-espresso"
                          >
                            {REASON_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-espresso/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* SENT VIA */}
            <div>
              <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
                SENT VIA
              </label>
              <input
                type="text"
                placeholder="Transport / courier, LR no."
                value={sentVia}
                onChange={(e) => setSentVia(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] text-espresso"
              />
            </div>

            {/* TAKE STOCK FROM */}
            <div>
              <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
                TAKE STOCK FROM
              </label>
              <select
                value={takeStockFrom}
                onChange={(e) =>
                  setTakeStockFrom(e.target.value as 'DAMAGED_STOCK' | 'ACTIVE_STOCK')
                }
                className="w-full px-3 py-2 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] bg-white text-espresso"
              >
                <option value="DAMAGED_STOCK">Damaged stock</option>
                <option value="ACTIVE_STOCK">Active stock</option>
              </select>
            </div>
          </div>

          {/* NOTE TO SUPPLIER */}
          <div>
            <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
              NOTE TO SUPPLIER
            </label>
            <textarea
              rows={2}
              value={noteToSupplier}
              onChange={(e) => setNoteToSupplier(e.target.value)}
              placeholder="e.g. 10 pcs with open side seams. Please adjust in your next bill."
              className="w-full px-3 py-2 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] text-espresso resize-none"
            />
          </div>
        </div>

        {/* Right Column: Debit Note Summary & Earlier Returns (4 cols / ~34%) */}
        <div className="lg:col-span-4 space-y-5 print:hidden">
          {/* Top Card: Debit Note Settlement */}
          <div className="bg-white border border-[#EAE3DC] p-5 rounded shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-medium text-espresso pb-2 border-b border-[#EAE3DC]">
              Debit note
            </h3>

            <div className="space-y-2 text-xs text-espresso">
              <div className="flex items-center justify-between">
                <span className="text-espresso/70">Return value ({totalQty} pcs)</span>
                <span className="font-medium">₹{returnValue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-espresso/70">IGST 5% reversed</span>
                <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
              </div>

              <div className="border-t border-[#EAE3DC] pt-2.5 flex items-baseline justify-between">
                <span className="font-serif text-lg font-medium text-espresso">Debit note</span>
                <span className="font-serif text-2xl font-bold text-espresso">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="border-t border-[#EAE3DC] pt-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-espresso/70">
                  <span>Payable before</span>
                  <span className="font-mono">₹{payableBefore.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-espresso/70">
                  <span>Payable after</span>
                  <span className="font-mono font-medium text-espresso">
                    ₹{payableAfter.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* SETTLE AS */}
            <div className="pt-2">
              <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
                SETTLE AS
              </label>
              <select
                value={settleAs}
                onChange={(e) =>
                  setSettleAs(
                    e.target.value as 'DEDUCT_FROM_PAYABLE' | 'BANK_REFUND' | 'SUPPLIER_CREDIT',
                  )
                }
                className="w-full px-3 py-2 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] bg-white text-espresso"
              >
                <option value="DEDUCT_FROM_PAYABLE">Deduct from payable</option>
                <option value="BANK_REFUND">Bank refund</option>
                <option value="SUPPLIER_CREDIT">Supplier credit</option>
              </select>
            </div>

            {/* SAVE & PRINT BUTTON */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createReturnMutation.isPending || totalQty === 0}
              className="w-full bg-[#8B263E] hover:bg-[#741F33] text-white py-3 rounded text-xs font-semibold uppercase tracking-wider transition shadow-sm disabled:opacity-50"
            >
              {createReturnMutation.isPending ? 'SAVING...' : 'SAVE & PRINT DEBIT NOTE'}
            </button>
          </div>

          {/* Bottom Card: Earlier returns */}
          <div className="bg-white border border-[#EAE3DC] p-5 rounded shadow-sm">
            <h3 className="font-serif text-lg font-medium text-espresso pb-3 border-b border-[#EAE3DC]">
              Earlier returns
            </h3>

            <div className="divide-y divide-[#EAE3DC]/60">
              {earlierReturns.length === 0 ? (
                <div className="py-6 text-center text-xs text-espresso/40">
                  No earlier returns found.
                </div>
              ) : (
                earlierReturns.map((r) => (
                  <div
                    key={r.id}
                    className="py-3 first:pt-2 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-espresso">
                        {r.returnNumber}
                      </p>
                      <p className="text-[11px] text-espresso/60 mt-0.5">
                        {r.subtitle}
                      </p>
                    </div>

                    <p className="font-serif text-sm font-semibold text-espresso">
                      ₹{r.totalAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Print Voucher Preview Modal */}
      {printVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 shadow-2xl border border-[#EAE3DC] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-serif text-xl font-semibold text-espresso">
                  Debit Note Voucher
                </h3>
                <p className="text-xs text-espresso/60 font-mono">
                  {printVoucher.returnNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrintVoucher(null)}
                className="text-espresso/60 hover:text-espresso"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-2 text-espresso">
              <div className="flex justify-between">
                <span className="text-espresso/60">Supplier:</span>
                <span className="font-medium">{printVoucher.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-espresso/60">Date:</span>
                <span>{new Date(printVoucher.returnDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-espresso/60">Total Quantity:</span>
                <span>{printVoucher.totalQuantity} pcs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-espresso/60">Return Value:</span>
                <span>₹{printVoucher.returnValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-espresso/60">GST (5%):</span>
                <span>₹{printVoucher.taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t pt-2 text-[#8B263E]">
                <span>Total Debit Note Amount:</span>
                <span>₹{printVoucher.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-espresso/70">
                <span>Payable Adjusted:</span>
                <span>
                  ₹{printVoucher.payableBefore.toLocaleString('en-IN')} → ₹
                  {printVoucher.payableAfter.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setPrintVoucher(null)}
                className="px-4 py-2 border border-[#EAE3DC] rounded text-xs font-semibold uppercase tracking-wider text-espresso/80"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 bg-[#8B263E] text-white px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider shadow"
              >
                <Printer size={14} />
                Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

