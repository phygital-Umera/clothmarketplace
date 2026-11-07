import {ReactNode} from 'react';
import {Loader2, Shirt, Star} from 'lucide-react';
import {inr, isDark} from '@/lib/format';

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded bg-brand px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50',
  outline:
    'inline-flex items-center justify-center gap-2 rounded border border-brand px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand transition hover:bg-brand-soft disabled:opacity-50',
  ghost: 'tap inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand hover:underline',
};

export const input =
  'w-full rounded border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 disabled:bg-canvas';

export const label = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft';

/** The product picture, or a tile in the product's colour when there is no photo yet */
export function ProductVisual({
  image,
  hex,
  name,
  className = '',
  iconSize = 40,
}: {
  image?: string | null;
  hex?: string | null;
  name: string;
  className?: string;
  iconSize?: number;
}) {
  if (image) {
    return <img src={image} alt={name} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{backgroundColor: hex ?? '#E9E2DA'}}
      role="img"
      aria-label={name}
    >
      <Shirt size={iconSize} strokeWidth={1} className={isDark(hex ?? null) ? 'text-white/70' : 'text-ink/40'} />
    </div>
  );
}

export function Price({price, mrp, size = 'sm'}: {price: number; mrp: number; size?: 'sm' | 'lg'}) {
  const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 ${size === 'lg' ? 'text-2xl' : 'text-sm'}`}>
      <span className="font-semibold text-ink">{inr(price)}</span>
      {off > 0 && (
        <>
          <span className={`text-ink-faint line-through ${size === 'lg' ? 'text-base' : 'text-xs'}`}>{inr(mrp)}</span>
          <span className={`rounded bg-ok/10 px-1 font-semibold text-ok ${size === 'lg' ? 'text-sm' : 'text-[11px]'}`}>
            {off}% off
          </span>
        </>
      )}
    </div>
  );
}

export function Stars({value, size = 12}: {value: number; size?: number}) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-gold text-gold' : 'text-line'} />
      ))}
    </span>
  );
}

export function RatingChip({avg, count}: {avg: number; count: number}) {
  if (!count) return <span className="text-[11px] text-ink-faint">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
      <Star size={11} className="fill-gold text-gold" />
      {avg.toFixed(1)} <span className="text-ink-faint">({count})</span>
    </span>
  );
}

const BADGE: Record<string, {text: string; cls: string}> = {
  NEW: {text: 'New', cls: 'bg-brand text-white'},
  BESTSELLER: {text: 'Bestseller', cls: 'bg-ink text-white'},
  LIMITED: {text: 'Only a few left', cls: 'bg-gold text-white'},
  OUT_OF_STOCK: {text: 'Out of stock', cls: 'bg-white text-ink-soft'},
};
export function Badge({kind}: {kind: string | null}) {
  if (!kind || !BADGE[kind]) return null;
  return (
    <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${BADGE[kind].cls}`}>
      {BADGE[kind].text}
    </span>
  );
}

export function Spinner({label = 'Loading…'}: {label?: string}) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-soft" role="status">
      <Loader2 size={18} className="animate-spin" /> {label}
    </div>
  );
}

export function Empty({title, text, action, icon}: {title: string; text?: string; action?: ReactNode; icon?: ReactNode}) {
  return (
    <div className="rounded-lg border border-line bg-white px-6 py-14 text-center">
      {icon && <div className="mx-auto mb-3 flex justify-center text-ink-faint">{icon}</div>}
      <p className="font-serif text-xl text-ink">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({message, retry}: {message: string; retry?: () => void}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-6 text-center text-sm text-red-800">
      {message}
      {retry && (
        <button onClick={retry} className="ml-2 font-semibold underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function SectionTitle({title, sub, action}: {title: string; sub?: string; action?: ReactNode}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <h2 className="font-serif text-2xl text-ink">{title}</h2>
        {sub && <p className="text-xs text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
