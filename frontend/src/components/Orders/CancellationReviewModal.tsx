import {useState} from 'react';
import {Order} from '@/types/order';
import {useReviewCancellation} from '@/lib/react-query/queriesAndMutations/order';
import {AlertTriangle, CheckCircle, RefreshCw, XCircle, X} from 'lucide-react';

interface Props {
  panel: string;
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CancellationReviewModal({panel, order, isOpen, onClose, onSuccess}: Props) {
  if (!isOpen || !order) return null;

  const [reason, setReason] = useState('');
  const reviewMutation = useReviewCancellation(panel);

  const handleAction = async (approve: boolean) => {
    await reviewMutation.mutateAsync({
      id: order.id,
      data: {
        approve,
        reason: reason.trim() || undefined,
      },
    });
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-lg rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-amber-50/70">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle size={18} />
            </span>
            <div>
              <h3 className="font-serif text-headline-sm text-espresso">Review Cancellation Request</h3>
              <p className="text-xs text-outline">Order #{order.orderNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-outline hover:bg-ivory-200 hover:text-espresso"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              Customer Cancellation Reason
            </p>
            <p className="text-body-sm text-espresso italic">
              "{order.cancelReason || 'Customer requested order cancellation before dispatch.'}"
            </p>
            {order.cancelRequestedAt && (
              <p className="text-[11px] text-outline">
                Requested on: {new Date(order.cancelRequestedAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-ivory-200 bg-ivory-50/60 p-4 space-y-2">
            <p className="text-xs font-semibold text-espresso">Order Items & Inventory Restock</p>
            <ul className="space-y-1.5 text-xs text-espresso">
              {order.items?.map((item) => (
                <li key={item.id} className="flex justify-between items-center py-0.5 border-b border-ivory-200 last:border-none">
                  <span>
                    {item.productName || item.product?.name} ({item.size} / {item.color})
                  </span>
                  <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    +{item.quantity} qty to restore
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-outline pt-1">
              ✓ Approving this request will automatically cancel the order, mark refund (if paid online), and restore variant stock back into your inventory.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-espresso block mb-1">
              Review Note / Rejection Reason
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Approved and inventory restored, or Parcel already handed over to courier"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-ivory-200">
            <button
              type="button"
              disabled={reviewMutation.isPending}
              onClick={() => handleAction(false)}
              className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-body-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              <XCircle size={15} /> Reject Request
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-ivory-300 px-3.5 py-2 text-body-sm font-medium text-espresso hover:bg-ivory-100"
              >
                Close
              </button>
              <button
                type="button"
                disabled={reviewMutation.isPending}
                onClick={() => handleAction(true)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-body-sm font-medium text-white shadow hover:bg-emerald-800 disabled:opacity-50"
              >
                {reviewMutation.isPending ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={15} />
                )}
                Approve & Restore Stock
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

