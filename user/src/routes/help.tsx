import {useEffect, useMemo, useState} from 'react';
import {createFileRoute, Link} from '@tanstack/react-router';
import {CheckCircle2, ChevronDown, Clock, CreditCard, Package, Ruler, RotateCcw, Search, User} from 'lucide-react';
import {errorMessage, fieldErrors} from '@/lib/api';
import {useAuth} from '@/lib/auth';
import {sendSupport, SupportInput, useHelpInfo} from '@/lib/queries';
import {btn, input, label} from '@/components/ui';
import {FieldError} from '@/components/account';

export const Route = createFileRoute('/help')({
  validateSearch: (s: Record<string, unknown>): {order?: string} => ({order: typeof s.order === 'string' ? s.order.slice(0, 40) : undefined}),
  component: HelpPage,
});

type Topic = 'Order & delivery' | 'Returns & refunds' | 'Payments' | 'Size & fit' | 'My account';
const TOPICS: {key: Topic; icon: typeof Package; text: string}[] = [
  {key: 'Order & delivery', icon: Package, text: 'Track, change or cancel'},
  {key: 'Returns & refunds', icon: RotateCcw, text: 'Return, exchange, refund status'},
  {key: 'Payments', icon: CreditCard, text: 'UPI, cards, cash on delivery'},
  {key: 'Size & fit', icon: Ruler, text: 'Find the right size'},
  {key: 'My account', icon: User, text: 'Sign in, password, addresses'},
];

const FAQ: {topic: Topic; q: string; a: string; link?: {to: string; text: string}}[] = [
  {topic: 'Order & delivery', q: 'Where is my order?', a: 'Open My orders and tap Track order. You will see each step, the courier name and the tracking number once it ships. We also notify you at every step.', link: {to: '/account/orders', text: 'Go to My orders'}},
  {topic: 'Order & delivery', q: 'How long does delivery take?', a: 'Standard delivery takes 3–5 days and is free above ₹999 (₹49 below that). Express delivery reaches in 1–2 days for ₹99.'},
  {topic: 'Order & delivery', q: 'Can I cancel my order?', a: 'Yes, until the shop packs it. Open the order and tap Cancel order. If you paid online, the shop confirms the cancellation and refunds you in 5–7 working days.'},
  {topic: 'Order & delivery', q: 'Why did my bag become two orders?', a: 'Items from different shops ship separately, so each shop gets its own order with its own tracking. You paid once; delivery is charged only once.'},
  {topic: 'Returns & refunds', q: 'What is the return policy?', a: 'Most items can be returned or exchanged within 7 days of delivery, unused and with tags on. The last return date is shown on each item in your order.', link: {to: '/account/returns', text: 'Returns & refunds'}},
  {topic: 'Returns & refunds', q: 'How do I exchange for another size?', a: 'Go to Returns & refunds, pick the item, choose Exchange and tell us the size you want. Our courier picks up the old one and brings the new one. No extra charge.'},
  {topic: 'Returns & refunds', q: 'When will I get my refund?', a: 'Once the shop receives and checks the item (usually 2–3 days after pickup), we send the refund. Banks take 5–7 working days to show it. Cash on delivery refunds go to your UPI or bank account.'},
  {topic: 'Returns & refunds', q: 'Is delivery charge refunded?', a: 'Delivery charges are not refunded for returns, but are refunded in full if your whole order is cancelled before it ships.'},
  {topic: 'Payments', q: 'Which payment methods can I use?', a: 'UPI, debit and credit cards, net banking and wallets through Razorpay, or cash on delivery.'},
  {topic: 'Payments', q: 'My payment failed but money was taken', a: 'If the order shows Payment failed, the money is returned by your bank automatically within 5–7 days. You can try again or switch to cash on delivery from the order page.'},
  {topic: 'Payments', q: 'How do I use a coupon?', a: 'Enter the code in your bag before checkout. Only one coupon can be used per order, and each has a minimum order value shown with it.'},
  {topic: 'Size & fit', q: 'How do I find my size?', a: 'Each product page lists the sizes in stock. Check the "How it fits" summary from other buyers: if most say it runs small, pick one size up.'},
  {topic: 'Size & fit', q: 'Sarees and dupattas are "Free size". What does that mean?', a: 'They fit everyone. Sarees come with an unstitched blouse piece that you get tailored to your measurements.'},
  {topic: 'My account', q: 'I forgot my password', a: 'On the sign-in page tap Forgot password and enter your email or mobile number. We email you a link that works for 30 minutes.', link: {to: '/forgot-password', text: 'Reset password'}},
  {topic: 'My account', q: 'How do I change my address or phone?', a: 'Addresses can be added and edited under My account › Addresses. Your mobile number is your sign-in ID; contact us to change it.'},
];

