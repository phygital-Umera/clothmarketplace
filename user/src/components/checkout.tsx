import {ReactNode, useCallback, useEffect, useState} from 'react';
import {Link, Navigate, useRouterState} from '@tanstack/react-router';
import {Check} from 'lucide-react';
import {useAuth} from '@/lib/auth';
import {inr} from '@/lib/format';
import type {Cart, DeliveryOption} from '@/lib/types';
import {Spinner} from './ui';

/** Pages for signed-in customers: send others to sign in, then back here */
export function RequireAuth({children}: {children: ReactNode}) {
  const {signedIn, loading} = useAuth();
  const href = useRouterState({select: (s) => s.location.href});
  if (loading) return <Spinner />;
  if (!signedIn) return <Navigate to="/signin" search={{redirect: href}} replace />;
  return <>{children}</>;
}

/* What the customer chose across Bag -> Address -> Payment (kept for this tab) */
type CheckoutChoice = {coupon?: string; delivery: DeliveryOption; addressId?: string};
const KEY = 'clothpro.checkout';
const read = (): CheckoutChoice => {
  try {
    return {delivery: 'STANDARD', ...JSON.parse(sessionStorage.getItem(KEY) || '{}')};
  } catch {
    return {delivery: 'STANDARD'};
  }
};
const listeners = new Set<() => void>();

export function useCheckoutChoice() {
  const [choice, setChoice] = useState(read);
  useEffect(() => {
    const fn = () => setChoice(read());
    listeners.add(fn);
    return () => void listeners.delete(fn);
  }, []);
  const update = useCallback((patch: Partial<CheckoutChoice>) => {
    const next = {...read(), ...patch};
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage blocked: keep it in memory */
    }
    setChoice(next);
    listeners.forEach((l) => l());
  }, []);
  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing stored */
    }
    setChoice({delivery: 'STANDARD'});
  }, []);
  return {choice, update, reset};
}

const STEPS = [
  {key: 'bag', label: 'Bag', to: '/bag'},
  {key: 'address', label: 'Address & delivery', to: '/checkout'},
  {key: 'payment', label: 'Payment', to: '/payment'},
] as const;

export function Steps({current}: {current: (typeof STEPS)[number]['key']}) {
  const at = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="mb-6 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider sm:gap-4">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2 sm:gap-4">
          {i < at ? (
            <Link to={s.to} className="tap flex items-center gap-1 text-ok">
              <Check size={13} /> {s.label}
            </Link>
          ) : (
            <span className={i === at ? 'text-brand' : 'text-ink-faint'} aria-current={i === at ? 'step' : undefined}>
              {s.label}
            </span>
          )}
          {i < STEPS.length - 1 && <span className="h-px w-6 bg-line sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

export function PriceSummary({cart, children}: {cart: Cart; children?: ReactNode}) {
  const s = cart.summary;
  const rows: [string, string, string?][] = [
    ['Total MRP', inr(s.totalMrp)],
    ['Discount on MRP', `−${inr(s.discountOnMrp)}`, 'text-ok'],
    ...(s.coupon ? ([[`Coupon ${s.coupon.code}`, `−${inr(s.coupon.discount)}`, 'text-ok']] as [string, string, string][]) : []),
    ['Delivery', s.deliveryFee ? inr(s.deliveryFee) : 'Free', s.deliveryFee ? undefined : 'text-ok'],
  ];
  return (
    <div className="rounded-md border border-line bg-white p-5">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider">
        Price details ({cart.count} item{cart.count === 1 ? '' : 's'})
      </p>
      <dl className="space-y-2 text-sm">
        {rows.map(([k, v, cls]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-ink-soft">{k}</dt>
            <dd className={cls}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex justify-between border-t border-line pt-3 font-serif text-xl">
        <span>Total</span>
        <span>{inr(s.total)}</span>
      </div>
      {s.savings > 0 && <p className="mt-1 text-xs text-ok">You save {inr(s.savings)} on this order</p>}
      {s.delivery === 'STANDARD' && s.deliveryFee > 0 && (
        <p className="mt-1 text-xs text-ink-soft">Add {inr(s.freeDeliveryAbove - s.itemsTotal)} more for free delivery</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
