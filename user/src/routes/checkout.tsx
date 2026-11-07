import {useEffect, useState} from 'react';
import {createFileRoute, Link, Navigate, useNavigate} from '@tanstack/react-router';
import {Plus} from 'lucide-react';
import {useAuth} from '@/lib/auth';
import {useAddresses, useCart} from '@/lib/queries';
import {inr} from '@/lib/format';
import type {DeliveryOption} from '@/lib/types';
import AddressForm, {AddressLines} from '@/components/AddressForm';
import {PriceSummary, RequireAuth, Steps, useCheckoutChoice} from '@/components/checkout';
import {btn, ProductVisual, Spinner} from '@/components/ui';

export const Route = createFileRoute('/checkout')({
  component: () => (
    <RequireAuth>
      <CheckoutPage />
    </RequireAuth>
  ),
});

const OPTIONS: {key: DeliveryOption; title: string; note: (free: boolean) => string}[] = [
  {key: 'STANDARD', title: 'Standard', note: (free) => (free ? 'Free · 3–5 days' : '₹49 · free above ₹999 · 3–5 days')},
  {key: 'EXPRESS', title: 'Express', note: () => '₹99 · next day in most cities'},
  {key: 'PICKUP', title: 'Store pickup', note: () => 'Free · collect from the shop when ready'},
];

function Section({n, title, children}: {n: number; title: string; children: React.ReactNode}) {
  return (
    <section className="rounded-md border border-line bg-white p-5">
      <h2 className="mb-4 font-serif text-xl">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

function CheckoutPage() {
  const {me} = useAuth();
  const navigate = useNavigate();
  const {choice, update} = useCheckoutChoice();
  const {data: cart, isLoading} = useCart({coupon: choice.coupon, delivery: choice.delivery});
  const {data: addresses, isLoading: loadingAddr} = useAddresses();
  const [adding, setAdding] = useState(false);

  // Pick the default address when none is chosen (or the chosen one was deleted)
  useEffect(() => {
    if (addresses?.length && !addresses.some((a) => a.id === choice.addressId)) {
      update({addressId: (addresses.find((a) => a.isDefault) ?? addresses[0]).id});
    }
  }, [addresses, choice.addressId, update]);

  if (isLoading || loadingAddr || !cart) return <Spinner />;
  if (!cart.items.length) return <Navigate to="/bag" />;

  const noAddresses = !addresses?.length;
  const canContinue = !!choice.addressId && !cart.hasProblems;

  return (
    <div>
      <Steps current="address" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Section n={1} title="Contact">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <p>
                <span className="block text-[11px] uppercase tracking-wider text-ink-faint">Name</span>
                {me?.fullname}
              </p>
              <p>
                <span className="block text-[11px] uppercase tracking-wider text-ink-faint">Mobile</span>+91 {me?.phoneNumber}
              </p>
              <p className="truncate">
                <span className="block text-[11px] uppercase tracking-wider text-ink-faint">Email</span>
                {me?.email ?? '—'}
              </p>
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Order updates go to these details. Change them in{' '}
              <Link to="/account/profile" className="text-brand hover:underline">
                My profile
              </Link>
              .
            </p>
          </Section>

          <Section n={2} title="Delivery address">
            {!noAddresses && (
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery address">
                {addresses!.map((a) => (
                  <label
                    key={a.id}
                    className={`cursor-pointer rounded-md border p-4 ${choice.addressId === a.id ? 'border-brand bg-brand-soft/40 ring-1 ring-brand' : 'border-line'}`}
                  >
                    <input type="radio" name="address" className="sr-only" checked={choice.addressId === a.id} onChange={() => update({addressId: a.id})} />
                    <AddressLines a={a} />
                  </label>
                ))}
              </div>
            )}
            {adding || noAddresses ? (
              <div className={noAddresses ? '' : 'mt-5 border-t border-line pt-5'}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider">New address</p>
                <AddressForm
                  defaults={{recipient: me?.fullname ?? '', phone: me?.phoneNumber ?? ''}}
                  onSaved={(a) => {
                    update({addressId: a.id});
                    setAdding(false);
                  }}
                  onCancel={noAddresses ? undefined : () => setAdding(false)}
                />
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className={`${btn.ghost} mt-4`}>
                <Plus size={14} /> Add new address
              </button>
            )}
          </Section>

          <Section n={3} title="Delivery option">
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Delivery option">
              {OPTIONS.map((o) => (
                <label
                  key={o.key}
                  className={`cursor-pointer rounded-md border p-4 ${choice.delivery === o.key ? 'border-brand bg-brand-soft/40 ring-1 ring-brand' : 'border-line'}`}
                >
                  <input type="radio" name="delivery" className="sr-only" checked={choice.delivery === o.key} onChange={() => update({delivery: o.key})} />
                  <p className="text-sm font-semibold">{o.title}</p>
                  <p className="text-xs text-ink-soft">{o.note(cart.summary.itemsTotal >= cart.summary.freeDeliveryAbove)}</p>
                </label>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
          <div className="rounded-md border border-line bg-white p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider">Order summary</p>
            <ul className="space-y-3">
              {cart.items.map((l) => (
                <li key={l.id} className="flex gap-3 text-sm">
                  <span className="h-14 w-11 shrink-0 overflow-hidden rounded">
                    <ProductVisual image={l.image} hex={l.colorHex} name={l.name} iconSize={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{l.name}</span>
                    <span className="text-xs text-ink-faint">
                      {l.size === 'Free' ? 'Free size' : l.size} · Qty {l.quantity}
                    </span>
                  </span>
                  <span>{inr(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </div>
          <PriceSummary cart={cart}>
            <button onClick={() => navigate({to: '/payment'})} disabled={!canContinue} className={`${btn.primary} w-full`}>
              Continue to payment
            </button>
            {!choice.addressId && <p className="mt-2 text-xs text-ink-soft">Add a delivery address to continue.</p>}
          </PriceSummary>
        </aside>
      </div>
    </div>
  );
}
