import {useState} from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {FileText, MapPin, Package, RefreshCw, RotateCcw, Search, ShoppingBag, Star, Truck, X} from 'lucide-react';
import {useDebounceValue} from 'usehooks-ts';
import {useBuyAgain, useCancelOrder, useOrderList} from '@/lib/queries';
import {inr, pluralize, shortDate, sizeText} from '@/lib/format';
import type {Order, OrderTab} from '@/lib/types';
import {btn, Empty, ErrorBox, input, label, ProductVisual, Spinner} from '@/components/ui';
import {card, Dialog, OrderChip, PageHead, Tabs} from '@/components/account';

const TABS: OrderTab[] = ['all', 'active', 'delivered', 'cancelled', 'returns'];
const TAB_LABEL: Record<OrderTab, string> = {all: 'All orders', active: 'In progress', delivered: 'Delivered', cancelled: 'Cancelled', returns: 'Returns'};

export const Route = createFileRoute('/account/orders')({
  validateSearch: (s: Record<string, unknown>): {tab?: OrderTab} => ({
    tab: TABS.includes(s.tab as OrderTab) && s.tab !== 'all' ? (s.tab as OrderTab) : undefined,
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const {tab = 'all'} = Route.useSearch();
  const navigate = useNavigate({from: '/account/orders'});
  const [q, setQ] = useState('');
  const [debounced] = useDebounceValue(q.trim(), 300);
  const {data, isLoading, error, refetch, isFetching} = useOrderList(tab, debounced);
  const [cancelling, setCancelling] = useState<Order | null>(null);

  return (
    <div>
      <PageHead
        title="My orders"
        sub={data ? `${pluralize(data.counts.all, 'order')} · track, return or buy again` : undefined}
        action={
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item or order no." className={`${input} pl-9`} aria-label="Search orders" />
          </div>
        }
      />
      <Tabs
        label="Order status"
        tabs={TABS.map((t) => ({key: t, label: TAB_LABEL[t], count: data?.counts[t]}))}
        value={tab}
        onChange={(t) => navigate({search: {tab: t === 'all' ? undefined : t}})}
      />
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message="Could not load your orders." retry={refetch} />
      ) : !data?.items.length ? (
        <Empty
          icon={<Package size={28} />}
          title={debounced ? 'No orders match your search' : tab === 'all' ? 'No orders yet' : `Nothing in "${TAB_LABEL[tab]}"`}
          text={debounced ? 'Try the product name or the order number.' : 'When you place an order, you can track it here.'}
          action={!debounced && tab === 'all' && <Link to="/products" className={btn.primary}>Start shopping</Link>}
        />
      ) : (
        <ul className={`space-y-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {data.items.map((o) => (
            <OrderCard key={o.id} order={o} onCancel={() => setCancelling(o)} />
          ))}
        </ul>
      )}
      <CancelDialog order={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}

function OrderCard({order: o, onCancel}: {order: Order; onCancel: () => void}) {
  const buyAgain = useBuyAgain();
  const navigate = useNavigate();
  const units = o.items.reduce((n, i) => n + i.quantity, 0);
  const firstReturnable = o.items.find((i) => i.returnableQty > 0);
  const returnBy = firstReturnable?.returnUntil;
  return (
    <li className={card}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <div>
            <dt className="text-ink-faint">Order</dt>
            <dd className="font-semibold">{o.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Placed on</dt>
            <dd className="font-medium">{shortDate(o.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Total</dt>
            <dd className="font-medium">{inr(o.totalAmount)}</dd>
          </div>
          {o.shop && (
            <div className="hidden sm:block">
              <dt className="text-ink-faint">Sold by</dt>
              <dd className="font-medium">{o.shop.name}</dd>
            </div>
          )}
        </dl>
        <OrderChip order={o} />
      </div>

      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
        <Link to="/account/order/$id" params={{id: o.id}} className="flex min-w-0 flex-1 gap-3">
          <div className="flex shrink-0 -space-x-6">
            {o.items.slice(0, 3).map((i) => (
              <span key={i.id} className="h-24 w-[72px] overflow-hidden rounded border-2 border-white bg-canvas shadow-sm">
                <ProductVisual image={i.image} name={i.name} iconSize={16} />
              </span>
            ))}
          </div>
          <div className="min-w-0 pl-2">
            <p className="line-clamp-2 font-medium hover:text-brand">{o.items.map((i) => i.name).join(', ')}</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {pluralize(units, 'item')}
              {o.items.length === 1 && o.items[0].size ? ` · ${sizeText(o.items[0].size)}` : ''}
              {o.items.length === 1 && o.items[0].color ? ` · ${o.items[0].color}` : ''}
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              {o.expectedBy && o.status !== 'OUT_FOR_DELIVERY' && (
                <>
                  <Truck size={12} className="mr-1 inline" />
                  Arrives by {shortDate(o.expectedBy)}
                </>
              )}
              {o.status === 'OUT_FOR_DELIVERY' && <span className="font-semibold text-brand">Arriving today · {o.courierName}</span>}
              {returnBy && <span>Return or exchange till {shortDate(returnBy)}</span>}
              {o.status === 'DELIVERED' && !returnBy && !o.returns.length && <span>Return window closed</span>}
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap gap-2 md:w-48 md:flex-col">
          {o.can.pay && o.paymentDetails?.razorpayOrderId && (
            <Link to="/payment" search={{ref: o.paymentDetails.razorpayOrderId}} className={`${btn.primary} flex-1 md:flex-none`}>
              Complete payment
            </Link>
          )}
          {o.can.track && o.status !== 'DELIVERED' && o.status !== 'RETURNED' && (
            <Link to="/account/order/$id" params={{id: o.id}} className={`${o.can.pay ? btn.outline : btn.primary} flex-1 md:flex-none`}>
              <MapPin size={14} /> Track order
            </Link>
          )}
          {o.can.return && (
            <Link to="/account/returns" search={{order: o.id}} className={`${btn.outline} flex-1 md:flex-none`}>
              <RotateCcw size={14} /> Return / exchange
            </Link>
          )}
          {o.can.review && (
            <Link to="/account/reviews" className={`${btn.outline} flex-1 md:flex-none`}>
              <Star size={14} /> Write a review
            </Link>
          )}
          {o.can.buyAgain && (
            <button
              onClick={() => buyAgain.mutate(o.id, {onSuccess: (r) => r.added.length && navigate({to: '/bag'})})}
              disabled={buyAgain.isPending}
              className={`${btn.outline} flex-1 md:flex-none`}
            >
              {buyAgain.isPending ? <RefreshCw size={14} className="animate-spin" /> : <ShoppingBag size={14} />} Buy again
            </button>
          )}
          {o.can.cancel && (
            <button onClick={onCancel} className={`${btn.outline} flex-1 border-ink/20 text-ink-soft md:flex-none`}>
              <X size={14} /> Cancel order
            </button>
          )}
          {o.can.invoice && (
            <Link to="/invoice/$id" params={{id: o.id}} className={`${btn.ghost} justify-center py-2`}>
              <FileText size={14} /> Invoice
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

const CANCEL_REASONS = ['Ordered by mistake', 'Ordered the wrong size or colour', 'Found it cheaper elsewhere', 'Delivery is too late', 'Something else'];

export function CancelDialog({order, onClose}: {order: Order | null; onClose: () => void}) {
  const cancel = useCancelOrder();
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const paid = order?.paymentStatus === 'PAID';
  return (
    <Dialog open={!!order} onClose={onClose} title="Cancel this order?">
      {order && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            cancel.mutate({id: order.id, reason}, {onSuccess: onClose});
          }}
        >
          <p className="text-sm text-ink-soft">
            {order.orderNumber} · {pluralize(order.items.length, 'item')} · {inr(order.totalAmount)}
          </p>
          <p className="mt-3 rounded bg-canvas p-3 text-sm">
            {paid
              ? 'You paid online, so the shop will confirm the cancellation and refund you to the same account in 5–7 working days.'
              : 'The order will be cancelled right away. Nothing has been charged.'}
          </p>
          <fieldset className="mt-4">
            <legend className={label}>Why are you cancelling?</legend>
            <div className="space-y-1.5">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-brand" /> {r}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className={btn.outline}>
              Keep order
            </button>
            <button className={`${btn.primary} bg-red-700 hover:bg-red-800`} disabled={cancel.isPending}>
              {cancel.isPending ? 'Cancelling…' : paid ? 'Request cancellation' : 'Cancel order'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
