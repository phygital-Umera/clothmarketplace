import {AdjustStockPayload} from '@/lib/api/ecommerce';
import {useAdjustStock} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {AlertCircle, ArrowDown, ArrowUp, RefreshCw, X} from 'lucide-react';
import {useState} from 'react';

export interface StockAdjustTarget {
  variantId: string;
  inventoryId?: string | null;
  productName: string;
  productSku: string;
  variantSku: string;
  size: string;
  color: string;
  colorHex?: string | null;
  image?: string | null;
  currentPhysical: number;
  currentReserved: number;
  currentAvailable: number;
  threshold: number;
  branchId?: string;
}

interface Props {
  target: StockAdjustTarget | null;
  panel: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const QUICK_REASONS: Record<string, string[]> = {
  INCREASE: ['Supplier Shipment Received', 'Customer Return Restock', 'Stock Audit Count', 'Branch Transfer In'],
  DECREASE: ['Damaged / Defective Stock', 'Loss / Shrinkage', 'Expired / Written Off', 'Branch Transfer Out'],
  CORRECTION: ['Physical Inventory Audit', 'Count Mismatch Correction', 'Initial Stock Setup'],
};

export default function StockAdjustModal({target, panel, onClose, onSuccess}: Props) {
  const [type, setType] = useState<'INCREASE' | 'DECREASE' | 'CORRECTION'>('INCREASE');
  const [qty, setQty] = useState<number | ''>(1);
  const [reason, setReason] = useState('Supplier Shipment Received');
  const [notes, setNotes] = useState('');

  const adjustMutation = useAdjustStock(panel);

  if (!target) return null;

  const numericQty = typeof qty === 'number' ? qty : 0;
  let newPhysical = target.currentPhysical;
  let hasNegativeError = false;

  if (type === 'INCREASE') {
    newPhysical = target.currentPhysical + numericQty;
  } else if (type === 'DECREASE') {
    newPhysical = target.currentPhysical - numericQty;
    if (numericQty > target.currentPhysical) {
      hasNegativeError = true;
    }
  } else if (type === 'CORRECTION') {
    newPhysical = numericQty;
    if (numericQty < 0) {
      hasNegativeError = true;
    }
  }

  const newAvailable = Math.max(0, newPhysical - target.currentReserved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasNegativeError || numericQty < 0 || (type !== 'CORRECTION' && numericQty === 0)) {
      return;
    }

    const payload: AdjustStockPayload = {
      variantId: target.variantId,
      type,
      quantity: numericQty,
      reason: reason.trim() || 'Manual Inventory Adjustment',
      notes: notes.trim() || undefined,
      branchId: target.branchId,
    };

    try {
      await adjustMutation.mutateAsync(payload);
      onClose();
      onSuccess?.();
    } catch {
      // Error handled by mutation toast
    }
  };

