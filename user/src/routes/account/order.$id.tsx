import {useState} from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {ArrowLeft, Copy, CreditCard, FileText, HelpCircle, MapPin, Package, RotateCcw, ShoppingBag, Star, Truck} from 'lucide-react';
import toast from 'react-hot-toast';
import {useBuyAgain, useOrder} from '@/lib/queries';
import {dateTime, historyText, inr, ORDER_STATUS_LABEL, pluralize, shortDate, sizeText} from '@/lib/format';
import type {Order} from '@/lib/types';
import {btn, ErrorBox, ProductVisual, Spinner} from '@/components/ui';
import {AddressLines} from '@/components/AddressForm';
import {card, Chip, OrderChip, TrackStepper} from '@/components/account';
import {CancelDialog} from './orders';

export const Route = createFileRoute('/account/order/$id')({component: OrderPage});

const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long'});

/** The big line at the top: what is happening with the order right now */
const headline = (o: Order) => {
  if (o.status === 'CANCELLED') return {title: 'Order cancelled', sub: o.history.at(-1) ? `on ${shortDate(o.history.at(-1)!.createdAt)}` : ''};
  if (o.status === 'RETURNED') return {title: 'Returned and refunded', sub: 'The refund has been sent to you'};
  if (o.status === 'DELIVERED') return {title: 'Delivered', sub: o.deliveredAt ? `on ${longDate(o.deliveredAt)}` : ''};
  if (o.status === 'OUT_FOR_DELIVERY') return {title: 'Out for delivery today', sub: 'Keep your phone handy. The courier will call before arriving.'};
  if (o.can.pay) return {title: 'Waiting for payment', sub: 'Complete the payment so the shop can pack your order'};
  return {title: ORDER_STATUS_LABEL[o.status], sub: o.expectedBy ? `Arriving by ${longDate(o.expectedBy)}` : ''};
};

