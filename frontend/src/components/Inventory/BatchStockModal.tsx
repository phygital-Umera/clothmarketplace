import {useInventory, useBatchAdjustStock} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {AlertCircle, ArrowDown, ArrowUp, Package, Search, X} from 'lucide-react';
import {useMemo, useState} from 'react';

export interface BatchModalProduct {
  id: string;
  name: string;
  sku: string;
  category?: string;
  mainImage?: string | null;
  variants: Array<{
    id: string;
    sku: string;
    size: string;
    color: string;
    colorHex?: string | null;
    physicalStock: number;
    reservedStock: number;
    availableStock: number;
    threshold: number;
  }>;
}

interface Props {
  isOpen: boolean;
  mode: 'INWARD' | 'OUTWARD';
  panel: string;
  targetProduct?: BatchModalProduct | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const INWARD_REASONS = [
  'Supplier Shipment Received',
  'Customer Return Restock',
  'Production Finished Goods',
  'Branch Transfer In',
  'Stock Count Surplus',
];

const OUTWARD_REASONS = [
  'Order Dispatch / Sale',
  'Damaged / Defective Stock',
  'Loss / Shrinkage',
  'Store Display Sample',
  'Branch Transfer Out',
];

export default function BatchStockModal({
  isOpen,
  mode,
  panel,
  targetProduct,
  onClose,
  onSuccess,
}: Props) {
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState(mode === 'INWARD' ? INWARD_REASONS[0] : OUTWARD_REASONS[0]);
  const [reference, setReference] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number | ''>>({});

  // Query all active variants if no specific target product is provided
  const {data, isPending} = useInventory(panel, {
    limit: 100,
    view: 'variant',
  });

  const batchAdjustMutation = useBatchAdjustStock(panel);

  const items = useMemo(() => {
    if (targetProduct) {
      // Scoped to target product's variants
      const vars = targetProduct.variants.map((v) => ({
        variantId: v.id,
        availableStock: v.availableStock,
        physicalStock: v.physicalStock,
        product: {
          id: targetProduct.id,
          name: targetProduct.name,
          sku: targetProduct.sku,
          image: targetProduct.mainImage,
        },
        variant: {
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
        },
      }));

      if (!search.trim()) return vars;
      const q = search.toLowerCase();
      return vars.filter(
        (i) =>
          i.variant.sku?.toLowerCase().includes(q) ||
          i.variant.size?.toLowerCase().includes(q) ||
          i.variant.color?.toLowerCase().includes(q),
      );
    }

    const list = data?.items || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (i: any) =>
        i.product?.name?.toLowerCase().includes(q) ||
        i.product?.sku?.toLowerCase().includes(q) ||
        i.variant?.sku?.toLowerCase().includes(q) ||
        i.variant?.size?.toLowerCase().includes(q) ||
        i.variant?.color?.toLowerCase().includes(q),
    );
  }, [targetProduct, data?.items, search]);

  if (!isOpen) return null;

  const handleQtyChange = (variantId: string, val: string) => {
    if (val === '') {
      setQuantities((prev) => {
        const next = {...prev};
        delete next[variantId];
        return next;
      });
      return;
    }
    const num = Math.max(0, parseInt(val, 10) || 0);
    setQuantities((prev) => ({...prev, [variantId]: num}));
  };

  // Calculations
  const enteredEntries = Object.entries(quantities).filter(([, q]) => typeof q === 'number' && q > 0);
  const totalUnits = enteredEntries.reduce((sum, [, q]) => sum + (Number(q) || 0), 0);