  const setAdjustmentType = (newType: 'INCREASE' | 'DECREASE' | 'CORRECTION') => {
    setType(newType);
    setReason(QUICK_REASONS[newType][0] || '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-ivory-300 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-outline hover:text-espresso"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h3 className="font-serif text-headline-sm text-burgundy">Adjust Stock</h3>
        <p className="mt-1 text-body-sm text-outline">
          Update inventory quantities for this specific product variant.
        </p>

        {/* Product Variant Details Card */}
        <div className="mt-4 flex items-center gap-3.5 rounded-lg border border-ivory-300 bg-ivory-100 p-3">
          {target.image ? (
            <img
              src={target.image}
              alt=""
              className="h-12 w-12 rounded object-cover border border-ivory-300"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded border border-ivory-300 bg-ivory-200 text-xs text-outline">
              No Img
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="truncate font-medium text-espresso text-body-md">{target.productName}</h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-outline mt-0.5">
              <span>SKU: {target.variantSku || target.productSku}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-medium text-espresso">
                {target.colorHex && (
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-black/20"
                    style={{backgroundColor: target.colorHex}}
                  />
                )}
                {target.color} / Size {target.size}
              </span>
            </div>
          </div>
        </div>

        {/* Current Stock Preview */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-ivory-300 bg-ivory-50 p-2.5">
            <p className="text-label-caps uppercase text-outline">Physical</p>
            <p className="mt-1 text-headline-sm font-semibold text-espresso">{target.currentPhysical}</p>
          </div>
          <div className="rounded-lg border border-ivory-300 bg-ivory-50 p-2.5">
            <p className="text-label-caps uppercase text-outline">Reserved</p>
            <p className="mt-1 text-headline-sm font-semibold text-outline">{target.currentReserved}</p>
          </div>
          <div className="rounded-lg border border-ivory-300 bg-ivory-50 p-2.5">
            <p className="text-label-caps uppercase text-outline">Available</p>
            <p
              className={`mt-1 text-headline-sm font-semibold ${
                target.currentAvailable <= target.threshold ? 'text-burgundy' : 'text-emerald-700'
              }`}
            >
              {target.currentAvailable}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Action Type Tabs */}
          <div>
            <label className="text-label-caps block text-espresso mb-1.5">Action</label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-ivory-300 bg-ivory-100 p-1">
              <button
                type="button"
                onClick={() => setAdjustmentType('INCREASE')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
                  type === 'INCREASE'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-outline hover:text-espresso'
                }`}
              >
                <ArrowUp size={14} className="text-emerald-600" /> Restock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('DECREASE')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
                  type === 'DECREASE'
                    ? 'bg-white text-rose-800 shadow-sm'
                    : 'text-outline hover:text-espresso'
                }`}
              >
                <ArrowDown size={14} className="text-rose-600" /> Reduce
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('CORRECTION')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
                  type === 'CORRECTION'
                    ? 'bg-white text-burgundy shadow-sm'
                    : 'text-outline hover:text-espresso'
                }`}
              >
                <RefreshCw size={13} className="text-burgundy" /> Set Count
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-label-caps text-espresso">
                {type === 'CORRECTION' ? 'New Exact Count' : 'Quantity to ' + (type === 'INCREASE' ? 'Add' : 'Reduce')}
              </label>
              <span className="text-xs font-medium text-espresso">
                Resulting Physical: <span className={hasNegativeError ? 'text-error' : 'text-emerald-700 font-bold'}>{newPhysical}</span>
              </span>
            </div>
            <input
              type="number"
              min={type === 'CORRECTION' ? 0 : 1}
              required
              value={qty}
              onChange={(e) => setQty(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
              className={`w-full rounded-lg border p-2.5 text-body-md focus:outline-none ${
                hasNegativeError
                  ? 'border-error focus:ring-1 focus:ring-error'
                  : 'border-ivory-300 bg-white focus:border-burgundy'
              }`}
            />
            {hasNegativeError && (
              <p className="mt-1 flex items-center gap-1 text-xs text-error font-medium">
                <AlertCircle size={13} />
                Cannot reduce stock below 0. Maximum reduction is {target.currentPhysical}.
              </p>
            )}
          </div>

          {/* Reason Selection */}
          <div>
            <label className="text-label-caps block text-espresso mb-1">Reason</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_REASONS[type].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-full px-2.5 py-1 text-xs transition border ${
                    reason === r
                      ? 'border-burgundy bg-burgundy/10 text-burgundy font-medium'
                      : 'border-ivory-300 bg-ivory-100 text-outline hover:border-outline'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              placeholder="Or enter custom reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-ivory-300 bg-white p-2.5 text-body-sm focus:border-burgundy focus:outline-none"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="text-label-caps block text-espresso mb-1">Notes / Reference (Optional)</label>
            <input
              type="text"
              placeholder="e.g. PO#9821, Invoice #4402, Audit note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-ivory-300 bg-white p-2 text-body-sm focus:border-burgundy focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2.5 pt-2 border-t border-ivory-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              disabled={adjustMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjustMutation.isPending || hasNegativeError || qty === '' || (type !== 'CORRECTION' && qty <= 0)}
              className="btn-primary"
            >
              {adjustMutation.isPending ? 'Saving...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

