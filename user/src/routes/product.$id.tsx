import {useEffect, useMemo, useState} from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {Check, Minus, Plus, Truck} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {api, errorMessage} from '@/lib/api';
import {useAuth} from '@/lib/auth';
import {useAddToCart, useProduct} from '@/lib/queries';
import {inr, shortDate} from '@/lib/format';
import type {Coupon} from '@/lib/types';
import {ProductGrid, WishlistHeart} from '@/components/ProductCard';
import {btn, Empty, ErrorBox, Price, ProductVisual, SectionTitle, Spinner, Stars} from '@/components/ui';

export const Route = createFileRoute('/product/$id')({component: ProductPage});

const SIZE_CHART: Record<string, [number, number, number]> = {
  XS: [32, 26, 34],
  S: [34, 28, 36],
  M: [36, 30, 38],
  L: [38, 32, 40],
  XL: [40, 34, 42],
  XXL: [42, 36, 44],
};

/** "10% off (up to ₹300) on orders above ₹1,999", or the shop's own wording */
const offerText = (c: Coupon) => {
  if (c.description) return c.description;
  const off = c.type === 'PERCENTAGE' ? `${c.discountValue}% off` : `${inr(c.discountValue)} off`;
  const cap = c.type === 'PERCENTAGE' && c.maxDiscountLimit ? ` (up to ${inr(c.maxDiscountLimit)})` : '';
  const min = c.minPurchaseAmount > 0 ? ` on orders above ${inr(c.minPurchaseAmount)}` : '';
  return `${off}${cap}${min}`;
};

const TABS = ['Description', 'Fabric & care', 'Size chart', 'Returns'] as const;

function DeliveryCheck() {
  const [pin, setPin] = useState('');
  const [checked, setChecked] = useState('');
  const {data, error, isFetching} = useQuery({
    queryKey: ['delivery', checked],
    queryFn: () =>
      api.get<{standard: {by: string; freeAbove: number; feeBelow: number}; express: {by: string; fee: number}; cod: boolean; returns: string}>(
        `/store/delivery/${checked}`,
      ),
    enabled: checked.length === 6,
    retry: false,
  });
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink">Check delivery</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setChecked(pin.trim());
        }}
        className="flex"
      >
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          placeholder="Enter pincode"
          aria-label="Pincode"
          className="w-full min-w-0 flex-1 rounded-l border border-r-0 border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button className="shrink-0 rounded-r border border-brand px-4 text-xs font-semibold uppercase text-brand" disabled={pin.length !== 6 || isFetching}>
          Check
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-700">{errorMessage(error)}</p>}
      {data && (
        <ul className="mt-3 space-y-1 text-xs text-ink-soft">
          <li className="flex gap-1.5">
            <Check size={14} className="text-ok" /> Delivery by <strong className="text-ink">{data.standard.by}</strong> · free above {inr(data.standard.freeAbove)}
          </li>
          <li className="flex gap-1.5">
            <Check size={14} className="text-ok" /> Express by {data.express.by} for {inr(data.express.fee)}
          </li>
          <li className="flex gap-1.5">
            <Check size={14} className="text-ok" /> Cash on delivery available · {data.returns}
          </li>
        </ul>
      )}
    </div>
  );
}

