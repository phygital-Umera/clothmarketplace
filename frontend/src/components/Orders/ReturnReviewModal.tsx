import {useState} from 'react';
import {RefundStatus, ReturnRequestItem, ReturnStatus} from '@/types/order';
import {useUpdateReturnStatus} from '@/lib/react-query/queriesAndMutations/order';
import {CheckCircle2, RefreshCw, RotateCcw, X} from 'lucide-react';

interface Props {
  panel: string;
  returnItem: ReturnRequestItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RETURN_STATUS_OPTIONS: {label: string; value: ReturnStatus}[] = [
  {value: 'REQUESTED', label: 'Requested (Pending Review)'},
  {value: 'IN_REVIEW', label: 'In Review / Inspection'},
  {value: 'APPROVED', label: 'Approved (Awaiting Return Pickup)'},
  {value: 'RECEIVED', label: 'Received & Quality Checked'},
  {value: 'COMPLETED', label: 'Completed (Return & Refund Done)'},
  {value: 'REJECTED', label: 'Rejected (Declined)'},
];

const REFUND_STATUS_OPTIONS: {label: string; value: RefundStatus}[] = [
  {value: 'NONE', label: 'None'},
  {value: 'PENDING', label: 'Pending Processing'},
  {value: 'APPROVED', label: 'Refund Approved'},
  {value: 'PROCESSED', label: 'Refund Processed & Transferred'},
  {value: 'REJECTED', label: 'Refund Rejected'},
];

export default function ReturnReviewModal({panel, returnItem, isOpen, onClose, onSuccess}: Props) {
  if (!isOpen || !returnItem) return null;

  const [returnStatus, setReturnStatus] = useState<ReturnStatus>(returnItem.returnStatus);
  const [refundStatus, setRefundStatus] = useState<RefundStatus>(returnItem.refundStatus);
  const [notes, setNotes] = useState(returnItem.notes || '');
  const [restock, setRestock] = useState(true);

  const updateMutation = useUpdateReturnStatus(panel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      id: returnItem.id,
      data: {
        returnStatus,
        refundStatus,
        notes: notes.trim() || undefined,
        restock: (returnStatus === 'RECEIVED' || returnStatus === 'COMPLETED') && restock,
      },
    });
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-lg rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-orange-50/70">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-800">
              <RotateCcw size={18} />
            </span>
            <div>
              <h3 className="font-serif text-headline-sm text-espresso">Manage Return Request</h3>
              <p className="text-xs text-outline">Order #{returnItem.order?.orderNumber}</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-orange-950">Customer: {returnItem.customer?.fullname}</span>
              <span className="text-orange-900 font-medium">Refund Amount: ₹{returnItem.refundAmount || returnItem.order?.totalAmount || 0}</span>
            </div>
            <p className="text-xs text-espresso">
              <span className="font-semibold">Reason:</span> {returnItem.reason}
            </p>
            {returnItem.description && (
              <p className="text-xs text-outline italic">"{returnItem.description}"</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-espresso block mb-1">
                Return Status <span className="text-rose-600">*</span>
              </label>
              <select
                value={returnStatus}
                onChange={(e) => setReturnStatus(e.target.value as ReturnStatus)}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3 py-2 text-xs text-espresso focus:border-burgundy focus:outline-none"
              >
                {RETURN_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-espresso block mb-1">
                Refund Status <span className="text-rose-600">*</span>
              </label>
              <select
                value={refundStatus}
                onChange={(e) => setRefundStatus(e.target.value as RefundStatus)}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3 py-2 text-xs text-espresso focus:border-burgundy focus:outline-none"
              >
                {REFUND_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(returnStatus === 'RECEIVED' || returnStatus === 'COMPLETED') && (
            <label className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={restock}
                onChange={(e) => setRestock(e.target.checked)}
                className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span className="text-xs font-medium text-emerald-900">
                Restock returned items back into Shop & Branch Inventory automatically
              </span>
            </label>
          )}

          <div>
            <label className="text-xs font-semibold text-espresso block mb-1">
              Inspection / Processing Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Item received in original packaging, tags intact. Refund processed via gateway."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-ivory-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-ivory-300 px-4 py-2 text-body-sm font-medium text-espresso hover:bg-ivory-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-burgundy px-4 py-2 text-body-sm font-medium text-white shadow hover:bg-burgundy/90 disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              Save Return Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

