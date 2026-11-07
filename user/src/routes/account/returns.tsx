import {useEffect, useMemo, useState} from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {ArrowLeftRight, Banknote, Check, CheckCircle2, Plus, RotateCcw} from 'lucide-react';
import {errorMessage, fieldErrors} from '@/lib/api';
import {useHelpInfo, useOrderList, useRequestReturn, useReturns} from '@/lib/queries';
import {inr, shortDate, sizeText} from '@/lib/format';
import type {Order, ReturnResolution, ReturnRow} from '@/lib/types';
import {btn, Empty, ErrorBox, input, label, ProductVisual, Spinner} from '@/components/ui';
import {card, Chip, FieldError, PageHead, PhotoPicker} from '@/components/account';

export const Route = createFileRoute('/account/returns')({
  validateSearch: (s: Record<string, unknown>): {order?: string} => ({order: typeof s.order === 'string' ? s.order : undefined}),
  component: ReturnsPage,
});

function ReturnsPage() {
  const {order} = Route.useSearch();
  const navigate = useNavigate({from: '/account/returns'});
  const {data: rows, isLoading, error, refetch} = useReturns();
  const {data: all} = useOrderList('all');
  const eligible = (all?.items ?? []).filter((o) => o.can.return);
  const [done, setDone] = useState<{refund: number; resolution: ReturnResolution} | null>(null);

  if (order) {
    return (
      <ReturnForm
        orderId={order}
        orders={eligible}
        onCancel={() => navigate({search: {}})}
        onDone={(r) => {
          setDone(r);
          navigate({search: {}});
        }}
      />
    );
  }

  return (
    <div>
      <PageHead
        title="Returns & refunds"
        sub="Easy 7-day returns and size exchanges on most items"
        action={
          eligible.length > 0 && (
            <button onClick={() => navigate({search: {order: eligible[0].id}})} className={btn.primary}>
              <Plus size={14} /> Request a return
            </button>
          )
        }
      />
      {done && (
        <div className="mb-5 flex gap-3 rounded-lg border border-ok/30 bg-ok/5 p-4" role="status">
          <CheckCircle2 className="shrink-0 text-ok" />
          <div className="text-sm">
            <p className="font-semibold">Request sent</p>
            <p className="text-ink-soft">
              The shop will review it within 24 hours, then our courier picks it up.
              {done.resolution === 'REFUND' && ` You will get ${inr(done.refund)} back once it reaches the shop.`}
            </p>
          </div>
        </div>
      )}
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message="Could not load your returns." retry={refetch} />
      ) : !rows?.length ? (
        <Empty
          icon={<RotateCcw size={28} />}
          title="No returns yet"
          text={eligible.length ? 'Something not right? You can return or exchange delivered items within 7 days.' : 'Delivered orders can be returned or exchanged within 7 days.'}
          action={eligible.length > 0 && <button onClick={() => navigate({search: {order: eligible[0].id}})} className={btn.primary}>Request a return</button>}
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <ReturnCard key={r.id} r={r} />
          ))}
        </ul>
      )}
      <HowItWorks />
    </div>
  );
}

/** Requested → Approved → Picked up → Refunded / Exchanged */
const progressOf = (r: ReturnRow) => {
  const last = r.resolution === 'EXCHANGE' ? 'Exchange shipped' : 'Refunded';
  const steps = ['Requested', 'Approved', 'Picked up', last];
  const at =
    r.returnStatus === 'REJECTED'
      ? -1
      : r.refundStatus === 'PROCESSED' || r.returnStatus === 'COMPLETED'
        ? 3
        : r.returnStatus === 'RECEIVED'
          ? 2
          : r.returnStatus === 'APPROVED'
            ? 1
            : 0;
  return {steps, at};
};

