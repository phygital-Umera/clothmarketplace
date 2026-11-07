import {ReactNode, useEffect, useRef, useState} from 'react';
import {Camera, Check, Loader2, Star, X} from 'lucide-react';
import toast from 'react-hot-toast';
import {errorMessage} from '@/lib/api';
import {uploadPhoto} from '@/lib/queries';
import {ORDER_STATUS_LABEL, shortDate} from '@/lib/format';
import type {Order, TrackStep} from '@/lib/types';

/* Pieces shared by the account pages */

export function PageHead({title, sub, action}: {title: string; sub?: ReactNode; action?: ReactNode}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl leading-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export const card = 'rounded-lg border border-line bg-white';

type Tone = 'ok' | 'warn' | 'bad' | 'muted' | 'brand';
const TONES: Record<Tone, string> = {
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-gold/15 text-[#8A6420]',
  bad: 'bg-red-50 text-red-700',
  muted: 'bg-ink/5 text-ink-soft',
  brand: 'bg-brand-soft text-brand',
};
export function Chip({tone, children}: {tone: Tone; children: ReactNode}) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONES[tone]}`}>{children}</span>;
}

/** One line that says where the order is, in the customer's words */
export const orderState = (o: Order): {text: string; tone: Tone} => {
  if (o.can.pay) return {text: o.paymentStatus === 'FAILED' ? 'Payment failed' : 'Payment pending', tone: 'bad'};
  if (o.status === 'CANCELLED') return {text: 'Cancelled', tone: 'muted'};
  if (o.status === 'RETURNED') return {text: 'Returned · refunded', tone: 'muted'};
  if (o.cancelRequested && o.cancelApproved === null) return {text: 'Cancellation requested', tone: 'warn'};
  const open = o.returns.find((r) => !['COMPLETED', 'REJECTED'].includes(r.returnStatus));
  if (open) return {text: `${open.resolution === 'EXCHANGE' ? 'Exchange' : 'Return'} ${open.returnStatus === 'REQUESTED' ? 'requested' : 'in progress'}`, tone: 'warn'};
  if (o.status === 'DELIVERED') return {text: `Delivered${o.deliveredAt ? ` ${shortDate(o.deliveredAt)}` : ''}`, tone: 'ok'};
  if (o.status === 'OUT_FOR_DELIVERY') return {text: 'Out for delivery today', tone: 'brand'};
  return {text: ORDER_STATUS_LABEL[o.status], tone: 'brand'};
};

export function OrderChip({order}: {order: Order}) {
  const s = orderState(order);
  return <Chip tone={s.tone}>{s.text}</Chip>;
}

export function Tabs<T extends string>({tabs, value, onChange, label}: {tabs: {key: T; label: string; count?: number}[]; value: T; onChange: (t: T) => void; label: string}) {
  return (
    <div className="no-scrollbar -mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-line px-1" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition ${value === t.key ? 'border-brand font-semibold text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}
        >
          {t.label}
          {t.count !== undefined && <span className={`ml-1.5 rounded-full px-1.5 text-[11px] ${value === t.key ? 'bg-brand text-white' : 'bg-ink/5'}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Placed → Confirmed → Packed → Shipped → Out for delivery → Delivered */
export function TrackStepper({steps}: {steps: TrackStep[]}) {
  return (
    <ol className="grid gap-0 sm:grid-cols-6">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
          {/* connector: vertical on phones, horizontal from sm */}
          {i < steps.length - 1 && (
            <span
              className={`absolute left-[11px] top-6 h-[calc(100%-24px)] w-0.5 sm:left-[calc(50%+14px)] sm:top-[11px] sm:h-0.5 sm:w-[calc(100%-28px)] ${steps[i + 1].done ? 'bg-ok' : 'bg-line'}`}
              aria-hidden
            />
          )}
          <span
            className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
              s.current ? 'border-brand bg-brand text-white ring-4 ring-brand/15' : s.done ? 'border-ok bg-ok text-white' : 'border-line bg-white'
            }`}
          >
            {s.done && !s.current && <Check size={13} strokeWidth={3} />}
            {s.current && <span className="h-2 w-2 rounded-full bg-white" />}
          </span>
          <span className="sm:mt-2">
            <span className={`block text-sm ${s.current ? 'font-semibold text-brand' : s.done ? 'font-medium' : 'text-ink-faint'}`}>{s.label}</span>
            <span className="block text-[11px] text-ink-faint">{s.at && s.done ? shortDate(s.at) : s.current ? 'Now' : ''}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function StarInput({value, onChange, size = 28}: {value: number; onChange: (n: number) => void; size?: number}) {
  const [hover, setHover] = useState(0);
  const words = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Loved it'];
  return (
    <div className="flex items-center gap-3">
      <div className="flex" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star size={size} className={(hover || value) >= n ? 'fill-gold text-gold' : 'text-line'} />
          </button>
        ))}
      </div>
      <span className="text-sm text-ink-soft">{words[hover || value]}</span>
    </div>
  );
}

/** Add up to `max` photos; each is uploaded as soon as it is picked */
export function PhotoPicker({value, onChange, max = 4}: {value: string[]; onChange: (urls: string[]) => void; max?: number}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const pick = async (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, max - value.length);
    if (!list.length) return;
    setBusy(list.length);
    const urls: string[] = [];
    for (const f of list) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 5 MB`);
        continue;
      }
      try {
        urls.push(await uploadPhoto(f));
      } catch (e) {
        toast.error(errorMessage(e, 'Photo could not be added'));
      }
    }
    setBusy(0);
    onChange([...value, ...urls]);
    if (ref.current) ref.current.value = '';
  };
  return (
    <div className="flex flex-wrap gap-2">
      {value.map((url) => (
        <span key={url} className="relative h-20 w-20 overflow-hidden rounded border border-line">
          <img src={url} alt="Your photo" className="h-full w-full object-cover" />
          <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label="Remove photo">
            <X size={12} />
          </button>
        </span>
      ))}
      {value.length + busy < max && (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded border border-dashed border-ink-faint text-[11px] text-ink-soft hover:border-brand hover:text-brand"
        >
          <Camera size={18} /> Add photo
        </button>
      )}
      {busy > 0 && (
        <span className="flex h-20 w-20 items-center justify-center rounded border border-line text-ink-faint">
          <Loader2 size={18} className="animate-spin" />
        </span>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => pick(e.target.files)} />
    </div>
  );
}

export function Dialog({open, onClose, title, children, wide}: {open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean}) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button onClick={onClose} className="p-1 text-ink-soft hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FieldError({msg}: {msg?: string}) {
  return msg ? <p className="mt-1 text-xs text-red-700">{msg}</p> : null;
}
