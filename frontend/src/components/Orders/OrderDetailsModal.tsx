import {useState} from 'react';
import {Order} from '@/types/order';
import OrderStatusBadge from './OrderStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';
import OrderStatusUpdateModal from './OrderStatusUpdateModal';
import ShippingModal from './ShippingModal';
import CancellationReviewModal from './CancellationReviewModal';
import {generateOrderInvoice} from '@/utils/invoiceGenerator';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Tag,
  Truck,
  User,
  X,
} from 'lucide-react';

interface Props {
  panel: string;
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

function OrderDetailsModalInner({panel, order, isOpen, onClose, onRefresh}: Props) {
  if (!isOpen || !order) return null;

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const addr = order.shippingAddress || {};

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-3 sm:p-5 backdrop-blur-sm">
        <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory-200 px-6 py-4 bg-ivory-50/70">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-burgundy/10 text-burgundy">
                <Package size={22} />
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-serif text-headline-sm text-espresso font-bold">
                    Order #{order.orderNumber}
                  </h3>
                  <OrderStatusBadge status={order.status} size="md" />
                  <PaymentStatusBadge status={order.paymentStatus} size="md" />
                </div>
                <p className="text-xs text-outline flex items-center gap-2 mt-0.5">
                  <span>Placed on {new Date(order.createdAt).toLocaleString()}</span>
                  <span>•</span>
                  <span>Store: {order.shop?.name || order.branch?.name || 'Central Store'}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => generateOrderInvoice(order)}
                className="flex items-center gap-1.5 rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs font-semibold text-espresso shadow-sm hover:bg-ivory-100"
                title="Download Tax Invoice PDF"
              >
                <Download size={14} className="text-burgundy" /> Tax Invoice
              </button>

