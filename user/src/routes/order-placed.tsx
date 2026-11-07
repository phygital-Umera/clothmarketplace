import {createFileRoute, Link} from '@tanstack/react-router';
import {Bell, Check, MapPin, Package, Truck, Wallet} from 'lucide-react';
import {useAuth} from '@/lib/auth';
import {useOrderList} from '@/lib/queries';
import {inr, pluralize, sizeText} from '@/lib/format';
import {RequireAuth} from '@/components/checkout';
import {btn, ProductVisual, Spinner} from '@/components/ui';
import {card} from '@/components/account';

export const Route = createFileRoute('/order-placed')({
  validateSearch: (s: Record<string, unknown>): {orders?: string; method?: string} => ({
    orders: typeof s.orders === 'string' ? s.orders : undefined,
    method: typeof s.method === 'string' ? s.method : undefined,
  }),
  component: () => (
    <RequireAuth>
      <ThankYou />
    </RequireAuth>
  ),
});

const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', {weekday: 'short', day: 'numeric', month: 'long'});

function ThankYou() {
  const {orders: numbersParam, method} = Route.useSearch();
  const {me} = useAuth();
  const {data, isLoading} = useOrderList('all');
  const numbers = (numbersParam ?? '').split(',').filter(Boolean);
  const orders = (data?.items ?? []).filter((o) => numbers.includes(o.orderNumber));

  if (isLoading) return <Spinner />;

  const total = orders.reduce((n, o) => n + o.totalAmount, 0);
  const saved = orders.reduce((n, o) => n + o.couponDiscount, 0);
  const units = orders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  const expected = orders.map((o) => o.expectedBy).filter(Boolean).sort().at(-1);
  const address = orders[0]?.shippingAddress;
  const paidOnline = method === 'ONLINE' || orders.some((o) => o.paymentStatus === 'PAID');

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className={`${card} overflow-hidden text-center`}>
        <div className="bg-gradient-to-b from-ok/10 to-white px-6 pb-6 pt-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok text-white shadow-lg shadow-ok/30">
            <Check size={34} strokeWidth={3} />
          </span>
          <h1 className="mt-4 font-serif text-4xl">Thank you{me ? `, ${me.fullname.split(' ')[0]}` : ''}!</h1>
          <p className="mt-2 text-ink-soft">Your order is placed. We have sent the details to your notifications.</p>
          {numbers.length > 0 && (
            <p className="mt-4 text-sm">
              {numbers.length > 1 ? 'Order numbers' : 'Order number'}:{' '}
              {numbers.map((n, i) => (
                <span key={n}>
                  {i > 0 && ', '}
                  <b className="tracking-wide">{n}</b>
                </span>
              ))}
            </p>
          )}
          {numbers.length > 1 && <p className="mt-1 text-xs text-ink-soft">Your items come from {numbers.length} shops, so each ships as its own order.</p>}
        </div>
        <div className="grid divide-y divide-line border-t border-line text-left sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Fact icon={Truck} k="Expected delivery" v={expected ? longDate(expected) : 'We will confirm soon'} />
          <Fact icon={Wallet} k="Payment" v={paidOnline ? `Paid ${inr(total)}` : `Pay ${inr(total)} on delivery`} />
          <Fact icon={Package} k="Items" v={`${pluralize(units, 'item')}${saved > 0 ? ` · saved ${inr(saved)}` : ''}`} />
        </div>
      </section>

      {orders.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
          <section className={card}>
            <h2 className="border-b border-line px-5 py-3 font-semibold">What you ordered</h2>
            <ul className="divide-y divide-line">
              {orders.flatMap((o) =>
                o.items.map((i) => (
                  <li key={i.id} className="flex gap-4 px-5 py-3">
                    <span className="h-20 w-16 shrink-0 overflow-hidden rounded bg-canvas">
                      <ProductVisual image={i.image} name={i.name} iconSize={14} />
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{i.name}</p>
                      <p className="text-xs text-ink-soft">{[sizeText(i.size), i.color, `Qty ${i.quantity}`].filter(Boolean).join(' · ')}</p>
                      {o.shop && <p className="text-xs text-ink-faint">from {o.shop.name}</p>}
                    </div>
                    <p className="text-sm font-semibold">{inr(i.totalPrice)}</p>
                  </li>
                )),
              )}
            </ul>
          </section>
          <aside className="space-y-5">
            {address && (
              <section className={`${card} p-5 text-sm`}>
                <h2 className="mb-2 flex items-center gap-2 font-semibold">
                  <MapPin size={16} /> Delivering to
                </h2>
                <p className="font-medium">{address.recipient}</p>
                <p className="text-ink-soft">
                  {address.address1}
                  {address.address2 ? `, ${address.address2}` : ''}, {address.city} {address.postalCode}
                </p>
              </section>
            )}
            <section className={`${card} p-5 text-sm`}>
              <h2 className="mb-3 font-semibold">What happens next</h2>
              <ol className="space-y-3">
                {[
                  ['The shop confirms', 'Usually within a few hours'],
                  ['Packed and shipped', 'You get the courier and tracking number'],
                  ['Delivered to you', paidOnline ? 'Nothing to pay at the door' : 'Keep cash or UPI ready'],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{i + 1}</span>
                    <span>
                      <span className="block font-medium">{t}</span>
                      <span className="block text-xs text-ink-soft">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 flex items-center gap-2 rounded bg-canvas p-2 text-xs text-ink-soft">
                <Bell size={13} /> We will notify you at every step.
              </p>
            </section>
          </aside>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {orders.length === 1 ? (
          <Link to="/account/order/$id" params={{id: orders[0].id}} className={btn.primary}>
            Track my order
          </Link>
        ) : (
          <Link to="/account/orders" search={{tab: 'active'}} className={btn.primary}>
            Track my orders
          </Link>
        )}
        <Link to="/products" className={btn.outline}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function Fact({icon: Icon, k, v}: {icon: typeof Truck; k: string; v: string}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Icon size={20} className="shrink-0 text-brand" />
      <div>
        <p className="text-xs text-ink-faint">{k}</p>
        <p className="text-sm font-semibold">{v}</p>
      </div>
    </div>
  );
}
