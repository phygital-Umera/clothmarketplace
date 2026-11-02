import {useState} from 'react';
import {
  useCancelCustomerOrder,
  useCustomerOrders,
  useReturnCustomerOrder,
} from '@/lib/react-query/queriesAndMutations/order';
import {Order, OrderStatus} from '@/types/order';
import OrderStatusBadge from '@/components/Orders/OrderStatusBadge';
import PaymentStatusBadge from '@/components/Orders/PaymentStatusBadge';
import {generateOrderInvoice} from '@/utils/invoiceGenerator';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  MapPin,
  Package,
  RotateCcw,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from 'lucide-react';

const PROGRESS_STEPS: {status: OrderStatus; label: string}[] = [
  {status: 'PENDING', label: 'Order Placed'},
  {status: 'CONFIRMED', label: 'Confirmed'},
  {status: 'PROCESSING', label: 'Processing'},
  {status: 'PACKED', label: 'Packed'},
  {status: 'SHIPPED', label: 'Shipped'},
  {status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery'},
  {status: 'DELIVERED', label: 'Delivered'},
];

const STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  PACKED: 3,
  READY_FOR_DISPATCH: 3,
  DISPATCHED: 4,
  SHIPPED: 4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED: 6,
  CANCELLED: -1,
  RETURNED: -2,
};

