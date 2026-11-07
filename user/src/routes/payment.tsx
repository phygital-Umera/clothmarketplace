import {useState} from 'react';
import {createFileRoute, Link, Navigate, useNavigate} from '@tanstack/react-router';
import {useQueryClient} from '@tanstack/react-query';
import {AlertTriangle, Banknote, CreditCard, ShieldCheck} from 'lucide-react';
import {errorMessage} from '@/lib/api';
import {paymentApi, useAddresses, useCart, useCheckout, usePaymentConfig, usePaymentStatus} from '@/lib/queries';
import {inr} from '@/lib/format';
import type {RazorpayInfo} from '@/lib/types';
import {AddressLines} from '@/components/AddressForm';
import {PriceSummary, RequireAuth, Steps, useCheckoutChoice} from '@/components/checkout';
import {btn, Spinner} from '@/components/ui';

export const Route = createFileRoute('/payment')({
  // ref = Razorpay order of orders already placed (after a failed / closed payment)
  validateSearch: (s: Record<string, unknown>): {ref?: string} => ({ref: typeof s.ref === 'string' ? s.ref : undefined}),
  component: () => (
    <RequireAuth>
      <PaymentPage />
    </RequireAuth>
  ),
});

type RazorpayResponse = {razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string};
type RazorpayInstance = {open: () => void; on: (event: string, fn: (r: {error?: {description?: string}}) => void) => void};
declare global {
  interface Window {
    Razorpay?: new (options: object) => RazorpayInstance;
  }
}

const loadRazorpay = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Check your internet and try again.'));
    document.body.appendChild(s);
  });

/** Opens Razorpay; resolves when paid and verified, rejects with the reason otherwise */
const payWithRazorpay = async (info: RazorpayInfo) => {
  await loadRazorpay();
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const rzp = new window.Razorpay!({
      key: info.keyId,
      order_id: info.razorpayOrderId,
      amount: info.amount,
      currency: info.currency,
      name: 'Cloth Pro',
      description: 'Your order',
      prefill: info.prefill,
      theme: {color: '#7A2232'},
      handler: async (r: RazorpayResponse) => {
        settled = true;
        try {
          await paymentApi.verify({razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id, razorpaySignature: r.razorpay_signature});
          resolve();
        } catch (e) {
          reject(new Error(errorMessage(e)));
        }
      },
      modal: {
        ondismiss: () => {
          if (!settled) reject(new Error('You closed the payment window before paying.'));
        },
      },
    });
    rzp.on('payment.failed', (r) => {
      settled = true;
      reject(new Error(r.error?.description ?? 'Your bank declined the payment.'));
    });
    rzp.open();
  });
};

function PaymentPage() {
  const {ref} = Route.useSearch();
  return ref ? <RetryPayment razorpayOrderId={ref} /> : <ChoosePayment />;
}

function MethodCard({active, onClick, icon, title, note, disabled}: {active: boolean; onClick: () => void; icon: React.ReactNode; title: string; note: string; disabled?: boolean}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-md border p-4 text-left ${active ? 'border-brand bg-brand-soft/40 ring-1 ring-brand' : 'border-line bg-white'} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span className="mt-0.5 text-brand">{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-xs text-ink-soft">{note}</span>
      </span>
    </button>
  );
}

function ChoosePayment() {
  const navigate = useNavigate();
  const {choice, reset} = useCheckoutChoice();
  const {data: cart, isLoading} = useCart({coupon: choice.coupon, delivery: choice.delivery});
  const {data: addresses} = useAddresses();
  const {data: config} = usePaymentConfig();
  const checkout = useCheckout();
  const [method, setMethod] = useState<'ONLINE' | 'COD'>('COD');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLoading || !cart) return <Spinner />;
  if (!cart.items.length) return <Navigate to="/bag" />;
  const address = addresses?.find((a) => a.id === choice.addressId);
  if (addresses && !address) return <Navigate to="/checkout" />;

  const place = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await checkout.mutateAsync({
        addressId: choice.addressId!,
        delivery: choice.delivery,
        paymentMethod: method,
        couponCode: cart.summary.coupon?.code,
      });
      reset();
      const orders = res.orders.map((o) => o.orderNumber).join(',');
      if (res.payment) {
        try {
          await payWithRazorpay(res.payment);
        } catch (e) {
          // Orders are placed; record the failure and offer retry / cash on delivery
          await paymentApi.failed(res.payment.razorpayOrderId, (e as Error).message).catch(() => undefined);
          navigate({to: '/payment', search: {ref: res.payment.razorpayOrderId}});
          return;
        }
      }
      navigate({to: '/order-placed', search: {orders, method: res.paymentMethod}});
    } catch (e) {
      setError(errorMessage(e, 'Could not place your order'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Steps current="payment" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4 rounded-md border border-line bg-white p-5">
          <h1 className="font-serif text-2xl">How would you like to pay?</h1>
          <div className="space-y-3" role="radiogroup" aria-label="Payment method">
            <MethodCard
              active={method === 'ONLINE'}
              onClick={() => setMethod('ONLINE')}
              disabled={!config?.online}
              icon={<CreditCard size={20} />}
              title="Pay online"
              note={config?.online ? 'UPI (GPay, PhonePe, Paytm), debit / credit card, net banking or wallet · secured by Razorpay' : 'Online payment is not available yet. Please use cash on delivery.'}
            />
            <MethodCard
              active={method === 'COD'}
              onClick={() => setMethod('COD')}
              icon={<Banknote size={20} />}
              title="Cash on delivery"
              note="Pay in cash or UPI when your order arrives"
            />
          </div>
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}
          <button onClick={place} disabled={busy} className={`${btn.primary} w-full`}>
            {busy ? 'Placing order…' : method === 'COD' ? `Place order · ${inr(cart.summary.total)}` : `Pay ${inr(cart.summary.total)}`}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-faint">
            <ShieldCheck size={13} /> Your order is confirmed only after the payment is verified
          </p>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
          {address && (
            <div className="rounded-md border border-line bg-white p-5">
              <div className="mb-2 flex justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider">Delivering to</p>
                <Link to="/checkout" className="tap text-xs font-semibold text-brand">
                  Change
                </Link>
              </div>
              <AddressLines a={address} />
            </div>
          )}
          <PriceSummary cart={cart} />
        </aside>
      </div>
    </div>
  );
}

