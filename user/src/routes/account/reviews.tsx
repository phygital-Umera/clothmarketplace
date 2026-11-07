import {useState} from 'react';
import {createFileRoute, Link} from '@tanstack/react-router';
import {MessageSquareText, Pencil, Star} from 'lucide-react';
import {errorMessage, fieldErrors} from '@/lib/api';
import {MyReviews, useReviews, useWriteReview} from '@/lib/queries';
import {shortDate, sizeText} from '@/lib/format';
import type {Fit} from '@/lib/types';
import {btn, Empty, ErrorBox, input, label, ProductVisual, Spinner, Stars} from '@/components/ui';
import {card, FieldError, PageHead, PhotoPicker, StarInput, Tabs} from '@/components/account';

export const Route = createFileRoute('/account/reviews')({component: ReviewsPage});

export const FIT_LABEL: Record<Fit, string> = {SMALL: 'Runs small', TRUE: 'True to size', LARGE: 'Runs large'};

type Draft = {productId: string; rating: number; fit: Fit | null; title: string; comment: string; images: string[]};

function ReviewsPage() {
  const {data, isLoading, error, refetch} = useReviews();
  const [tab, setTab] = useState<'waiting' | 'mine'>('waiting');
  const [open, setOpen] = useState<string | null>(null);
  const [start, setStart] = useState(0);

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox message="Could not load your reviews." retry={refetch} />;
  const current = tab === 'waiting' && !data.pending.length && data.mine.length ? 'mine' : tab;

  return (
    <div>
      <PageHead title="Reviews" sub="Your reviews help other shoppers pick the right size" />
      <Tabs
        label="Reviews"
        tabs={[
          {key: 'waiting', label: 'Waiting for review', count: data.pending.length},
          {key: 'mine', label: 'My reviews', count: data.mine.length},
        ]}
        value={current}
        onChange={setTab}
      />
      {current === 'waiting' ? (
        !data.pending.length ? (
          <Empty icon={<Star size={28} />} title="Nothing to review" text="Once an order is delivered, you can rate what you bought here." action={<Link to="/products" className={btn.primary}>Shop now</Link>} />
        ) : (
          <ul className="space-y-4">
            {data.pending.map((p) => (
              <li key={p.productId} className={card}>
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <Link to="/product/$id" params={{id: p.slug ?? p.productId}} className="h-24 w-[72px] shrink-0 overflow-hidden rounded bg-canvas">
                    <ProductVisual image={p.image} name={p.productName ?? 'Item'} iconSize={16} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.productName}</p>
                    <p className="text-xs text-ink-soft">{[sizeText(p.size), p.color].filter(Boolean).join(' · ')}</p>
                    <p className="mt-1 text-xs text-ink-faint">Delivered {shortDate(p.order.updatedAt)}</p>
                  </div>
                  {open !== p.productId && (
                    <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                      <StarInput
                        value={0}
                        onChange={(n) => {
                          setStart(n);
                          setOpen(p.productId);
                        }}
                        size={22}
                      />
                    </div>
                  )}
                </div>
                {open === p.productId && (
                  <ReviewForm initial={{productId: p.productId, rating: start, fit: null, title: '', comment: '', images: []}} onClose={() => setOpen(null)} showFit={!!p.size && p.size !== 'Free'} />
                )}
              </li>
            ))}
          </ul>
        )
      ) : !data.mine.length ? (
        <Empty icon={<MessageSquareText size={28} />} title="No reviews yet" text="Reviews you write appear here." />
      ) : (
        <ul className="space-y-4">
          {data.mine.map((r) => (
            <MyReview key={r.id} r={r} editing={open === r.product.id} onEdit={() => setOpen(r.product.id)} onClose={() => setOpen(null)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MyReview({r, editing, onEdit, onClose}: {r: MyReviews['mine'][number]; editing: boolean; onEdit: () => void; onClose: () => void}) {
  return (
    <li className={card}>
      <div className="flex gap-4 p-4">
        <Link to="/product/$id" params={{id: r.product.slug ?? r.product.id}} className="h-24 w-[72px] shrink-0 overflow-hidden rounded bg-canvas">
          <ProductVisual image={r.product.images[0]?.url} name={r.product.name} iconSize={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link to="/product/$id" params={{id: r.product.slug ?? r.product.id}} className="font-medium hover:text-brand">
              {r.product.name}
            </Link>
            {!editing && (
              <button onClick={onEdit} className={btn.ghost}>
                <Pencil size={13} /> Edit
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Stars value={r.rating} size={14} />
            {r.fit && <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-ink-soft">{FIT_LABEL[r.fit]}</span>}
            <span className="text-[11px] text-ink-faint">{shortDate(r.createdAt)}</span>
          </div>
          {r.title && <p className="mt-2 text-sm font-semibold">{r.title}</p>}
          {r.comment && <p className="mt-0.5 text-sm text-ink-soft">{r.comment}</p>}
          {r.images.length > 0 && (
            <div className="mt-2 flex gap-2">
              {r.images.map((u) => (
                <img key={u} src={u} alt="Your photo" className="h-16 w-16 rounded border border-line object-cover" />
              ))}
            </div>
          )}
        </div>
      </div>
      {editing && (
        <ReviewForm
          initial={{productId: r.product.id, rating: r.rating, fit: r.fit, title: r.title ?? '', comment: r.comment ?? '', images: r.images}}
          onClose={onClose}
          showFit
        />
      )}
    </li>
  );
}

function ReviewForm({initial, onClose, showFit}: {initial: Draft; onClose: () => void; showFit: boolean}) {
  const write = useWriteReview();
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({...x, [k]: v}));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError('');
    if (!d.rating) return setErrors({rating: 'Choose 1 to 5 stars'});
    write.mutate(
      {productId: d.productId, rating: d.rating, fit: d.fit, title: d.title.trim() || undefined, comment: d.comment.trim() || undefined, images: d.images},
      {
        onSuccess: onClose,
        onError: (err) => {
          setErrors(fieldErrors(err));
          setError(errorMessage(err, 'Could not save your review'));
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4 border-t border-line bg-canvas/50 p-4" noValidate>
      <div>
        <p className={label}>Your rating</p>
        <StarInput value={d.rating} onChange={(n) => set('rating', n)} />
        <FieldError msg={errors.rating} />
      </div>
      {showFit && (
        <div>
          <p className={label}>How does it fit?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Fit">
            {(Object.keys(FIT_LABEL) as Fit[]).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={d.fit === f}
                onClick={() => set('fit', d.fit === f ? null : f)}
                className={`rounded-full border px-3 py-1.5 text-sm ${d.fit === f ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'}`}
              >
                {FIT_LABEL[f]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className={label} htmlFor={`t-${d.productId}`}>
          Title
        </label>
        <input id={`t-${d.productId}`} value={d.title} onChange={(e) => set('title', e.target.value)} maxLength={80} className={input} placeholder="e.g. Lovely fabric, true to size" />
        <FieldError msg={errors.title} />
      </div>
      <div>
        <label className={label} htmlFor={`c-${d.productId}`}>
          Review
        </label>
        <textarea id={`c-${d.productId}`} value={d.comment} onChange={(e) => set('comment', e.target.value)} rows={3} maxLength={1000} className={input} placeholder="What did you like? How was the fabric, colour and fit?" />
        <FieldError msg={errors.comment} />
      </div>
      <div>
        <p className={label}>Photos (optional)</p>
        <PhotoPicker value={d.images} onChange={(v) => set('images', v)} />
      </div>
      {error && !Object.keys(errors).length && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btn.outline}>
          Cancel
        </button>
        <button className={btn.primary} disabled={write.isPending}>
          {write.isPending ? 'Saving…' : 'Submit review'}
        </button>
      </div>
    </form>
  );
}