              <button
                type="button"
                onClick={() => setIsShippingModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 shadow-sm hover:bg-cyan-100"
              >
                <Truck size={14} /> Shipping
              </button>

              <button
                type="button"
                onClick={() => setIsStatusModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-burgundy px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-burgundy/90"
              >
                Update Status
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-outline hover:bg-ivory-200 hover:text-espresso"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Cancellation Alert Banner */}
          {order.cancelRequested && order.cancelApproved === null && (
            <div className="flex items-center justify-between gap-3 bg-amber-500/10 border-b border-amber-300 px-6 py-2.5 text-amber-900">
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle size={16} className="text-amber-700 shrink-0" />
                <span>
                  <strong>Customer requested cancellation:</strong> "{order.cancelReason}"
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="shrink-0 rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
              >
                Review Request
              </button>
            </div>
          )}

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* 1. Ordered Products List */}
            <div className="rounded-xl border border-ivory-200 bg-white overflow-hidden shadow-sm">
              <div className="border-b border-ivory-200 bg-ivory-50/50 px-4 py-3 flex justify-between items-center">
                <h4 className="font-semibold text-xs text-espresso uppercase tracking-wider">
                  Ordered Items ({order.items?.length || 0})
                </h4>
                <span className="text-xs text-outline">All prices in INR (₹)</span>
              </div>

              <div className="divide-y divide-ivory-200">
                {order.items?.map((item) => {
                  const title = item.productName || item.product?.name || 'Product';
                  const img = item.image || item.product?.images?.[0]?.url;
                  const size = item.size || item.variant?.size;
                  const color = item.color || item.variant?.color;
                  const sku = item.variantSku || item.variant?.variantSku || item.product?.sku;

                  return (
                    <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-ivory-50/30 transition">
                      <div className="h-16 w-16 shrink-0 rounded-lg border border-ivory-300 bg-ivory-100 overflow-hidden flex items-center justify-center">
                        {img ? (
                          <img src={img} alt={title} className="h-full w-full object-cover" />
                        ) : (
                          <Package size={22} className="text-outline" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-espresso truncate">{title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {sku && (
                            <span className="font-mono text-[11px] bg-ivory-100 px-2 py-0.5 rounded text-outline">
                              SKU: {sku}
                            </span>
                          )}
                          {size && (
                            <span className="text-[11px] font-medium bg-ivory-200 px-2 py-0.5 rounded text-espresso">
                              Size: {size}
                            </span>
                          )}
                          {color && (
                            <span className="text-[11px] font-medium bg-ivory-200 px-2 py-0.5 rounded text-espresso">
                              Color: {color}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs text-outline">
                          {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                        </p>
                        <p className="font-semibold text-sm text-espresso mt-0.5">
                          ₹{item.totalPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Grid of Details: Financial, Customer/Shipping, Payment, Shipment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Shipping & Delivery Card */}
              <div className="rounded-xl border border-ivory-200 bg-white p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 border-b border-ivory-100 pb-2">
                  <MapPin size={16} className="text-burgundy" />
                  <h4 className="font-semibold text-xs text-espresso uppercase tracking-wider">
                    Shipping & Delivery Address
                  </h4>
                </div>

                <div className="text-xs space-y-1 text-espresso">
                  <p className="font-bold text-sm text-espresso">{addr.recipient || order.customer?.fullname}</p>
                  <p className="flex items-center gap-1.5 text-outline">
                    <Phone size={12} /> +91 {addr.phone || order.customer?.phoneNumber}
                  </p>
                  {order.customer?.email && (
                    <p className="text-outline">{order.customer.email}</p>
                  )}
                  <div className="pt-2 border-t border-ivory-100 text-espresso leading-relaxed">
                    {addr.address1 && <p>{addr.address1}</p>}
                    {addr.address2 && <p>{addr.address2}</p>}
                    <p>
                      {[addr.city, addr.district, addr.state].filter(Boolean).join(', ')}
                      {addr.postalCode ? ` - ${addr.postalCode}` : ''}
                    </p>
                    {addr.country && <p className="text-outline">{addr.country}</p>}
                  </div>
                </div>

                {/* Tracking info if present */}
                {order.trackingNumber ? (
                  <div className="rounded-lg bg-cyan-50/70 border border-cyan-200 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-900 flex items-center gap-1">
                        <Truck size={13} /> {order.courierName || 'Courier Partner'}
                      </span>
                      <span className="font-mono text-cyan-800 font-semibold">{order.trackingNumber}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-ivory-100 p-2.5 text-xs text-outline flex items-center justify-between">
                    <span>No tracking info assigned yet</span>
                    <button
                      type="button"
                      onClick={() => setIsShippingModalOpen(true)}
                      className="text-burgundy font-medium hover:underline text-[11px]"
                    >
                      + Add Tracking
                    </button>
                  </div>
                )}
              </div>

              {/* Financial Calculation Summary */}
              <div className="rounded-xl border border-ivory-200 bg-white p-4 space-y-3 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-ivory-100 pb-2">
                    <Tag size={16} className="text-burgundy" />
                    <h4 className="font-semibold text-xs text-espresso uppercase tracking-wider">
                      Price Breakdown & Payment
                    </h4>
                  </div>

                  <dl className="divide-y divide-ivory-100 text-xs py-2">
                    <div className="flex justify-between py-1.5 text-espresso">
                      <dt className="text-outline">Subtotal ({order.items?.length || 0} items):</dt>
                      <dd className="font-medium">₹{order.subtotal.toFixed(2)}</dd>
                    </div>

                    {order.couponDiscount > 0 && (
                      <div className="flex justify-between py-1.5 text-emerald-700">
                        <dt className="flex items-center gap-1 font-medium">
                          <span>Coupon Discount</span>
                          {order.couponCode && (
                            <span className="font-mono uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px]">
                              {order.couponCode}
                            </span>
                          )}
                        </dt>
                        <dd className="font-bold">- ₹{order.couponDiscount.toFixed(2)}</dd>
                      </div>
                    )}

                    <div className="flex justify-between py-1.5 text-espresso">
                      <dt className="text-outline">Shipping Fee:</dt>
                      <dd className="font-medium">
                        {order.shippingFee > 0 ? `₹${order.shippingFee.toFixed(2)}` : <span className="text-emerald-700 font-medium">FREE</span>}
                      </dd>
                    </div>

                    <div className="flex justify-between py-1.5 text-espresso">
                      <dt className="text-outline">Estimated Taxes (Included):</dt>
                      <dd className="font-medium">₹{(order.tax || 0).toFixed(2)}</dd>
                    </div>

                    <div className="flex justify-between py-2 text-base font-bold text-espresso border-t border-ivory-300">
                      <dt className="text-burgundy">Total Amount:</dt>
                      <dd className="text-burgundy">₹{order.totalAmount.toFixed(2)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg bg-ivory-50 p-2.5 border border-ivory-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-outline block text-[11px]">Payment Mode</span>
                    <span className="font-semibold text-espresso">
                      {order.paymentMethod === 'ONLINE' ? 'Online Payment / Gateway' : 'Cash on Delivery (COD)'}
                    </span>
                  </div>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
              </div>
            </div>

            {/* 3. Status History Timeline */}
            <div className="rounded-xl border border-ivory-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-ivory-100 pb-2">
                <Clock size={16} className="text-burgundy" />
                <h4 className="font-semibold text-xs text-espresso uppercase tracking-wider">
                  Order Status Audit History & Timeline
                </h4>
              </div>

              {order.statusHistory && order.statusHistory.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:bottom-2 before:top-2 before:left-2 before:w-0.5 before:bg-ivory-300">
                  {order.statusHistory.map((h) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-burgundy shadow-sm" />
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={h.status} size="sm" />
                        <span className="text-xs text-outline">
                          {new Date(h.createdAt).toLocaleString()}
                        </span>
                        {h.updatedBy && (
                          <span className="text-[11px] text-outline bg-ivory-100 px-2 py-0.5 rounded">
                            By: {h.updatedBy.fullname} ({h.updatedBy.role})
                          </span>
                        )}
                      </div>
                      {h.comment && (
                        <p className="text-xs text-espresso mt-1">{h.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-outline">Initial order created at {new Date(order.createdAt).toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-ivory-200 px-6 py-3 bg-ivory-50/70">
            <span className="text-xs text-outline">
              Order ID: <code className="text-espresso font-mono font-medium">{order.id}</code>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-espresso px-4 py-2 text-xs font-medium text-white shadow hover:bg-espresso/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <OrderStatusUpdateModal
        panel={panel}
        order={order}
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSuccess={() => {
          onRefresh?.();
          onClose();
        }}
      />

      <ShippingModal
        panel={panel}
        order={order}
        isOpen={isShippingModalOpen}
        onClose={() => setIsShippingModalOpen(false)}
        onSuccess={() => {
          onRefresh?.();
          onClose();
        }}
      />

      <CancellationReviewModal
        panel={panel}
        order={order}
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onSuccess={() => {
          onRefresh?.();
          onClose();
        }}
      />
    </>
  );
}

/** Mounted only while open (keyed by the record), so the form starts fresh and hook order never changes */
export default function OrderDetailsModal(props: Props) {
  if (!props.isOpen || !props.order) return null;
  return <OrderDetailsModalInner key={props.order.id} {...props} />;
}