function ReturnCard({r}: {r: ReturnRow}) {
  const {steps, at} = progressOf(r);
  const finished = at === 3;
  const tone = r.returnStatus === 'REJECTED' ? 'bad' : finished ? 'ok' : 'warn';
  const text = r.returnStatus === 'REJECTED' ? 'Not approved' : finished ? steps[3] : steps[at] === 'Requested' ? 'Waiting for the shop' : steps[at];
  return (
    <li className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 text-xs">
        <span>
          <span className="font-semibold">{r.resolution === 'EXCHANGE' ? 'Exchange' : 'Return'}</span>
          <span className="text-ink-soft">
            {' '}
            · requested {shortDate(r.createdAt)} ·{' '}
            <Link to="/account/order/$id" params={{id: r.order.id}} className="hover:text-brand hover:underline">
              order {r.order.orderNumber}
            </Link>
          </span>
        </span>
        <Chip tone={tone}>{text}</Chip>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          {r.items.map((i) => (
            <div key={i.orderItemId} className="flex gap-3">
              <span className="h-20 w-16 shrink-0 overflow-hidden rounded bg-canvas">
                <ProductVisual image={i.image} name={i.name} iconSize={14} />
              </span>
              <div className="text-sm">
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-ink-soft">{[sizeText(i.size), i.color, `Qty ${i.quantity}`].filter(Boolean).join(' · ')}</p>
                <p className="mt-1 text-xs text-ink-soft">Reason: {r.reason}</p>
              </div>
            </div>
          ))}
          {r.images.length > 0 && (
            <div className="flex gap-2">
              {r.images.map((u) => (
                <img key={u} src={u} alt="Photo you sent" className="h-14 w-14 rounded border border-line object-cover" />
              ))}
            </div>
          )}
        </div>
        <div className="rounded bg-canvas p-3 text-sm">
          {r.resolution === 'EXCHANGE' ? (
            <p>
              <ArrowLeftRight size={14} className="mr-1 inline text-brand" />
              Exchange for <b>{r.exchangeFor}</b>
            </p>
          ) : (
            <>
              <p className="text-xs text-ink-soft">Refund</p>
              <p className="text-xl font-semibold">{inr(r.refundAmount)}</p>
              <p className="text-xs text-ink-soft">{r.order.paymentMethod === 'COD' ? 'To your UPI or bank account' : 'To your original payment method'}</p>
            </>
          )}
        </div>
      </div>
      {at >= 0 ? (
        <ol className="flex border-t border-line px-4 py-3">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col items-center gap-1 text-center">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${i <= at ? 'bg-ok text-white' : 'border-2 border-line bg-white'}`}>
                {i <= at && <Check size={11} strokeWidth={3} />}
              </span>
              <span className={`text-[11px] leading-tight ${i <= at ? 'font-medium' : 'text-ink-faint'}`}>{s}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-t border-line bg-red-50 px-4 py-3 text-sm text-red-800">The shop could not accept this return. Check your notifications for the reason, or contact us.</p>
      )}
    </li>
  );
}

