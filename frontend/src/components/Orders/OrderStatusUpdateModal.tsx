import {useState} from 'react';
import {Order, OrderStatus} from '@/types/order';
import {useUpdateOrderStatus} from '@/lib/react-query/queriesAndMutations/order';
import {CheckCircle2, RefreshCw, X} from 'lucide-react';

/** Same rules as the server: forward only; Delivered changes only through a return */
const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'PACKED', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  READY_FOR_DISPATCH: ['SHIPPED', 'CANCELLED'],
  DISPATCHED: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'SHIPPED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

interface Props {
  panel: string;
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ORDER_STATUS_OPTIONS: {label: string; value: OrderStatus; desc: string}[] = [
  {value: 'PENDING', label: 'Pending', desc: 'Order received from customer, awaiting confirmation'},
  {value: 'CONFIRMED', label: 'Confirmed', desc: 'Order confirmed by store / shop admin'},
  {value: 'PROCESSING', label: 'Processing', desc: 'Items being picked and gathered from inventory'},
  {value: 'PACKED', label: 'Packed', desc: 'Items packed in shipping parcel and labeled'},
  {value: 'SHIPPED', label: 'Shipped', desc: 'Parcel handed over to courier partner for transit'},
  {value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Shipment with local delivery agent'},
  {value: 'DELIVERED', label: 'Delivered', desc: 'Order successfully delivered to customer'},
  {value: 'CANCELLED', label: 'Cancelled', desc: 'Order cancelled'},
];

export default function OrderStatusUpdateModal({panel, order, isOpen, onClose, onSuccess}: Props) {
  // Hooks live in the form, so opening and closing never changes the hook order
  if (!isOpen || !order) return null;
  return <StatusForm key={order.id} panel={panel} order={order} onClose={onClose} onSuccess={onSuccess} />;
}

function StatusForm({panel, order, onClose, onSuccess}: {panel: string; order: Order; onClose: () => void; onSuccess?: () => void}) {

  const next = NEXT_STATUS[order.status] ?? [];
  const options = ORDER_STATUS_OPTIONS.filter((o) => next.includes(o.value));
  const [status, setStatus] = useState<OrderStatus>(next[0] ?? order.status);
  const awaitingPayment = order.status === 'PENDING' && order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'PAID';
  const [comment, setComment] = useState('');
  const [courierName, setCourierName] = useState(order.courierName || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');

  const updateMutation = useUpdateOrderStatus(panel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      id: order.id,
      data: {
        status,
        comment: comment.trim() || undefined,
        courierName: courierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
      },
    });
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-md rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-ivory-50/70">
          <div>
            <h3 className="font-serif text-headline-sm text-espresso">Update Order Status</h3>
            <p className="text-xs text-outline">Order #{order.orderNumber}</p>
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
          <div>
            <label className="text-xs font-semibold text-espresso block mb-1">
              Select New Status <span className="text-rose-600">*</span>
            </label>
            {!options.length && (
              <p className="rounded-lg bg-ivory-100 px-3 py-2 text-body-sm text-outline">
                {order.status === 'DELIVERED'
                  ? 'This order is delivered. Changes now happen through a return request.'
                  : 'This order is closed and its status cannot change.'}
              </p>
            )}
            {awaitingPayment && (
              <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-body-sm text-amber-800">
                Waiting for the customer's online payment. Confirm it once paid, or cancel it.
              </p>
            )}
            <select
              hidden={!options.length}
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.desc}
                </option>
              ))}
            </select>
          </div>

          {(status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY') && (
            <div className="space-y-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-3.5">
              <p className="text-xs font-semibold text-cyan-900">Shipment Details</p>
              <div>
                <label className="text-[11px] font-medium text-espresso block mb-1">
                  Courier Partner Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delhivery, BlueDart, DTDC, FedEx"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full rounded border border-ivory-300 bg-white px-3 py-1.5 text-xs text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-espresso block mb-1">
                  Tracking Number / AWB #
                </label>
                <input
                  type="text"
                  placeholder="e.g. DL123456789IN"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full rounded border border-ivory-300 bg-white px-3 py-1.5 text-xs text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-espresso block mb-1">
              Internal Note / Update Reason
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Packed in warehouse, handed to delivery agent"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
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
              disabled={updateMutation.isPending || !options.length}
              className="flex items-center gap-2 rounded-lg bg-burgundy px-4 py-2 text-body-sm font-medium text-white shadow hover:bg-burgundy/90 disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              Update Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

