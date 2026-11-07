import {useState} from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {useQuery} from '@tanstack/react-query';
import {ShoppingBag, Tag} from 'lucide-react';
import {api} from '@/lib/api';
import {useCart, useRemoveCartLine, useUpdateCartLine} from '@/lib/queries';
import {inr} from '@/lib/format';
import type {Coupon} from '@/lib/types';
import {PriceSummary, RequireAuth, Steps, useCheckoutChoice} from '@/components/checkout';
import {btn, Empty, Price, ProductVisual, Spinner} from '@/components/ui';

export const Route = createFileRoute('/bag')({
  component: () => (
    <RequireAuth>
      <BagPage />
    </RequireAuth>
  ),
});

function BagPage() {
  const navigate = useNavigate();
  const {choice, update} = useCheckoutChoice();
  const {data: cart, isLoading, isFetching} = useCart({coupon: choice.coupon});
  const {data: coupons} = useQuery({queryKey: ['coupons'], queryFn: () => api.get<Coupon[]>('/store/coupons')});
  const updateLine = useUpdateCartLine();
  const remove = useRemoveCartLine();
  const [code, setCode] = useState(choice.coupon ?? '');
  const [showCoupons, setShowCoupons] = useState(false);

  if (isLoading || !cart) return <Spinner />;
  if (!cart.items.length) {
    return (
      <>
        <Steps current="bag" />
        <Empty
          icon={<ShoppingBag size={30} />}
          title="Your bag is empty"
          text="Add a few things you love and they'll wait for you here."
          action={
            <div className="flex justify-center gap-2">
              <Link to="/products" className={btn.primary}>
                Start shopping
              </Link>
              <Link to="/account/wishlist" className={btn.outline}>
                From wishlist
              </Link>
            </div>
          }
        />
      </>
    );
  }

  const s = cart.summary;
  const applied = s.coupon?.code;
  return (
    <div>
      <Steps current="bag" />
      <h1 className="mb-1 font-serif text-3xl">
        Shopping bag <span className="text-base text-ink-soft">· {cart.count} item{cart.count === 1 ? '' : 's'}</span>
      </h1>
      {s.deliveryFee === 0 ? (
        <p className="mb-4 rounded bg-ok/5 px-3 py-2 text-sm text-ok">Free delivery unlocked on this order.</p>
      ) : (
        <p className="mb-4 rounded bg-white px-3 py-2 text-sm text-ink-soft">
          Add {inr(s.freeDeliveryAbove - s.itemsTotal)} more for free delivery.
        </p>
      )}

      <div className={`grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] ${isFetching ? 'opacity-80' : ''}`}>
        <div className="space-y-3">
          {cart.items.map((l) => (
            <article key={l.id} className={`flex gap-4 rounded-md border bg-white p-3 ${l.problem ? 'border-red-200' : 'border-line'}`}>
              <Link to="/product/$id" params={{id: l.productId}} className="h-32 w-24 shrink-0 overflow-hidden rounded">
                <ProductVisual image={l.image} hex={l.colorHex} name={l.name} iconSize={24} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{l.brand}</p>
                    <Link to="/product/$id" params={{id: l.productId}} className="block truncate py-1 text-sm hover:text-brand">
                      {l.name} – {l.color}
                    </Link>
                    {l.shop && <p className="text-[11px] text-ink-faint">Sold by {l.shop.name} · ships from {l.shop.city}</p>}
                  </div>
                  <div className="text-right">
                    <Price price={l.lineTotal} mrp={l.lineMrp} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-1 text-xs text-ink-soft">
                    Size
                    <select
                      value={l.variantId}
                      onChange={(e) => updateLine.mutate({id: l.id, variantId: e.target.value})}
                      className="rounded border border-line bg-white px-2 py-1 text-sm text-ink"
                    >
                      {l.sizeOptions.map((o) => (
                        <option key={o.variantId} value={o.variantId} disabled={o.stock === 0}>
                          {o.size}
                          {o.stock === 0 ? ' (sold out)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1 text-xs text-ink-soft">
                    Qty
                    <select
                      value={l.quantity}
                      onChange={(e) => updateLine.mutate({id: l.id, quantity: Number(e.target.value)})}
                      className="rounded border border-line bg-white px-2 py-1 text-sm text-ink"
                    >
                      {Array.from({length: Math.max(1, Math.min(10, Math.max(l.stock, l.quantity)))}, (_, i) => i + 1).map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  {!l.problem && l.stock <= 3 && <span className="rounded bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">Only {l.stock} left</span>}
                </div>
                {l.problem && <p className="text-xs font-semibold text-red-700">{l.problem} — change the size or remove it to continue</p>}
                <div className="mt-auto flex gap-4">
                  <button onClick={() => remove.mutate({id: l.id, toWishlist: true})} className={btn.ghost}>
                    Move to wishlist
                  </button>
                  <button onClick={() => remove.mutate({id: l.id})} className="tap text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-red-700">
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
          <div className="rounded-md border border-line bg-white p-5">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <Tag size={13} /> Coupon
            </p>
            {applied ? (
              <div className="flex items-center justify-between rounded border border-ok/30 bg-ok/5 px-3 py-2 text-sm">
                <span>
                  <strong>{applied}</strong> applied · you save {inr(s.coupon!.discount)}
                </span>
                <button
                  onClick={() => {
                    update({coupon: undefined});
                    setCode('');
                  }}
                  className="text-xs font-semibold uppercase text-brand"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  update({coupon: code.trim().toUpperCase() || undefined});
                }}
                className="flex"
              >
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  aria-label="Coupon code"
                  className="min-w-0 flex-1 rounded-l border border-r-0 border-line px-3 py-2 text-sm uppercase focus:border-brand focus:outline-none"
                />
                <button className="rounded-r border border-brand px-4 text-xs font-semibold uppercase text-brand" disabled={!code.trim()}>
                  Apply
                </button>
              </form>
            )}
            {s.couponError && choice.coupon && <p className="mt-2 text-xs text-red-700">{s.couponError}</p>}
            {!!coupons?.length && (
              <button onClick={() => setShowCoupons((v) => !v)} className="mt-1 py-2 text-xs font-semibold text-brand hover:underline">
                {showCoupons ? 'Hide' : 'View'} available coupons
              </button>
            )}
            {showCoupons && (
              <ul className="mt-2 space-y-2">
                {coupons!.map((c) => (
                  <li key={c.code} className="flex items-center justify-between gap-2 rounded border border-dashed border-line p-2 text-xs">
                    <span>
                      <strong className="tracking-wider">{c.code}</strong>
                      <span className="block text-ink-soft">{c.description ?? c.name}</span>
                    </span>
                    <button
                      onClick={() => {
                        setCode(c.code);
                        update({coupon: c.code});
                      }}
                      className="font-semibold uppercase text-brand"
                    >
                      Apply
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <PriceSummary cart={cart}>
            <button onClick={() => navigate({to: '/checkout'})} disabled={cart.hasProblems} className={`${btn.primary} w-full`}>
              Proceed to checkout
            </button>
            {cart.hasProblems && <p className="mt-2 text-xs text-red-700">Fix the items marked in red first.</p>}
          </PriceSummary>
        </aside>
      </div>
    </div>
  );
}
