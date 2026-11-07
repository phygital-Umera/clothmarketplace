import {createFileRoute, Link} from '@tanstack/react-router';
import {ArrowRight, Bell, Heart, Package, Star} from 'lucide-react';
import {useNotifications, useOrderList, useProfile} from '@/lib/queries';
import {dateTime, inr} from '@/lib/format';
import {btn, ProductVisual, Spinner} from '@/components/ui';
import {card, OrderChip, TrackStepper} from '@/components/account';

export const Route = createFileRoute('/account/')({component: Overview});

function Overview() {
  const {data: me, isLoading} = useProfile();
  const {data: active} = useOrderList('active');
  const {data: notes} = useNotifications('all');
  if (isLoading || !me) return <Spinner />;

  const current = active?.items[0];
  const tiles = [
    {to: '/account/orders', label: 'Orders', value: me.stats.orders, icon: Package},
    {to: '/account/wishlist', label: 'Wishlist', value: me.stats.wishlist, icon: Heart},
    {to: '/account/reviews', label: 'Reviews', value: me.stats.reviews, icon: Star},
    {to: '/account/notifications', label: 'Unread', value: me.stats.unread, icon: Bell},
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl">Hello, {me.fullname.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-ink-soft">Member since {new Date(me.createdAt).toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className={`${card} flex items-center gap-3 p-4 transition hover:border-brand`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
              <t.icon size={18} />
            </span>
            <span>
              <span className="block text-xl font-semibold leading-none">{t.value}</span>
              <span className="text-xs text-ink-soft">{t.label}</span>
            </span>
          </Link>
        ))}
      </div>

      {current && (
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
            <h2 className="font-semibold">
              On its way{active!.items.length > 1 && <span className="font-normal text-ink-soft"> · 1 of {active!.items.length} orders in progress</span>}
            </h2>
            <OrderChip order={current} />
          </div>
          <div className="flex flex-col gap-5 p-5 sm:flex-row">
            <div className="flex gap-3 sm:w-64">
              <span className="h-24 w-[72px] shrink-0 overflow-hidden rounded bg-canvas">
                <ProductVisual image={current.items[0].image} name={current.items[0].name} iconSize={16} />
              </span>
              <div className="min-w-0 text-sm">
                <p className="line-clamp-2 font-medium">{current.items.map((i) => i.name).join(', ')}</p>
                <p className="text-xs text-ink-soft">
                  {current.orderNumber} · {inr(current.totalAmount)}
                </p>
              </div>
            </div>
            <div className="flex-1">
              <TrackStepper steps={current.steps} />
            </div>
          </div>
          <div className="border-t border-line px-5 py-3">
            <Link to="/account/order/$id" params={{id: current.id}} className={btn.ghost}>
              Track this order <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      <section className={card}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-semibold">Latest updates</h2>
          <Link to="/account/notifications" className={btn.ghost}>
            See all
          </Link>
        </div>
        {!notes?.items.length ? (
          <p className="px-5 py-6 text-sm text-ink-soft">Nothing new yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {notes.items.slice(0, 4).map((n) => (
              <li key={n.id} className="flex gap-3 px-5 py-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-brand'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="truncate text-xs text-ink-soft">{n.body}</p>
                </div>
                <span className="ml-auto shrink-0 text-[11px] text-ink-faint">{dateTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