export default function MyOrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnDescription, setReturnDescription] = useState('');

  const {data, isLoading, refetch} = useCustomerOrders({page: 1, limit: 30});
  const cancelMutation = useCancelCustomerOrder();
  const returnMutation = useReturnCustomerOrder();

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder || !cancelReason.trim()) return;

    await cancelMutation.mutateAsync({
      id: cancelModalOrder.id,
      reason: cancelReason.trim(),
    });

    setCancelModalOrder(null);
    setCancelReason('');
    refetch();
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalOrder || !returnReason.trim()) return;

    await returnMutation.mutateAsync({
      id: returnModalOrder.id,
      data: {
        reason: returnReason.trim(),
        description: returnDescription.trim() || undefined,
      },
    });

    setReturnModalOrder(null);
    setReturnReason('');
    setReturnDescription('');
    refetch();
  };

  const orders = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="border-b border-ivory-300 pb-3">
        <h2 className="font-serif text-headline-sm text-espresso font-bold">My Orders</h2>
        <p className="text-xs text-outline">
          Track current shipments, review purchase history, and download tax invoices.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-ivory-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-burgundy/10 text-burgundy mb-3">
            <ShoppingBag size={28} />
          </div>
          <h3 className="font-serif text-lg font-bold text-espresso">No Orders Placed Yet</h3>
          <p className="text-xs text-outline max-w-sm mx-auto mt-1">
            When you purchase apparel from our store, your real-time tracking, invoices, and fulfillment history will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const currentRank = STATUS_RANK[o.status] ?? 0;
            const isCancelled = o.status === 'CANCELLED';
            const isReturned = o.status === 'RETURNED';
            const canCancel = (o.status === 'PENDING' || o.status === 'CONFIRMED') && !o.cancelRequested;
            const canReturn = o.status === 'DELIVERED';

            return (
              <div
                key={o.id}
                className="rounded-2xl border border-ivory-300 bg-white p-5 shadow-sm space-y-4 hover:border-burgundy/40 transition"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory-200 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-sm text-espresso">
                        Order #{o.orderNumber}
                      </span>
                      <OrderStatusBadge status={o.status} />
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </div>
                    <p className="text-[11px] text-outline mt-1 flex items-center gap-2">
                      <span>Placed on {new Date(o.createdAt).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                      <span>•</span>
                      <span>Store: {o.shop?.name || 'Central Store'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => generateOrderInvoice(o)}
                      className="flex items-center gap-1.5 rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-ivory-100 shadow-sm"
                    >
                      <Download size={13} className="text-burgundy" /> Invoice
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="flex items-center gap-1.5 rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-ivory-100 shadow-sm"
                    >
                      <Eye size={13} /> View Details
                    </button>

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => setCancelModalOrder(o)}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-sm"
                      >
                        Cancel Order
                      </button>
                    )}

                    {canReturn && (
                      <button
                        type="button"
                        onClick={() => setReturnModalOrder(o)}
                        className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 shadow-sm"
                      >
                        Request Return
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Order Progress Tracker */}
                {!isCancelled && !isReturned && (
                  <div className="py-2">
                    <div className="relative flex items-center justify-between">
                      <div className="absolute left-2 right-2 top-3 h-0.5 bg-ivory-300 -z-0" />
                      <div
                        className="absolute left-2 top-3 h-0.5 bg-emerald-600 -z-0 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (Math.max(0, currentRank) / (PROGRESS_STEPS.length - 1)) * 100)}%`,
                        }}
                      />

                      {PROGRESS_STEPS.map((step, idx) => {
                        const isDone = currentRank >= idx;
                        const isCurrent = currentRank === idx;

                        return (
                          <div key={step.status} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border-2 transition ${
                                isDone
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-ivory-300 bg-white text-outline'
                              } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                            >
                              {isDone ? '✓' : idx + 1}
                            </div>
                            <span
                              className={`mt-1.5 text-[10px] hidden sm:block ${
                                isDone ? 'font-semibold text-espresso' : 'text-outline'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items Preview */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-ivory-100">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {o.items?.slice(0, 3).map((item, idx) => {
                        const img = item.image || item.product?.images?.[0]?.url;
                        return (
                          <div
                            key={idx}
                            className="h-12 w-12 rounded-lg border border-ivory-300 bg-ivory-100 overflow-hidden shrink-0 shadow-sm"
                          >
                            {img ? (
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package size={20} className="m-auto text-outline mt-3" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-espresso">
                        {o.items?.[0]?.productName || o.items?.[0]?.product?.name}
                        {o.items?.length > 1 ? ` + ${o.items.length - 1} more items` : ''}
                      </p>
                      <p className="text-[11px] text-outline">
                        {o.items?.length || 0} product(s) in this shipment
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-outline block">Total Paid</span>
                    <span className="font-serif text-lg font-bold text-burgundy">
                      ₹{o.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Cancel Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-ivory-300 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-ivory-200 pb-3">
              <h3 className="font-serif text-headline-sm text-espresso font-bold">Request Order Cancellation</h3>
              <button type="button" onClick={() => setCancelModalOrder(null)}>
                <X size={18} className="text-outline" />
              </button>
            </div>
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <p className="text-xs text-outline">
                Order #{cancelModalOrder.orderNumber} is still pending dispatch. Please share the reason for cancellation:
              </p>
              <textarea
                required
                rows={3}
                placeholder="e.g. Ordered incorrect size, changed mind, duplicate order"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-ivory-300 p-3 text-xs text-espresso focus:border-burgundy focus:outline-none"
              />
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  className="rounded-lg border border-ivory-300 px-3.5 py-1.5 text-xs text-espresso"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={cancelMutation.isPending}
                  className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-700"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Return Modal */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-ivory-300 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-ivory-200 pb-3">
              <h3 className="font-serif text-headline-sm text-espresso font-bold">Request Return</h3>
              <button type="button" onClick={() => setReturnModalOrder(null)}>
                <X size={18} className="text-outline" />
              </button>
            </div>
            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-espresso block mb-1">
                  Reason for Return <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full rounded-lg border border-ivory-300 p-2 text-xs text-espresso focus:border-burgundy focus:outline-none"
                >
                  <option value="">Select Return Reason</option>
                  <option value="Size doesn't fit">Size doesn't fit (Too small/large)</option>
                  <option value="Color or style differs from image">Color or style differs from image</option>
                  <option value="Defective / damaged item">Defective / damaged item</option>
                  <option value="Wrong product received">Wrong product received</option>
                  <option value="Quality not as expected">Quality not as expected</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-espresso block mb-1">
                  Additional Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the issue with the delivered product"
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  className="w-full rounded-lg border border-ivory-300 p-2 text-xs text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOrder(null)}
                  className="rounded-lg border border-ivory-300 px-3.5 py-1.5 text-xs text-espresso"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnMutation.isPending}
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-orange-700"
                >
                  Submit Return Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-ivory-300 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-ivory-200 pb-3">
              <div>
                <h3 className="font-serif text-headline-sm text-espresso font-bold">
                  Order Details #{selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-outline">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}>
                <X size={18} className="text-outline" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-espresso">Purchased Items</h4>
              <div className="divide-y divide-ivory-200 rounded-xl border border-ivory-200">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3">
                    <div className="h-12 w-12 rounded bg-ivory-100 overflow-hidden shrink-0 border border-ivory-300">
                      {item.image || item.product?.images?.[0]?.url ? (
                        <img
                          src={item.image || item.product?.images?.[0]?.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package size={20} className="m-auto mt-2 text-outline" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-espresso truncate">
                        {item.productName || item.product?.name}
                      </p>
                      <p className="text-[11px] text-outline">
                        Size: {item.size || '-'} | Color: {item.color || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-espresso">₹{item.totalPrice.toFixed(2)}</p>
                      <p className="text-[10px] text-outline">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-ivory-200 p-3 space-y-1">
                <span className="font-semibold text-espresso block mb-1">Delivery Address</span>
                <p className="font-medium text-espresso">{selectedOrder.shippingAddress?.recipient}</p>
                <p className="text-outline">{selectedOrder.shippingAddress?.address1}</p>
                <p className="text-outline">
                  {[selectedOrder.shippingAddress?.city, selectedOrder.shippingAddress?.state, selectedOrder.shippingAddress?.postalCode].filter(Boolean).join(', ')}
                </p>
                <p className="text-outline font-mono">+91 {selectedOrder.shippingAddress?.phone}</p>
              </div>

              <div className="rounded-xl border border-ivory-200 p-3 space-y-1.5">
                <span className="font-semibold text-espresso block mb-1">Payment & Charges</span>
                <div className="flex justify-between text-outline">
                  <span>Subtotal:</span>
                  <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount:</span>
                    <span>- ₹{selectedOrder.couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-outline">
                  <span>Shipping:</span>
                  <span>{selectedOrder.shippingFee > 0 ? `₹${selectedOrder.shippingFee.toFixed(2)}` : 'FREE'}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-burgundy pt-1 border-t border-ivory-200">
                  <span>Grand Total:</span>
                  <span>₹{selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-ivory-200">
              <button
                type="button"
                onClick={() => generateOrderInvoice(selectedOrder)}
                className="flex items-center gap-1.5 rounded-lg border border-ivory-300 bg-white px-4 py-2 text-xs font-semibold text-espresso hover:bg-ivory-100"
              >
                <Download size={14} className="text-burgundy" /> Download Invoice PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg bg-espresso px-4 py-2 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

