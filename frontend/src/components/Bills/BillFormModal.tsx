import {useInventory} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {useSaveBill} from '@/lib/react-query/queriesAndMutations/bill';
import {Bill, BillKind, BillPayload, PaymentMethod} from '@/types/bill';
import {Link} from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {useMemo, useState} from 'react';

interface Props {
  panel: string;
  kind: BillKind;
  /** Bill to edit (with items); omit to create a new one */
  bill?: Bill | null;
  onClose: () => void;
}

type Line = {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  colorHex?: string | null;
  image?: string | null;
  /** Stock currently available for sale (before this bill's change) */
  available: number;
  quantity: number | '';
  rate: number | '';
  discount: number | '';
  taxRate: number;
};

const TAX_RATES = [0, 5, 12, 18];
const round2 = (v: number) => Math.round(v * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const inputCls =
  'w-full rounded-lg border border-ivory-300 bg-white py-2 px-3 text-body-sm text-espresso focus:border-burgundy focus:outline-none';

const fromBill = (bill: Bill, kind: BillKind): Line[] =>
  (bill.items ?? []).map((i) => ({
    variantId: i.variantId,
    productName: i.variant?.product.name ?? 'Item',
    variantLabel: `${i.variant?.color ?? ''} / Size ${i.variant?.size ?? ''}`,
    sku: i.variant?.variantSku ?? '',
    colorHex: i.variant?.colorHex,
    image: i.variant?.product.images?.[0]?.url,
    available: NaN, // filled from live inventory below
    quantity: i.quantity,
    rate: (kind === 'purchase' ? i.unitCost : i.unitPrice) ?? 0,
    discount: i.discount ?? 0,
    taxRate: i.taxRate ?? 0,
  }));

export default function BillFormModal({panel, kind, bill, onClose}: Props) {
  const isPurchase = kind === 'purchase';
  const isEdit = !!bill;
  const wasPosted = bill?.status === 'CONFIRMED';
  const save = useSaveBill(panel, kind);

  // Payments taken when the bill was saved are re-entered here; payments
  // collected / paid later stay on the bill and count towards it.
  const billingPays = (bill?.payments ?? []).filter((p) => p.atBilling);
  const paidLater = round2(
    (bill?.payments ?? [])
      .filter((p) => !p.atBilling)
      .reduce((s, p) => s + p.amount, 0),
  );
  const billingPaid = round2(billingPays.reduce((s, p) => s + p.amount, 0));
  const wasPaidInFull =
    !bill || round2(bill.totalAmount - paidLater) === billingPaid;

  const [party, setParty] = useState({
    name: (isPurchase ? bill?.supplierName : bill?.customerName) ?? '',
    phone: (isPurchase ? bill?.supplierPhone : bill?.customerPhone) ?? '',
    invoiceNo: bill?.supplierInvoiceNo ?? '',
    // One mode for the whole bill, or SPLIT for several modes / credit
    paymentMethod: (wasPaidInFull && billingPays.length <= 1
      ? (billingPays[0]?.mode ?? 'CASH')
      : 'SPLIT') as PaymentMethod | 'SPLIT',
  });
  const [split, setSplit] = useState<Record<PaymentMethod, number | ''>>(() => {
    const amounts: Record<PaymentMethod, number | ''> = {
      CASH: '',
      UPI: '',
      CARD: '',
    };
    billingPays.forEach((p) => (amounts[p.mode] = p.amount));
    return amounts;
  });
  /** Purchase: paid to the supplier now; null = the whole bill */
  const [paidNow, setPaidNow] = useState<number | '' | null>(
    isPurchase && !wasPaidInFull ? billingPaid : null,
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>(
    billingPays[0]?.mode ?? 'CASH',
  );
  const [dueDate, setDueDate] = useState(bill?.dueDate?.slice(0, 10) ?? '');
  const [billDate, setBillDate] = useState(
    bill ? bill.billDate.slice(0, 10) : today(),
  );
  const [billDiscount, setBillDiscount] = useState<number | ''>(
    bill?.discount ?? 0,
  );
  const [notes, setNotes] = useState(bill?.notes ?? '');
  const isCredit = !isPurchase && party.paymentMethod === 'CREDIT';
  const [lines, setLines] = useState<Line[]>(() =>
    bill ? fromBill(bill, kind) : [],
  );
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Live stock for the picker and for lines already on the bill
  const {data: picker, isFetching: pickerLoading} = useInventory(panel, {
    view: 'variant',
    limit: 20,
    search: search.trim() || undefined,
  });
  const {data: allStock} = useInventory(panel, {view: 'variant', limit: 100});
  const stockOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of [...(allStock?.items ?? []), ...(picker?.items ?? [])]) {
      map.set(i.variantId ?? i.variant?.id, i.availableStock);
    }
    return map;
  }, [allStock?.items, picker?.items]);

  /** Units this bill already took out of stock (only a confirmed sale) */
  const postedOut = useMemo(() => {
    const map = new Map<string, number>();
    if (!isPurchase && wasPosted)
      bill?.items?.forEach((i) => map.set(i.variantId, i.quantity));
    return map;
  }, [bill, isPurchase, wasPosted]);

  /** null = not loaded yet; the server still enforces stock on save */
  const availableFor = (l: Line): number | null => {
    const base =
      stockOf.get(l.variantId) ??
      (Number.isNaN(l.available) ? null : l.available);
    return base === null ? null : base + (postedOut.get(l.variantId) ?? 0);
  };

  /** Quantity this bill had already added to stock (only a confirmed purchase) */
  const postedIn = (variantId: string) =>
    isPurchase && wasPosted
      ? (bill?.items?.find((i) => i.variantId === variantId)?.quantity ?? 0)
      : 0;

  const addLine = (i: any) => {
    const variantId = i.variantId ?? i.variant?.id;
    if (lines.some((l) => l.variantId === variantId)) return;
    setLines((prev) => [
      ...prev,
      {
        variantId,
        productName: i.product?.name,
        variantLabel: `${i.variant?.color} / Size ${i.variant?.size}`,
        sku: i.variant?.sku,
        colorHex: i.variant?.colorHex,
        image: i.product?.image,
        available: i.availableStock,
        quantity: 1,
        rate: isPurchase ? '' : (i.variant?.sellingPrice ?? 0),
        discount: 0,
        // Purchase costs are usually before GST; shop selling prices already include it
        taxRate: isPurchase ? (i.product?.taxRate ?? 0) : 0,
      },
    ]);
  };

  const updateLine = (variantId: string, patch: Partial<Line>) =>
    setLines((prev) =>
      prev.map((l) => (l.variantId === variantId ? {...l, ...patch} : l)),
    );

  const num = (v: string) => (v === '' ? '' : Math.max(0, Number(v)));

  // Same arithmetic as the server (which recomputes and is the source of truth)
  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const l of lines) {
      const gross = round2((Number(l.quantity) || 0) * (Number(l.rate) || 0));
      const net = round2(gross - (isPurchase ? 0 : Number(l.discount) || 0));
      subtotal += net;
      tax += round2((net * l.taxRate) / 100);
    }
    const total = round2(subtotal + tax - (Number(billDiscount) || 0));
    return {subtotal: round2(subtotal), tax: round2(tax), total};
  }, [lines, billDiscount, isPurchase]);

  const errors: string[] = [];
  if (isPurchase && !party.name.trim())
    errors.push('Supplier name is required.');
  if (!lines.length) errors.push('Add at least one item.');
  for (const l of lines) {
    if (!Number.isInteger(Number(l.quantity)) || Number(l.quantity) < 1)
      errors.push(`Enter a whole quantity of at least 1 for ${l.productName}.`);
    if (l.rate === '')
      errors.push(
        `Enter the ${isPurchase ? 'cost' : 'price'} for ${l.productName}.`,
      );
    const available = availableFor(l);
    if (!isPurchase && available !== null && Number(l.quantity) > available)
      errors.push(
        `Only ${available} unit(s) of ${l.productName} (${l.variantLabel}) in stock.`,
      );
  }
  if (totals.total < 0)
    errors.push('Discount cannot be more than the bill amount.');
  if (isCredit && (Number(paidNow) || 0) > totals.total)
    errors.push('Amount paid now cannot be more than the bill total.');

  // What is paid now; the rest (after any later payments) is credit
  const payable = round2(Math.max(0, totals.total - paidLater));
  const isSplit = !isPurchase && party.paymentMethod === 'SPLIT';
  const payNow = isPurchase
    ? paidNow === null
      ? payable
      : Number(paidNow) || 0
    : isSplit
      ? round2(
          Object.values(split).reduce<number>((s, v) => s + (Number(v) || 0), 0),
        )
      : payable;
  const balance = round2(payable - payNow);
  if (balance < 0)
    errors.push(
      isPurchase
        ? 'Amount paid is more than the bill amount.'
        : 'Payment received is more than the bill amount.',
    );
  if (!isPurchase && balance > 0 && (!party.name.trim() || !party.phone.trim()))
    errors.push('Customer name and phone are required to give credit.');

  const submit = async (status: 'DRAFT' | 'CONFIRMED') => {
    setSubmitted(true);
    if (errors.length || save.isPending) return;

    const data: BillPayload = {
      billDate,
      discount: Number(billDiscount) || 0,
      notes: notes.trim() || undefined,
      items: lines.map((l) => ({
        variantId: l.variantId,
        quantity: Number(l.quantity),
        taxRate: l.taxRate,
        ...(isPurchase
          ? {unitCost: Number(l.rate)}
          : {unitPrice: Number(l.rate), discount: Number(l.discount) || 0}),
      })),
      ...(isEdit ? {version: bill!.version} : {status}),
      dueDate: balance > 0 && dueDate ? dueDate : undefined,
      ...(isPurchase
        ? {
            supplierName: party.name.trim(),
            supplierInvoiceNo: party.invoiceNo.trim() || undefined,
            supplierPhone: party.phone.trim() || undefined,
            amountPaid: payNow,
            paymentMode,
          }
        : {
            customerName: party.name.trim() || undefined,
            customerPhone: party.phone.trim() || undefined,
            paymentMethod:
              party.paymentMethod === 'SPLIT' ? 'CASH' : party.paymentMethod,
            payments: isSplit
              ? (Object.entries(split) as [PaymentMethod, number | ''][])
                  .filter(([, amount]) => Number(amount) > 0)
                  .map(([mode, amount]) => ({mode, amount: Number(amount)}))
              : payable > 0
                ? [
                    {
                      mode: party.paymentMethod as PaymentMethod,
                      amount: payable,
                    },
                  ]
                : [],
            ...(isCredit ? {paidAmount: Number(paidNow) || 0} : {}),
          }),
    };

    try {
      await save.mutateAsync({id: bill?.id, data});
      onClose();
    } catch {
      // Handled by toast
    }
  };

  const title = `${isEdit ? 'Edit' : 'New'} ${isPurchase ? 'Purchase' : 'Sales'} Bill${bill ? ` ${bill.billNumber}` : ''}`;
  const pickerItems = (picker?.items ?? []).filter(
    (i: any) =>
      !lines.some((l) => l.variantId === (i.variantId ?? i.variant?.id)),
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-espresso/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory-200 bg-ivory-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                isPurchase
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isPurchase ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
            </span>
            <div>
              <h3 className="font-serif text-headline-sm text-espresso">
                {title}
              </h3>
              <p className="text-xs text-outline">
                {wasPosted
                  ? 'Stock will be adjusted by the difference from the saved quantities.'
                  : isPurchase
                    ? 'Confirmed purchase bills add their quantities to stock automatically.'
                    : 'Confirmed sales bills deduct their quantities from stock automatically.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-outline hover:bg-ivory-200 hover:text-espresso"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Bill details */}
          <div className="grid grid-cols-1 gap-3 border-b border-ivory-200 bg-ivory-100/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-outline">
              {isPurchase ? 'Supplier Name *' : 'Customer Name'}
              <input
                className={inputCls}
                value={party.name}
                maxLength={120}
                onChange={(e) => setParty({...party, name: e.target.value})}
              />
            </label>
            <label className="text-xs text-outline">
              {isPurchase ? 'Supplier Phone' : 'Customer Phone'}
              <input
                className={inputCls}
                value={party.phone}
                maxLength={20}
                inputMode="tel"
                onChange={(e) => setParty({...party, phone: e.target.value})}
              />
            </label>
            {isPurchase ? (
              <label className="text-xs text-outline">
                Supplier Invoice No
                <input
                  className={inputCls}
                  value={party.invoiceNo}
                  maxLength={60}
                  onChange={(e) =>
                    setParty({...party, invoiceNo: e.target.value})
                  }
                />
              </label>
            ) : (
              <label className="text-xs text-outline">
                Payment Method
                <select
                  className={inputCls}
                  value={party.paymentMethod}
                  onChange={(e) =>
                    setParty({
                      ...party,
                      paymentMethod: e.target.value as PaymentMethod | 'SPLIT',
                    })
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="CREDIT">Credit (pay later)</option>
                  <option value="SPLIT">Split / Credit</option>
                </select>
              </label>
            )}
            {isCredit && (
              <label className="text-xs text-outline">
                Amount Paid Now
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={paidNow}
                  onChange={(e) => setPaidNow(num(e.target.value))}
                />
              </label>
            )}
            <label className="text-xs text-outline">
              Bill Date
              <input
                type="date"
                className={inputCls}
                value={billDate}
                max={today()}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </label>
          </div>

          {/* Item picker */}
          <div className="px-6 pt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  type="text"
                  placeholder="Search product, SKU, size or color to add…"
                  value={search}
                  onFocus={() => setShowPicker(true)}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowPicker(true);
                  }}
                  className="w-full rounded-lg border border-ivory-300 bg-white py-2 pl-9 pr-8 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-espresso"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPicker((prev) => !prev)}
                className="flex items-center gap-1 rounded-lg border border-ivory-300 bg-ivory-50 px-3 py-2 text-xs font-medium text-espresso hover:bg-ivory-100"
              >
                {showPicker ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {showPicker ? 'Hide Products' : 'Browse Products'}
              </button>
              <Link
                to={`/${panel}/products/new`}
                target="_blank"
                className="flex items-center gap-1 text-xs font-semibold text-burgundy hover:underline"
              >
                <Plus size={14} /> New product
              </Link>
            </div>
            {(showPicker || search.trim()) && (
              <div className="mb-3 max-h-56 divide-y divide-ivory-100 overflow-y-auto rounded-lg border border-ivory-200 bg-white shadow-sm">
                {pickerLoading && !pickerItems.length ? (
                  <p className="p-3 text-xs text-outline">
                    Searching products…
                  </p>
                ) : !pickerItems.length ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-outline">
                      {search.trim()
                        ? `No matching items found for "${search}".`
                        : 'No products found in this shop.'}
                    </p>
                    <p className="mt-1 text-[11px] text-outline">
                      Products must be added in the Catalog before creating
                      bills.
                    </p>
                    <Link
                      to={`/${panel}/products/new`}
                      target="_blank"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-burgundy hover:underline"
                    >
                      <Plus size={13} /> Create product now
                    </Link>
                  </div>
                ) : (
                  pickerItems.map((i: any) => {
                    const outOfStock = !isPurchase && i.availableStock <= 0;
                    return (
                      <button
                        type="button"
                        key={i.variantId ?? i.variant?.id}
                        onClick={() => addLine(i)}
                        disabled={outOfStock}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors ${
                          outOfStock
                            ? 'cursor-not-allowed bg-ivory-50/50 opacity-60'
                            : 'hover:bg-ivory-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {i.variant?.colorHex ? (
                            <span
                              className="h-3 w-3 shrink-0 rounded-full border border-black/20"
                              style={{backgroundColor: i.variant.colorHex}}
                            />
                          ) : (
                            <Package
                              size={14}
                              className="shrink-0 text-outline"
                            />
                          )}
                          <span className="text-body-sm text-espresso">
                            <span className="font-medium">
                              {i.product?.name}
                            </span>{' '}
                            <span className="text-xs text-outline">
                              ({i.variant?.color} / Size {i.variant?.size}) ·
                              SKU:{' '}
                              <span className="font-mono">
                                {i.variant?.sku}
                              </span>
                            </span>
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                              i.availableStock <= 0
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {i.availableStock} in stock
                          </span>
                          {outOfStock && (
                            <span className="text-[10px] text-rose-600">
                              (Restock via Purchase Bill)
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Lines */}
          <div className="overflow-x-auto px-6 pb-4">
            {!lines.length ? (
              <div className="py-10 text-center text-body-sm text-outline">
                <Package size={22} className="mx-auto mb-2" />
                Search above and click an item to add it to the bill.
              </div>
            ) : (
              <table className="w-full min-w-[720px] text-left text-body-sm">
                <thead className="border-b border-ivory-200 text-label-caps uppercase text-outline">
                  <tr>
                    <th className="py-2">Item</th>
                    <th className="py-2 text-center">In Stock</th>
                    <th className="w-24 py-2">Qty</th>
                    <th className="w-28 py-2">
                      {isPurchase ? 'Unit Cost' : 'Unit Price'}
                    </th>
                    {!isPurchase && <th className="w-24 py-2">Discount</th>}
                    <th className="w-20 py-2">GST %</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="w-8 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-100">
                  {lines.map((l) => {
                    const available = availableFor(l);
                    const short =
                      !isPurchase &&
                      available !== null &&
                      Number(l.quantity) > available;
                    const net =
                      (Number(l.quantity) || 0) * (Number(l.rate) || 0) -
                      (isPurchase ? 0 : Number(l.discount) || 0);
                    return (
                      <tr
                        key={l.variantId}
                        className={short ? 'bg-rose-50/40' : ''}
                      >
                        <td className="py-2">
                          <p className="line-clamp-1 font-medium text-espresso">
                            {l.productName}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-outline">
                            {l.colorHex && (
                              <span
                                className="h-2.5 w-2.5 rounded-full border border-black/20"
                                style={{backgroundColor: l.colorHex}}
                              />
                            )}
                            {l.variantLabel} ·{' '}
                            <span className="font-mono">{l.sku}</span>
                          </p>
                        </td>
                        <td className="py-2 text-center">
                          {available === null ? (
                            <span className="text-outline">—</span>
                          ) : (
                            <span
                              className={
                                available <= 0
                                  ? 'font-bold text-rose-600'
                                  : 'text-espresso'
                              }
                            >
                              {available}
                            </span>
                          )}
                          {isPurchase &&
                            available !== null &&
                            Number(l.quantity) > 0 && (
                              <span className="block text-[10px] text-emerald-700">
                                →{' '}
                                {available +
                                  Number(l.quantity) -
                                  postedIn(l.variantId)}
                              </span>
                            )}
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={l.quantity}
                            onChange={(e) =>
                              updateLine(l.variantId, {
                                quantity: num(e.target.value),
                              })
                            }
                            className={`w-20 rounded-lg border px-2 py-1.5 text-center font-semibold focus:outline-none ${
                              short
                                ? 'border-error bg-rose-50 text-rose-800'
                                : 'border-ivory-300 focus:border-burgundy'
                            }`}
                          />
                          {short && (
                            <span className="block text-[10px] text-error">
                              Max {available}
                            </span>
                          )}
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={l.rate}
                            onChange={(e) =>
                              updateLine(l.variantId, {
                                rate: num(e.target.value),
                              })
                            }
                            className="w-24 rounded-lg border border-ivory-300 px-2 py-1.5 focus:border-burgundy focus:outline-none"
                          />
                        </td>
                        {!isPurchase && (
                          <td className="py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={l.discount}
                              onChange={(e) =>
                                updateLine(l.variantId, {
                                  discount: num(e.target.value),
                                })
                              }
                              className="w-20 rounded-lg border border-ivory-300 px-2 py-1.5 focus:border-burgundy focus:outline-none"
                            />
                          </td>
                        )}
                        <td className="py-2">
                          <select
                            value={l.taxRate}
                            onChange={(e) =>
                              updateLine(l.variantId, {
                                taxRate: Number(e.target.value),
                              })
                            }
                            className="rounded-lg border border-ivory-300 px-1 py-1.5 focus:border-burgundy focus:outline-none"
                          >
                            {TAX_RATES.map((r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 text-right font-semibold text-espresso">
                          ₹{round2(net * (1 + l.taxRate / 100)).toFixed(2)}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setLines((prev) =>
                                prev.filter((x) => x.variantId !== l.variantId),
                              )
                            }
                            className="rounded p-1 text-outline hover:bg-rose-50 hover:text-rose-700"
                            aria-label={`Remove ${l.productName}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Notes & totals */}
          <div className="grid grid-cols-1 gap-4 px-6 pb-4 md:grid-cols-2">
            <label className="text-xs text-outline">
              Notes
              <textarea
                rows={3}
                className={inputCls}
                value={notes}
                maxLength={1000}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <div className="space-y-1.5 rounded-xl border border-ivory-200 bg-ivory-50/60 p-4 text-body-sm">
              <div className="flex justify-between">
                <span className="text-outline">Subtotal</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">GST</span>
                <span>₹{totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-outline">Bill Discount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={billDiscount}
                  onChange={(e) => setBillDiscount(num(e.target.value))}
                  className="w-28 rounded-lg border border-ivory-300 px-2 py-1 text-right focus:border-burgundy focus:outline-none"
                />
              </div>
              <div className="flex justify-between border-t border-ivory-300 pt-1.5 font-bold text-espresso">
                <span>Total</span>
                <span>₹{totals.total.toFixed(2)}</span>
              </div>

              {/* Payment: split / credit (sales) or part payment (purchase) */}
              {paidLater > 0 && (
                <div className="flex justify-between text-xs text-outline">
                  <span>{isPurchase ? 'Paid later' : 'Collected later'}</span>
                  <span>₹{paidLater.toFixed(2)}</span>
                </div>
              )}
              {isSplit &&
                (['CASH', 'UPI', 'CARD'] as PaymentMethod[]).map((mode) => (
                  <div key={mode} className="flex items-center justify-between">
                    <span className="text-outline">
                      {mode === 'CASH' ? 'Cash' : mode === 'UPI' ? 'UPI' : 'Card'}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`${mode} received`}
                      value={split[mode]}
                      onChange={(e) =>
                        setSplit({...split, [mode]: num(e.target.value)})
                      }
                      className="w-28 rounded-lg border border-ivory-300 px-2 py-1 text-right focus:border-burgundy focus:outline-none"
                    />
                  </div>
                ))}
              {isPurchase && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-outline">Paid now</span>
                  <span className="flex gap-1.5">
                    <select
                      aria-label="Payment mode"
                      value={paymentMode}
                      onChange={(e) =>
                        setPaymentMode(e.target.value as PaymentMethod)
                      }
                      className="rounded-lg border border-ivory-300 px-1 py-1 focus:border-burgundy focus:outline-none"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label="Amount paid now"
                      value={paidNow === null ? payable : paidNow}
                      onChange={(e) => setPaidNow(num(e.target.value))}
                      className="w-28 rounded-lg border border-ivory-300 px-2 py-1 text-right focus:border-burgundy focus:outline-none"
                    />
                  </span>
                </div>
              )}
              {(isSplit || isPurchase) && (
                <div
                  className={`flex justify-between font-semibold ${balance > 0 ? 'text-amber-800' : 'text-espresso'}`}
                >
                  <span>{isPurchase ? 'Balance payable' : 'Credit (due)'}</span>
                  <span>₹{Math.max(0, balance).toFixed(2)}</span>
                </div>
              )}
              {balance > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-outline">Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    min={billDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-36 rounded-lg border border-ivory-300 px-2 py-1 focus:border-burgundy focus:outline-none"
                  />
                </div>
              )}
              {isCredit && (
                <div className="flex justify-between text-rose-800">
                  <span>Credit due</span>
                  <span>
                    ₹
                    {Math.max(
                      0,
                      round2(totals.total - (Number(paidNow) || 0)),
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ivory-200 bg-ivory-50/50 px-6 py-4">
          <div className="min-h-[1rem]">
            {submitted && errors.length > 0 && (
              <p className="flex items-center gap-1 text-xs font-medium text-error">
                <AlertCircle size={13} />
                {errors[0]}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={save.isPending}
              className="btn-ghost"
            >
              Cancel
            </button>
            {isEdit ? (
              <button
                type="button"
                onClick={() => submit('CONFIRMED')}
                disabled={save.isPending}
                className="btn-primary"
              >
                {save.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => submit('DRAFT')}
                  disabled={save.isPending}
                  className="btn-ghost border border-ivory-300"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => submit('CONFIRMED')}
                  disabled={save.isPending}
                  className={
                    isPurchase
                      ? 'btn-primary border-emerald-900 bg-emerald-800 hover:bg-emerald-900'
                      : 'btn-primary bg-burgundy hover:bg-burgundy-deep'
                  }
                >
                  {save.isPending
                    ? 'Saving…'
                    : isPurchase
                      ? 'Save & Add to Stock'
                      : 'Save & Deduct Stock'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