function RetryPayment({razorpayOrderId}: {razorpayOrderId: string}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const {data, isLoading, refetch} = usePaymentStatus(razorpayOrderId);
  const {data: config} = usePaymentConfig();
  const [busy, setBusy] = useState<'' | 'pay' | 'cod'>('');
  const [error, setError] = useState('');

  if (isLoading || !data) return <Spinner />;
  const orders = data.orders.map((o) => o.orderNumber).join(',');
  if (data.paymentStatus === 'PAID') return <Navigate to="/order-placed" search={{orders, method: 'ONLINE'}} />;

  const retry = async () => {
    setError('');
    setBusy('pay');
    try {
      const info = await paymentApi.retry(razorpayOrderId);
      await payWithRazorpay(info);
      qc.invalidateQueries({queryKey: ['store-private']});
      navigate({to: '/order-placed', search: {orders, method: 'ONLINE'}});
    } catch (e) {
      await paymentApi.failed(razorpayOrderId, (e as Error).message).catch(() => undefined);
      setError((e as Error).message);
      refetch();
    } finally {
      setBusy('');
    }
  };

  const cod = async () => {
    setBusy('cod');
    try {
      await paymentApi.cod(razorpayOrderId);
      qc.invalidateQueries({queryKey: ['store-private']});
      navigate({to: '/order-placed', search: {orders, method: 'COD'}});
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const address = data.address;
  return (
    <div>
      <Steps current="payment" />
      <div className="mb-5 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Payment not completed</p>
          <p>{error || data.lastError || 'The payment did not go through.'} If any money was taken, your bank will return it automatically.</p>
          <p className="mt-1 text-xs">Your order is saved and your items are held for you. Pay again, or switch to cash on delivery.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-3 rounded-md border border-line bg-white p-5">
          <h1 className="font-serif text-2xl">Finish your order</h1>
          <button onClick={retry} disabled={!!busy || !config?.online} className={`${btn.primary} w-full`}>
            {busy === 'pay' ? 'Opening payment…' : `Retry payment · ${inr(data.total)}`}
          </button>
          <button onClick={cod} disabled={!!busy} className={`${btn.outline} w-full`}>
            {busy === 'cod' ? 'Switching…' : 'Pay cash on delivery instead'}
          </button>
          <Link to="/account/orders" className="block pt-2 text-center text-xs text-ink-soft hover:text-brand">
            Decide later — see it in My orders
          </Link>
        </section>
        <aside className="space-y-4">
          <div className="rounded-md border border-line bg-white p-5 text-sm">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider">Order{data.orders.length > 1 ? 's' : ''}</p>
            {data.orders.map((o) => (
              <p key={o.id} className="flex justify-between">
                <span>
                  {o.orderNumber} · {o.items} item{o.items === 1 ? '' : 's'}
                </span>
                <span>{inr(o.totalAmount)}</span>
              </p>
            ))}
            <p className="mt-2 flex justify-between border-t border-line pt-2 font-serif text-lg">
              <span>To pay</span>
              <span>{inr(data.total)}</span>
            </p>
          </div>
          {address && (
            <div className="rounded-md border border-line bg-white p-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider">Delivering to</p>
              <AddressLines a={{...address, id: '', isDefault: false, label: address.label ?? 'HOME'}} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