function HowItWorks() {
  const steps = [
    {t: 'Request', d: 'Pick the items and tell us why, within 7 days of delivery.'},
    {t: 'Pickup', d: 'Once approved, our courier collects it from your door. Keep tags on.'},
    {t: 'Refund or exchange', d: 'Refunds reach you in 5–7 working days after the shop checks the item.'},
  ];
  return (
    <section className="mt-8 grid gap-3 sm:grid-cols-3">
      {steps.map((s, i) => (
        <div key={s.t} className={`${card} p-4`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{i + 1}</span>
          <p className="mt-2 font-semibold">{s.t}</p>
          <p className="text-sm text-ink-soft">{s.d}</p>
        </div>
      ))}
    </section>
  );
}

function ReturnForm({orderId, orders, onCancel, onDone}: {orderId: string; orders: Order[]; onCancel: () => void; onDone: (r: {refund: number; resolution: ReturnResolution}) => void}) {
  const navigate = useNavigate({from: '/account/returns'});
  const {data: help} = useHelpInfo();
  const req = useRequestReturn();
  const order = orders.find((o) => o.id === orderId);
  const items = useMemo(() => order?.items.filter((i) => i.returnableQty > 0) ?? [], [order]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [resolution, setResolution] = useState<ReturnResolution>('EXCHANGE');
  const [exchangeFor, setExchangeFor] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  // One item is picked for you when the order has only one
  const onlyItem = items.length === 1 ? items[0].id : null;
  useEffect(() => setQty(onlyItem ? {[onlyItem]: 1} : {}), [orderId, onlyItem]);
  // Size problems usually want an exchange; others a refund
  useEffect(() => setResolution(reason.startsWith('Size') ? 'EXCHANGE' : 'REFUND'), [reason]);

  if (!order) {
    return (
      <Empty
        title="This order can't be returned"
        text="Its return window may have closed, or everything in it is already in a return."
        action={<button onClick={onCancel} className={btn.outline}>Back to returns</button>}
      />
    );
  }

  const picked = items.filter((i) => qty[i.id]);
  const refund = picked.reduce((n, i) => n + i.refundPerUnit * qty[i.id], 0);
  const photoWanted = ['Damaged or defective', 'Different from what I ordered', 'Colour different from the photos', 'Quality not as expected'].includes(reason);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError('');
    const local: Record<string, string> = {};
    if (!picked.length) local.items = 'Choose at least one item';
    if (!reason) local.reason = 'Choose a reason';
    if (resolution === 'EXCHANGE' && !exchangeFor.trim()) local.exchangeFor = 'Tell us the size or colour you want instead';
    if (Object.keys(local).length) return setErrors(local);
    req.mutate(
      {
        orderId: order.id,
        items: picked.map((i) => ({orderItemId: i.id, quantity: qty[i.id]})),
        reason,
        details: details.trim() || undefined,
        resolution,
        exchangeFor: resolution === 'EXCHANGE' ? exchangeFor.trim() : undefined,
        images,
      },
      {
        onSuccess: (r) => onDone({refund: r.refundAmount, resolution: r.resolution}),
        onError: (err) => {
          setErrors(fieldErrors(err));
          setError(errorMessage(err, 'Could not send your request'));
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <PageHead title="Return or exchange" sub="Most requests are approved within 24 hours" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          {orders.length > 1 && (
            <section className={`${card} p-5`}>
              <label className={label} htmlFor="order">
                Order
              </label>
              <select id="order" value={order.id} onChange={(e) => navigate({search: {order: e.target.value}})} className={input}>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} · {o.items.map((i) => i.name).join(', ')}
                  </option>
                ))}
              </select>
            </section>
          )}

          <section className={`${card} p-5`}>
            <h2 className="mb-3 font-semibold">1. Which items?</h2>
            <ul className="space-y-3">
              {items.map((i) => {
                const on = !!qty[i.id];
                return (
                  <li key={i.id}>
                    <label className={`flex cursor-pointer gap-3 rounded border p-3 transition ${on ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-ink-faint'}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => setQty((q) => ({...q, [i.id]: e.target.checked ? 1 : 0}))}
                        className="mt-1 h-5 w-5 shrink-0 accent-brand"
                      />
                      <span className="h-20 w-16 shrink-0 overflow-hidden rounded bg-canvas">
                        <ProductVisual image={i.image} name={i.name} iconSize={14} />
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block font-medium">{i.name}</span>
                        <span className="block text-xs text-ink-soft">{[sizeText(i.size), i.color].filter(Boolean).join(' · ')}</span>
                        <span className="mt-1 block text-xs text-ink-faint">Return by {i.returnUntil ? shortDate(i.returnUntil) : '—'}</span>
                      </span>
                      {i.returnableQty > 1 && on && (
                        <select
                          value={qty[i.id]}
                          onClick={(e) => e.preventDefault()}
                          onChange={(e) => setQty((q) => ({...q, [i.id]: Number(e.target.value)}))}
                          className="h-9 self-center rounded border border-line px-2 text-sm"
                          aria-label={`Quantity of ${i.name}`}
                        >
                          {Array.from({length: i.returnableQty}, (_, n) => (
                            <option key={n + 1}>{n + 1}</option>
                          ))}
                        </select>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
            <FieldError msg={errors.items} />
          </section>

          <section className={`${card} p-5`}>
            <h2 className="mb-3 font-semibold">2. What's the problem?</h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reason">
              {(help?.returnReasons ?? []).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={reason === r}
                  onClick={() => setReason(r)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${reason === r ? 'border-brand bg-brand text-white' : 'border-line hover:border-brand'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <FieldError msg={errors.reason} />
            <label className={`${label} mt-4`} htmlFor="details">
              Tell us more <span className="normal-case text-ink-faint">(optional)</span>
            </label>
            <textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={500} className={input} placeholder="e.g. Tight across the shoulders" />
            <p className={`${label} mt-4`}>
              Photos {photoWanted ? <span className="normal-case text-brand">(helps us approve faster)</span> : <span className="normal-case text-ink-faint">(optional)</span>}
            </p>
            <PhotoPicker value={images} onChange={setImages} />
            <FieldError msg={errors.images} />
          </section>

          <section className={`${card} p-5`}>
            <h2 className="mb-3 font-semibold">3. What would you like?</h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Resolution">
              {(
                [
                  {key: 'EXCHANGE', icon: ArrowLeftRight, title: 'Exchange', text: 'Get another size or colour of the same item. No extra charge.'},
                  {key: 'REFUND', icon: Banknote, title: 'Refund', text: order.paymentMethod === 'COD' ? 'Money back to your UPI or bank. We will call to confirm the account.' : 'Money back to your original payment method.'},
                ] as const
              ).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={resolution === o.key}
                  onClick={() => setResolution(o.key)}
                  className={`relative rounded-lg border-2 p-4 text-left transition ${resolution === o.key ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-ink-faint'}`}
                >
                  {resolution === o.key && <Check size={16} className="absolute right-3 top-3 text-brand" />}
                  <o.icon size={20} className="text-brand" />
                  <p className="mt-2 font-semibold">{o.title}</p>
                  <p className="text-xs text-ink-soft">{o.text}</p>
                </button>
              ))}
            </div>
            {resolution === 'EXCHANGE' && (
              <div className="mt-4">
                <label className={label} htmlFor="exch">
                  Size or colour you want
                </label>
                <input id="exch" value={exchangeFor} onChange={(e) => setExchangeFor(e.target.value)} maxLength={60} className={input} placeholder="e.g. Size M, or Teal in size L" />
                <FieldError msg={errors.exchangeFor} />
              </div>
            )}
          </section>
        </div>

        <aside className="self-start lg:sticky lg:top-40">
          <div className={`${card} p-5`}>
            <h2 className="font-semibold">Summary</h2>
            <p className="mt-1 text-xs text-ink-soft">Order {order.orderNumber}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Items</dt>
                <dd>{picked.reduce((n, i) => n + qty[i.id], 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Pickup</dt>
                <dd className="text-ok">Free</dd>
              </div>
              {resolution === 'REFUND' && (
                <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                  <dt>Refund</dt>
                  <dd>{inr(Math.round(refund * 100) / 100)}</dd>
                </div>
              )}
            </dl>
            {resolution === 'REFUND' && order.couponDiscount > 0 && <p className="mt-1 text-[11px] text-ink-faint">After the coupon you used. Delivery charges are not refunded.</p>}
            {error && !Object.keys(errors).length && (
              <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            )}
            <button className={`${btn.primary} mt-4 w-full`} disabled={req.isPending}>
              {req.isPending ? 'Sending…' : 'Send request'}
            </button>
            <button type="button" onClick={onCancel} className={`${btn.ghost} mt-3 w-full justify-center`}>
              Cancel
            </button>
          </div>
          <p className="mt-3 px-1 text-xs text-ink-faint">Keep the tags on and pack the item in its original cover. Our courier will bring a label.</p>
        </aside>
      </div>
    </form>
  );
}