function OrderPage() {
  const {id} = Route.useParams();
  const {data: o, isLoading, error, refetch} = useOrder(id);
  const buyAgain = useBuyAgain();
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  if (isLoading) return <Spinner />;
  if (error || !o) return <ErrorBox message="We could not find this order." retry={refetch} />;

  const h = headline(o);
  const units = o.items.reduce((n, i) => n + i.quantity, 0);
  const openReturns = o.returns.filter((r) => !['COMPLETED', 'REJECTED'].includes(r.returnStatus));
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied'));

  return (
    <div className="space-y-5">
      <Link to="/account/orders" className="inline-flex items-center gap-1 py-2 text-sm text-ink-soft hover:text-brand">
        <ArrowLeft size={15} /> All orders
      </Link>

      {/* Where it is */}
      <section className={`${card} overflow-hidden`}>
        <div className={`px-5 py-5 ${o.status === 'OUT_FOR_DELIVERY' ? 'bg-brand text-white' : o.status === 'DELIVERED' ? 'bg-ok/10' : 'bg-canvas'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`text-xs ${o.status === 'OUT_FOR_DELIVERY' ? 'text-white/80' : 'text-ink-soft'}`}>
                Order {o.orderNumber} · placed {shortDate(o.createdAt)}
              </p>
              <h1 className="mt-1 font-serif text-3xl leading-tight">{h.title}</h1>
              {h.sub && <p className={`mt-1 text-sm ${o.status === 'OUT_FOR_DELIVERY' ? 'text-white/90' : 'text-ink-soft'}`}>{h.sub}</p>}
            </div>
            {o.status !== 'OUT_FOR_DELIVERY' && <OrderChip order={o} />}
          </div>
        </div>
        {o.status !== 'CANCELLED' && o.status !== 'RETURNED' && (
          <div className="px-5 py-6">
            <TrackStepper steps={o.steps} />
          </div>
        )}
        {o.courierName && o.trackingNumber && o.status !== 'CANCELLED' && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-5 py-3 text-sm">
            <span className="flex items-center gap-2">
              <Truck size={16} className="text-brand" /> {o.courierName}
            </span>
            <span className="flex items-center gap-1 text-ink-soft">
              Tracking no. <b className="font-semibold text-ink">{o.trackingNumber}</b>
              <button onClick={() => copy(o.trackingNumber!)} className="p-2 hover:text-brand" aria-label="Copy tracking number">
                <Copy size={13} />
              </button>
            </span>
          </div>
        )}
        {o.cancelRequested && o.cancelApproved === null && (
          <p className="border-t border-line bg-gold/10 px-5 py-3 text-sm">You asked to cancel this order. The shop will confirm and refund you.</p>
        )}
        {o.cancelApproved === false && o.cancelRejectionReason && (
          <p className="border-t border-line bg-red-50 px-5 py-3 text-sm text-red-800">Cancellation not possible: {o.cancelRejectionReason}</p>
        )}
        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
          {o.can.pay && o.paymentDetails?.razorpayOrderId && (
            <Link to="/payment" search={{ref: o.paymentDetails.razorpayOrderId}} className={btn.primary}>
              <CreditCard size={14} /> Complete payment
            </Link>
          )}
          {o.can.return && (
            <Link to="/account/returns" search={{order: o.id}} className={btn.outline}>
              <RotateCcw size={14} /> Return / exchange
            </Link>
          )}
          {o.can.review && (
            <Link to="/account/reviews" className={btn.outline}>
              <Star size={14} /> Rate & review
            </Link>
          )}
          {o.can.buyAgain && (
            <button onClick={() => buyAgain.mutate(o.id, {onSuccess: (r) => r.added.length && navigate({to: '/bag'})})} className={btn.outline} disabled={buyAgain.isPending}>
              <ShoppingBag size={14} /> Buy again
            </button>
          )}
          {o.can.invoice && (
            <Link to="/invoice/$id" params={{id: o.id}} className={btn.outline}>
              <FileText size={14} /> Invoice
            </Link>
          )}
          {o.can.cancel && (
            <button onClick={() => setCancelling(true)} className={`${btn.outline} border-ink/20 text-ink-soft`}>
              Cancel order
            </button>
          )}
        </div>
      </section>

      {openReturns.map((r) => (
        <section key={r.id} className={`${card} border-gold/40 bg-gold/5 px-5 py-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {r.resolution === 'EXCHANGE' ? `Exchange${r.exchangeFor ? ` for ${r.exchangeFor}` : ''}` : `Return · refund ${inr(r.refundAmount)}`}
            </p>
            <Chip tone="warn">{r.returnStatus === 'REQUESTED' ? 'Waiting for the shop' : r.returnStatus === 'APPROVED' ? 'Approved · pickup soon' : 'Being checked'}</Chip>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {r.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')} · {r.reason}
          </p>
          <Link to="/account/returns" className={`${btn.ghost} mt-2`}>
            See return status
          </Link>
        </section>
      ))}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {/* Items */}
          <section className={card}>
            <h2 className="flex items-center gap-2 border-b border-line px-5 py-3 font-semibold">
              <Package size={16} /> {pluralize(units, 'item')} {o.shop && <span className="font-normal text-ink-soft">· sold by {o.shop.name}</span>}
            </h2>
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex gap-4 px-5 py-4">
                  <Link to="/product/$id" params={{id: i.slug ?? i.productId}} className="h-28 w-20 shrink-0 overflow-hidden rounded bg-canvas">
                    <ProductVisual image={i.image} name={i.name} iconSize={18} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to="/product/$id" params={{id: i.slug ?? i.productId}} className="font-medium hover:text-brand">
                      {i.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {[sizeText(i.size), i.color, `Qty ${i.quantity}`].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{inr(i.totalPrice)}</p>
                    {i.returnedQty > 0 && <p className="mt-1 text-xs text-gold">{i.returnedQty} in a return request</p>}
                    {i.returnableQty > 0 && i.returnUntil && <p className="mt-1 text-xs text-ink-faint">Return or exchange till {shortDate(i.returnUntil)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Shipment timeline */}
          <section className={card}>
            <h2 className="border-b border-line px-5 py-3 font-semibold">Shipment updates</h2>
            <ol className="relative px-5 py-4">
              {[...o.history].reverse().map((h, i) => (
                <li key={h.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < o.history.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden />}
                  <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${i === 0 ? 'bg-brand ring-4 ring-brand/15' : 'bg-ink-faint/50'}`} />
                  <div>
                    <p className={`text-sm ${i === 0 ? 'font-semibold' : ''}`}>{historyText(h.comment, h.status)}</p>
                    <p className="text-xs text-ink-faint">{dateTime(h.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-5">
          <section className={`${card} p-5`}>
            <h2 className="mb-3 font-semibold">Payment</h2>
            <dl className="space-y-1.5 text-sm">
              <Row k={`Items (${units})`} v={inr(o.subtotal)} />
              {o.couponDiscount > 0 && <Row k={`Coupon ${o.couponCode ?? ''}`} v={`− ${inr(o.couponDiscount)}`} accent />}
              <Row k="Delivery" v={o.shippingFee ? inr(o.shippingFee) : 'Free'} />
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{inr(o.totalAmount)}</dd>
              </div>
              <p className="text-[11px] text-ink-faint">Includes GST of {inr(o.taxIncluded)}</p>
            </dl>
            <p className="mt-3 rounded bg-canvas px-3 py-2 text-sm">
              {o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Paid online'}
              {' · '}
              <span className={o.paymentStatus === 'PAID' ? 'text-ok' : o.paymentStatus === 'REFUNDED' ? 'text-ink-soft' : o.paymentStatus === 'FAILED' ? 'text-red-700' : 'text-gold'}>
                {{PAID: 'Paid', PENDING: o.paymentMethod === 'COD' ? 'Pay on delivery' : 'Pending', FAILED: 'Failed', REFUNDED: 'Refunded'}[o.paymentStatus]}
              </span>
            </p>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <MapPin size={16} /> Delivering to
            </h2>
            <AddressLines a={{...o.shippingAddress, isDefault: false}} />
            <p className="mt-2 text-xs text-ink-faint">{o.delivery === 'EXPRESS' ? 'Express delivery' : o.delivery === 'PICKUP' ? 'Store pickup' : 'Standard delivery'}</p>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              <HelpCircle size={16} /> Need help with this order?
            </h2>
            <p className="text-sm text-ink-soft">Questions about delivery, size or payment: we reply within a working day.</p>
            <Link to="/help" search={{order: o.orderNumber}} className={`${btn.outline} mt-3 w-full`}>
              Contact us
            </Link>
          </section>
        </aside>
      </div>
      <CancelDialog order={cancelling ? o : null} onClose={() => setCancelling(false)} />
    </div>
  );
}

function Row({k, v, accent}: {k: string; v: string; accent?: boolean}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-soft">{k}</dt>
      <dd className={accent ? 'text-ok' : ''}>{v}</dd>
    </div>
  );
}