function HelpPage() {
  const {order} = Route.useSearch();
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<Topic | null>(order ? 'Order & delivery' : null);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const term = q.trim().toLowerCase();
  const faqs = useMemo(
    () => FAQ.filter((f) => (!topic || f.topic === topic) && (!term || `${f.q} ${f.a}`.toLowerCase().includes(term))),
    [topic, term],
  );

  return (
    <div className="space-y-10">
      <section className="-mx-4 -mt-6 bg-brand px-4 py-12 text-center text-white sm:py-16">
        <h1 className="font-serif text-4xl sm:text-5xl">How can we help?</h1>
        <p className="mt-2 text-white/80">Search our answers or get in touch. We reply within one working day.</p>
        <div className="relative mx-auto mt-6 max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value) setTopic(null);
            }}
            placeholder="e.g. refund, exchange size, cancel"
            className="w-full rounded-full border-0 py-3.5 pl-11 pr-4 text-ink shadow-lg focus:outline-none focus:ring-2 focus:ring-gold"
            aria-label="Search help"
          />
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TOPICS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTopic(topic === t.key ? null : t.key);
                setQ('');
              }}
              aria-pressed={topic === t.key}
              className={`rounded-lg border p-4 text-left transition ${topic === t.key ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand'}`}
            >
              <t.icon size={22} className="text-brand" />
              <p className="mt-2 text-sm font-semibold">{t.key}</p>
              <p className="text-xs text-ink-soft">{t.text}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <h2 className="mb-3 font-serif text-2xl">{topic ?? (term ? `Results for "${q.trim()}"` : 'Frequently asked questions')}</h2>
          {!faqs.length ? (
            <p className="rounded-lg border border-line bg-white p-6 text-sm text-ink-soft">No answers match. Send us a message and we will help.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-white">
              {faqs.map((f) => {
                const isOpen = openQ === f.q || (!!term && faqs.length <= 3);
                return (
                  <li key={f.q}>
                    <button onClick={() => setOpenQ(isOpen ? null : f.q)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                      <span className="font-medium">{f.q}</span>
                      <ChevronDown size={18} className={`shrink-0 text-ink-faint transition ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-sm text-ink-soft">
                        <p>{f.a}</p>
                        {f.link && (
                          <Link to={f.link.to} className={`${btn.ghost} mt-2`}>
                            {f.link.text}
                          </Link>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <ContactForm orderNumber={order} topic={topic} />
          <div className="rounded-lg border border-line bg-white p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <Clock size={15} className="text-brand" /> Replies within one working day
            </p>
            <p className="mt-1 text-ink-soft">Our team answers Monday to Saturday, 10 am to 7 pm. For an order, the quickest way is the Contact us button on the order page.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ContactForm({orderNumber, topic}: {orderNumber?: string; topic: Topic | null}) {
  const {me, signedIn} = useAuth();
  const {data: help} = useHelpInfo();
  const blank = (): SupportInput => ({name: me?.fullname ?? '', email: me?.email ?? '', phone: me?.phoneNumber ?? '', topic: topic ?? (orderNumber ? 'Order & delivery' : ''), orderNumber: orderNumber ?? '', message: ''});
  const [form, setForm] = useState<SupportInput>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState('');
  // Fill in who you are once your account loads, and follow the topic you picked
  useEffect(() => setForm((f) => ({...f, name: f.name || me?.fullname || '', email: f.email || me?.email || '', phone: f.phone || me?.phoneNumber || ''})), [me]);
  useEffect(() => {
    if (topic) setForm((f) => ({...f, topic}));
  }, [topic]);
  const set = (k: keyof SupportInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({...f, [k]: e.target.value}));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError('');
    setBusy(true);
    try {
      const r = await sendSupport({...form, phone: form.phone || undefined, orderNumber: form.orderNumber || undefined}, signedIn);
      setTicket(r.ticket);
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length) setError(errorMessage(err, 'Could not send your message'));
    } finally {
      setBusy(false);
    }
  };

  if (ticket) {
    return (
      <div className="rounded-lg border border-ok/30 bg-white p-6 text-center" role="status">
        <CheckCircle2 size={36} className="mx-auto text-ok" />
        <p className="mt-2 font-serif text-xl">Message sent</p>
        <p className="mt-1 text-sm text-ink-soft">
          Your ticket number is <b className="text-ink">{ticket}</b>. We will reply to {form.email} within one working day.
        </p>
        <button
          onClick={() => {
            setTicket('');
            setForm(blank());
          }}
          className={`${btn.ghost} mt-3`}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-line bg-white p-5" noValidate>
      <h2 className="font-serif text-2xl">Still need help?</h2>
      <p className="text-sm text-ink-soft">Write to us and a person from our team will reply.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <label className={label} htmlFor="c-name">
            Name
          </label>
          <input id="c-name" value={form.name} onChange={set('name')} autoComplete="name" className={input} />
          <FieldError msg={errors.name} />
        </div>
        <div>
          <label className={label} htmlFor="c-email">
            Email
          </label>
          <input id="c-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" className={input} />
          <FieldError msg={errors.email} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <label className={label} htmlFor="c-topic">
            Topic
          </label>
          <select id="c-topic" value={form.topic} onChange={set('topic')} className={input}>
            <option value="">Choose…</option>
            {(help?.topics ?? []).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <FieldError msg={errors.topic} />
        </div>
        <div>
          <label className={label} htmlFor="c-order">
            Order no. <span className="normal-case text-ink-faint">(optional)</span>
          </label>
          <input id="c-order" value={form.orderNumber} onChange={set('orderNumber')} className={input} placeholder="ORD-…" />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="c-msg">
          Message
        </label>
        <textarea id="c-msg" value={form.message} onChange={set('message')} rows={4} maxLength={1500} className={input} placeholder="Tell us what happened" />
        <FieldError msg={errors.message} />
      </div>
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <button className={`${btn.primary} w-full`} disabled={busy}>
        {busy ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