function ProductPage() {
  const {id} = Route.useParams();
  const {data: p, isLoading, error, refetch} = useProduct(id);
  const {signedIn} = useAuth();
  const navigate = useNavigate();
  const add = useAddToCart();

  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Description');
  const [sizeError, setSizeError] = useState(false);
  // Photo picked from the thumbnails (null = the selected colour's photo)
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(null), [color, p?.id]);

  useEffect(() => {
    if (p) {
      // Start on the first colour that has stock
      const first = p.variants.find((v) => v.stock > 0) ?? p.variants[0];
      setColor(first?.color ?? '');
      setSize('');
      setQty(1);
    }
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const forColor = useMemo(() => p?.variants.filter((v) => v.color === color) ?? [], [p, color]);
  const chosen = forColor.find((v) => v.size === size);
  const shown = chosen ?? forColor[0];

  if (isLoading) return <Spinner />;
  if (error || !p) {
    return error && (error as {response?: {status?: number}}).response?.status === 404 ? (
      <Empty title="This product is not available" text="It may have been sold out or removed." action={<Link to="/products" className={btn.primary}>Keep shopping</Link>} />
    ) : (
      <ErrorBox message={errorMessage(error)} retry={() => refetch()} />
    );
  }

  const hex = p.colors.find((c) => c.name === color)?.hex ?? p.colors[0]?.hex;
  // When every colour on sale has its own photo, the product's own photos may show a
  // colour that is not sold (e.g. a sage sample sold only in red and black): show the
  // chosen colour's photo then. Otherwise: the colour's photo first, then the product photos.
  const everyColourHasPhoto = p.colors.length > 0 && p.colors.every((c) => p.variants.some((v) => v.color === c.name && v.image));
  const gallery = [
    ...new Set([shown?.image, ...(everyColourHasPhoto ? [] : p.images.map((img) => img.url))].filter((u): u is string => !!u)),
  ].slice(0, 6);
  const mainImage = picked && gallery.includes(picked) ? picked : gallery[0];
  const totalStock = p.variants.reduce((t, v) => t + v.stock, 0);

  const addToBag = () => {
    if (!signedIn) {
      navigate({to: '/signin', search: {redirect: `/product/${id}`}});
      return;
    }
    if (!chosen) {
      setSizeError(true);
      return;
    }
    add.mutate({variantId: chosen.id, quantity: qty});
  };

  const attrs = Object.entries(p.attributes).filter(([, v]) => v);
  const crumbs = [p.gender === 'MEN' ? 'Men' : p.gender === 'WOMEN' ? 'Women' : p.gender === 'UNISEX' ? null : 'Kids', p.subcategory].filter(Boolean) as string[];

  return (
    <div className="space-y-10">
      <nav className="text-xs text-ink-faint" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand">
          Home
        </Link>
        {crumbs.map((c) => (
          <span key={c}>
            {' / '}
            <Link to="/products" search={c === p.subcategory ? {subcategory: c} : {gender: c.toUpperCase() as 'WOMEN'}} className="hover:text-brand">
              {c}
            </Link>
          </span>
        ))}
        {' / '}
        <span className="text-ink-soft">{p.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Gallery */}
        <div className={`grid gap-3 ${gallery.length > 1 ? 'grid-cols-[52px_minmax(0,1fr)] sm:grid-cols-[64px_minmax(0,1fr)]' : ''}`}>
          {/* Thumbnails only when there is more than one photo; tap one to see it large */}
          {gallery.length > 1 && (
            <div className="space-y-2">
              {gallery.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPicked(url)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={url === mainImage}
                  className={`block aspect-[4/5] w-full overflow-hidden rounded border-2 transition ${url === mainImage ? 'border-brand' : 'border-line hover:border-ink-faint'}`}
                >
                  <ProductVisual image={url} hex={hex} name={`${p.name} view ${i + 1}`} iconSize={16} />
                </button>
              ))}
            </div>
          )}
          <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-line">
            <ProductVisual image={mainImage} hex={hex} name={p.name} iconSize={90} />
            <WishlistHeart productId={p.id} className="absolute right-3 top-3 !h-10 !w-10" />
          </div>
        </div>

        {/* Buy box */}
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{p.brand}</p>
            <h1 className="mt-1 font-serif text-3xl text-ink">
              {p.name}
              {color && p.colors.length > 1 && <span className="text-ink-soft"> – {color}</span>}
            </h1>
            {p.rating.count > 0 && (
              <a href="#reviews" className="mt-2 inline-flex items-center gap-2 py-1.5 text-xs text-ink-soft hover:text-brand">
                <span className="rounded bg-ok px-1.5 py-0.5 font-semibold text-white">{p.rating.avg.toFixed(1)} ★</span>
                {p.rating.count} rating{p.rating.count === 1 ? '' : 's'}
              </a>
            )}
          </div>

          <div>
            <Price price={shown?.price ?? p.price} mrp={shown?.mrp ?? p.mrp} size="lg" />
            <p className="mt-1 text-xs text-ink-faint">Inclusive of all taxes · sold by {p.shop.name}, {p.shop.city}</p>
          </div>

          {p.offers.length ? (
            <div className="rounded-md border border-line bg-white p-3 text-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider">Offers on this product</p>
              <ul className="space-y-1 text-ink-soft">
                {p.offers.map((c) => (
                  <li key={c.code}>
                    • {offerText(c)}: use code <strong className="text-ink">{c.code}</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-faint">Enter the code in your bag before you pay. One code per order.</p>
            </div>
          ) : null}

          {p.colors.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider">
                Colour: <span className="font-normal normal-case text-ink-soft">{color}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {p.colors.map((c) => {
                  // A photo of the garment in this colour, when the shop has one
                  const photo = p.variants.find((v) => v.color === c.name && v.image)?.image;
                  const on = c.name === color;
                  return (
                    <button
                      key={c.name}
                      onClick={() => {
                        setColor(c.name);
                        setSize('');
                      }}
                      aria-label={c.name}
                      aria-pressed={on}
                      title={c.name}
                      className={`relative overflow-hidden rounded border-2 transition ${photo ? 'h-16 w-12' : 'h-10 w-10'} ${on ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-ink-faint'}`}
                      style={{backgroundColor: c.hex ?? '#ddd'}}
                    >
                      {photo && <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      {photo && (
                        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border border-white shadow" style={{backgroundColor: c.hex ?? '#ddd'}} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider">Select size</p>
              {p.sizes.some((s) => SIZE_CHART[s]) && (
                <button onClick={() => setTab('Size chart')} className="tap text-[11px] font-semibold uppercase text-brand hover:underline">
                  Size chart
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {forColor.map((v) => (
                <button
                  key={v.id}
                  disabled={v.stock === 0}
                  onClick={() => {
                    setSize(v.size);
                    setSizeError(false);
                    setQty((q) => Math.min(q, v.stock));
                  }}
                  aria-pressed={v.size === size}
                  className={`min-w-12 rounded border px-3 py-2 text-sm ${
                    v.size === size ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'
                  } disabled:cursor-not-allowed disabled:text-ink-faint disabled:line-through`}
                >
                  {v.size}
                </button>
              ))}
            </div>
            {sizeError && <p className="mt-2 text-xs text-red-700">Please choose a size</p>}
            {chosen && chosen.stock <= 3 && <p className="mt-2 text-xs font-semibold text-gold">Only {chosen.stock} left in {chosen.size}</p>}
            {totalStock === 0 && <p className="mt-2 text-sm font-semibold text-red-700">Out of stock</p>}
          </div>

          <div className="flex gap-3">
            <div className="flex items-center rounded border border-line bg-white">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3" aria-label="Fewer">
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm" aria-live="polite">
                {qty}
              </span>
              <button onClick={() => setQty((q) => Math.min(chosen?.stock ?? 10, 10, q + 1))} className="p-3" aria-label="More">
                <Plus size={14} />
              </button>
            </div>
            <button onClick={addToBag} disabled={totalStock === 0 || add.isPending} className={`${btn.primary} flex-1`}>
              {add.isPending ? 'Adding…' : 'Add to bag'}
            </button>
          </div>
          {add.isSuccess && (
            <Link to="/bag" className="flex items-center justify-center gap-2 rounded border border-ok/30 bg-ok/5 py-2 text-sm text-ok">
              <Check size={15} /> Added · Go to bag
            </Link>
          )}

          <DeliveryCheck />
          <p className="flex items-center gap-2 text-xs text-ink-soft">
            <Truck size={14} /> Ships from {p.shop.city}
          </p>
        </div>
      </div>

      {/* Details tabs */}
      <section className="rounded-md border border-line bg-white">
        <div className="flex overflow-x-auto border-b border-line" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-ink-soft'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-5 text-sm text-ink-soft">
          {tab === 'Description' && (
            <div className="grid gap-6 md:grid-cols-2">
              <p className="leading-relaxed">{p.description}</p>
              {attrs.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {attrs.map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] uppercase tracking-wider text-ink-faint">{k.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className="text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
          {tab === 'Fabric & care' && (
            <p>
              {p.attributes.fabric ? `${p.attributes.fabric}. ` : ''}
              {p.careInstructions ?? 'Follow the care label on the garment.'}
            </p>
          )}
          {tab === 'Size chart' &&
            (p.sizes.some((s) => SIZE_CHART[s]) ? (
              <div className="overflow-x-auto">
                <table className="w-full max-w-md text-left text-sm">
                  <caption className="mb-2 text-left text-xs text-ink-faint">Body measurements in inches</caption>
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-faint">
                      <th className="py-2">Size</th>
                      <th>Bust / chest</th>
                      <th>Waist</th>
                      <th>Hip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.sizes
                      .filter((s) => SIZE_CHART[s])
                      .map((s) => (
                        <tr key={s} className="border-b border-line/60">
                          <td className="py-2 font-semibold text-ink">{s}</td>
                          {SIZE_CHART[s].map((n, i) => (
                            <td key={i}>{n}</td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Sizes for this item: {p.sizes.join(', ')}.</p>
            ))}
          {tab === 'Returns' && (
            <p>
              {p.returnEligible
                ? `Easy ${p.returnPeriodDays}-day returns and size exchange. Request a return from My orders once the order is delivered.`
                : 'This item cannot be returned.'}
            </p>
          )}
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="grid gap-6 rounded-md border border-line bg-white p-5 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <h2 className="font-serif text-2xl">Ratings & reviews</h2>
          {p.rating.count ? (
            <>
              <p className="mt-2 text-4xl font-semibold">
                {p.rating.avg.toFixed(1)} <span className="text-xl text-gold">★</span>
              </p>
              <p className="text-xs text-ink-faint">{p.rating.count} rating{p.rating.count === 1 ? '' : 's'}</p>
              <div className="mt-3 space-y-1">
                {p.rating.distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-2 text-xs">
                    <span className="w-6">{d.star}★</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded bg-canvas">
                      <span className="block h-full bg-brand" style={{width: `${(d.count / p.rating.count) * 100}%`}} />
                    </span>
                    <span className="w-5 text-right text-ink-faint">{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">No ratings yet.</p>
          )}
          {p.fit && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">How it fits</p>
              <div className="mt-2 flex h-2 overflow-hidden rounded bg-canvas" aria-hidden>
                <span className="bg-gold/70" style={{width: `${p.fit.small}%`}} />
                <span className="bg-ok" style={{width: `${p.fit.true}%`}} />
                <span className="bg-brand/70" style={{width: `${p.fit.large}%`}} />
              </div>
              <p className="mt-1.5 text-xs text-ink-soft">
                {p.fit.true >= 50 ? `${p.fit.true}% say true to size` : p.fit.small > p.fit.large ? `${p.fit.small}% say it runs small: consider a size up` : `${p.fit.large}% say it runs large: consider a size down`}
                <span className="text-ink-faint"> · from {p.fit.count} buyer{p.fit.count === 1 ? '' : 's'}</span>
              </p>
            </div>
          )}
          <p className="mt-4 text-xs text-ink-faint">Only verified buyers can review. Review your purchases from My reviews.</p>
        </div>
        <div className="divide-y divide-line">
          {p.reviews.length === 0 && <p className="text-sm text-ink-soft">Be the first to review this after your order arrives.</p>}
          {p.reviews.map((r) => (
            <article key={r.id} className="py-3 first:pt-0">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} />
                {r.title && <p className="text-sm font-semibold">{r.title}</p>}
              </div>
              {r.comment && <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>}
              {!!r.images?.length && (
                <div className="mt-2 flex gap-2">
                  {r.images.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt={`Photo from ${r.author}`} loading="lazy" className="h-16 w-16 rounded border border-line object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11px] text-ink-faint">
                {r.fit && <span className="mr-1 rounded-full bg-canvas px-2 py-0.5 text-ink-soft">{{SMALL: 'Runs small', TRUE: 'True to size', LARGE: 'Runs large'}[r.fit]}</span>}
                {r.author} · Verified buyer · {shortDate(r.createdAt)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {p.similar.length > 0 && (
        <section>
          <SectionTitle title="You may also like" />
          <ProductGrid items={p.similar.slice(0, 4)} />
        </section>
      )}
    </div>
  );
}