  // Check for negative stock on OUTWARD
  let hasOverdraftError = false;
  if (mode === 'OUTWARD') {
    for (const [vId, q] of enteredEntries) {
      const found = items.find((i: any) => (i.variantId || i.variant?.id) === vId);
      const available = found?.availableStock ?? 0;
      if (Number(q) > available) {
        hasOverdraftError = true;
        break;
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredEntries.length || hasOverdraftError) return;

    const payload = {
      type: (mode === 'INWARD' ? 'INCREASE' : 'DECREASE') as 'INCREASE' | 'DECREASE',
      reason: reason.trim() || (mode === 'INWARD' ? 'Inward Stock' : 'Outward Stock'),
      reference: reference.trim() || undefined,
      items: enteredEntries.map(([variantId, quantity]) => ({
        variantId,
        quantity: Number(quantity),
      })),
    };

    try {
      await batchAdjustMutation.mutateAsync(payload);
      setQuantities({});
      onClose();
      onSuccess?.();
    } catch {
      // Handled by toast
    }
  };

  const isInward = mode === 'INWARD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-ivory-50/50">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                isInward ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isInward ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
            </span>
            <div>
              <h3 className="font-serif text-headline-sm text-espresso">
                {targetProduct
                  ? `${isInward ? 'Stock Inward' : 'Stock Outward'}: ${targetProduct.name}`
                  : isInward
                    ? 'Stock Inward (Receive / Restock)'
                    : 'Stock Outward (Dispatch / Reduce)'}
              </h3>
              <p className="text-xs text-outline">
                {targetProduct
                  ? `Enter ${isInward ? 'inward' : 'outward'} quantities for this product's variants and submit all at once.`
                  : `Enter ${isInward ? 'inward' : 'outward'} quantities for variants and submit all at once.`}
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

        {/* Controls: Search, Reason & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border-b border-ivory-200 bg-ivory-100/40">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-outline" />
            <input
              type="text"
              placeholder={targetProduct ? 'Filter size, color or SKU...' : 'Search product, SKU or size...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-ivory-300 bg-white py-2 pl-9 pr-3 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          {/* Reason Select / Input */}
          <div>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-ivory-300 bg-white py-2 px-3 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            >
              {(isInward ? INWARD_REASONS : OUTWARD_REASONS).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Reference / Challan / Invoice # */}
          <div>
            <input
              type="text"
              placeholder="Ref # (e.g. PO-8492, Invoice 102)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-lg border border-ivory-300 bg-white py-2 px-3 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>
        </div>

        {/* Variants List Table */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {!targetProduct && isPending ? (
            <div className="py-16 text-center text-body-sm text-outline">Loading variants list…</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-body-sm text-outline">No variants found matching your search.</div>
          ) : (
            <table className="w-full text-left text-body-sm">
              <thead className="sticky top-0 bg-white z-10 border-b border-ivory-200 text-label-caps uppercase text-outline">
                <tr>
                  <th className="py-3">Product Name</th>
                  <th className="py-3">Variant SKU</th>
                  <th className="py-3">Size & Color</th>
                  <th className="py-3 text-center">Available Stock</th>
                  <th className="py-3 text-right w-44">{isInward ? 'Inward Qty (+)' : 'Outward Qty (-)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {items.map((i: any) => {
                  const variantId = i.variantId || i.variant?.id;
                  const currentEntered = quantities[variantId] ?? '';
                  const numEntered = Number(currentEntered) || 0;
                  const isExceeded = !isInward && numEntered > i.availableStock;

                  return (
                    <tr
                      key={variantId}
                      className={`hover:bg-ivory-50/60 transition ${
                        numEntered > 0 ? (isInward ? 'bg-emerald-50/30' : 'bg-rose-50/30') : ''
                      }`}
                    >
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          {i.product?.image ? (
                            <img
                              src={i.product.image}
                              alt=""
                              className="h-8 w-8 rounded object-cover border border-ivory-300 shrink-0"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded border border-ivory-300 bg-ivory-100 text-xs text-outline shrink-0">
                              <Package size={14} />
                            </div>
                          )}
                          <span className="font-medium text-espresso text-body-sm line-clamp-1">
                            {i.product?.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 font-mono text-xs text-outline">
                        {i.variant?.sku || i.product?.sku}
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1.5 font-medium text-espresso text-xs">
                          {i.variant?.colorHex && (
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0"
                              style={{backgroundColor: i.variant.colorHex}}
                            />
                          )}
                          {i.variant?.color} / Size {i.variant?.size}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-semibold text-espresso">
                        <span className={i.availableStock <= 0 ? 'text-rose-600 font-bold' : 'text-espresso'}>
                          {i.availableStock}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex flex-col items-end">
                          <input
                            type="number"
                            min="0"
                            max={!isInward ? i.availableStock : undefined}
                            placeholder="0"
                            value={currentEntered}
                            onChange={(e) => handleQtyChange(variantId, e.target.value)}
                            className={`w-28 rounded-lg border py-1.5 px-2.5 text-center font-bold text-body-md focus:outline-none ${
                              isExceeded
                                ? 'border-error bg-rose-50 text-rose-800 focus:ring-1 focus:ring-error'
                                : numEntered > 0
                                  ? isInward
                                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800'
                                    : 'border-rose-600 bg-rose-50/50 text-rose-800'
                                  : 'border-ivory-300 bg-white text-espresso focus:border-burgundy'
                            }`}
                          />
                          {isExceeded && (
                            <span className="text-[10px] text-error font-medium mt-0.5">
                              Exceeds {i.availableStock}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-ivory-200 px-6 py-4 bg-ivory-50/50">
          <div>
            <span className="text-body-sm font-medium text-espresso">
              {enteredEntries.length} variant(s) selected
            </span>
            <span className="text-outline text-xs ml-2">
              Total {isInward ? 'Inward' : 'Outward'}:{' '}
              <strong className="text-espresso font-bold">{totalUnits} units</strong>
            </span>
            {hasOverdraftError && (
              <p className="flex items-center gap-1 text-xs text-error font-medium mt-0.5">
                <AlertCircle size={13} />
                One or more outward quantities exceed available stock.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={batchAdjustMutation.isPending}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={batchAdjustMutation.isPending || !enteredEntries.length || hasOverdraftError}
              className={
                isInward
                  ? 'btn-primary bg-emerald-800 hover:bg-emerald-900 border-emerald-900'
                  : 'btn-primary bg-burgundy hover:bg-burgundy-deep'
              }
            >
              {batchAdjustMutation.isPending
                ? 'Submitting…'
                : isInward
                  ? `Submit Inward (${totalUnits} units)`
                  : `Submit Outward (${totalUnits} units)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
