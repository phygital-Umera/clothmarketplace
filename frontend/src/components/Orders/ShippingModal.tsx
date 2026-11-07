import {useState} from 'react';
import {Order} from '@/types/order';
import {useUpdateOrderShipping} from '@/lib/react-query/queriesAndMutations/order';
import {RefreshCw, Truck, X} from 'lucide-react';

interface Props {
  panel: string;
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COMMON_COURIERS = [
  'Delhivery',
  'BlueDart',
  'DTDC',
  'FedEx',
  'India Post (Speed Post)',
  'Shadowfax',
  'XpressBees',
  'Ecom Express',
  'Self Delivery / In-house',
];

function ShippingModalInner({panel, order, isOpen, onClose, onSuccess}: Props) {
  if (!isOpen || !order) return null;

  const [courierName, setCourierName] = useState(order.courierName || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [comment, setComment] = useState('');

  const shippingMutation = useUpdateOrderShipping(panel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierName.trim() || !trackingNumber.trim()) {
      return;
    }

    await shippingMutation.mutateAsync({
      id: order.id,
      data: {
        courierName: courierName.trim(),
        trackingNumber: trackingNumber.trim(),
        status: order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'PROCESSING' || order.status === 'PACKED' ? 'SHIPPED' : order.status,
        comment: comment.trim() || undefined,
      },
    });

    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-md rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-ivory-50/70">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800">
              <Truck size={16} />
            </span>
            <div>
              <h3 className="font-serif text-headline-sm text-espresso">Shipment & Tracking</h3>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-espresso block mb-1">
              Courier Partner <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              list="courier-suggestions"
              required
              placeholder="e.g. Delhivery, BlueDart, DTDC"
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
              className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            />
            <datalist id="courier-suggestions">
              {COMMON_COURIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-xs font-semibold text-espresso block mb-1">
              Tracking / AWB Number <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DL987654321"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full font-mono font-medium rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-espresso block mb-1">
              Dispatch Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Handed to pickup executive at 4:30 PM"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <div className="rounded-lg bg-ivory-100 p-3 text-xs text-outline">
            Saving tracking details will update shipment information and notify the customer order tracker.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-ivory-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-ivory-300 px-4 py-2 text-body-sm font-medium text-espresso hover:bg-ivory-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={shippingMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-burgundy px-4 py-2 text-body-sm font-medium text-white shadow hover:bg-burgundy/90 disabled:opacity-50"
            >
              {shippingMutation.isPending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Truck size={14} />
              )}
              Save Tracking Info
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Mounted only while open (keyed by the record), so the form starts fresh and hook order never changes */
export default function ShippingModal(props: Props) {
  if (!props.isOpen || !props.order) return null;
  return <ShippingModalInner key={props.order.id} {...props} />;
}
