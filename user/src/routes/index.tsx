import {useState} from 'react';
import {createFileRoute, Link} from '@tanstack/react-router';
import {useHome} from '@/lib/queries';
import {inr} from '@/lib/format';
import {ProductGrid} from '@/components/ProductCard';
import {btn, ErrorBox, ProductVisual, SectionTitle, Spinner} from '@/components/ui';
import {errorMessage} from '@/lib/api';
import type {Coupon} from '@/lib/types';

export const Route = createFileRoute('/')({component: HomePage});

const CAT_COLORS = ['#EBC9D2', '#CFD6EA', '#F2DCB8', '#D8B3A3', '#D9E2CF', '#E7E1D6', '#C9DCE3', '#E9D4C3'];

const couponTitle = (c: Coupon) =>
  c.name ?? (c.type === 'PERCENTAGE' ? `${c.discountValue}% off` : `${inr(c.discountValue)} off`);

function HomePage() {
  const {data, isLoading, error, refetch} = useHome();
  const [tab, setTab] = useState<'women' | 'men' | 'kids'>('women');

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} retry={() => refetch()} />;

  const hero = data.newArrivals.slice(0, 3);
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="grid items-center gap-6 overflow-hidden rounded-lg bg-[#EADFD6] p-6 md:grid-cols-2 md:p-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">Festive edit · new styles weekly</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">Dressed for the season, delivered to your door</h1>
          <p className="mt-3 max-w-md text-sm text-ink-soft">
            Kurtas, sarees and everyday wear from local stores
            {data.cities.length ? ` in ${data.cities.join(', ')}` : ''}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/products" search={{category: 'Ethnic'}} className={btn.primary}>
              Shop the edit
            </Link>
            <Link to="/products" search={{newOnly: true, sort: 'new'}} className={btn.outline}>
              New arrivals
            </Link>
          </div>
        </div>
        {hero.length > 0 && (
          <div className="grid h-64 grid-cols-2 grid-rows-2 gap-3 sm:h-72">
            {hero.map((p, i) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{id: p.slug ?? p.id}}
                className={`overflow-hidden rounded-md ${i === 0 ? 'row-span-2' : ''}`}
                aria-label={p.name}
              >
                <ProductVisual image={p.image} hex={p.colors[0]?.hex} name={p.name} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Shop by category */}
      <section>
        <SectionTitle title="Shop by category" />
        <div className="no-scrollbar flex gap-5 overflow-x-auto pb-2">
          {data.categories.map((c, i) => (
            <Link key={c.name} to="/products" search={{category: c.name}} className="group w-28 shrink-0 text-center">
              <span
                className="mx-auto block h-24 w-24 rounded-full transition group-hover:scale-105 sm:h-28 sm:w-28"
                style={{backgroundColor: CAT_COLORS[i % CAT_COLORS.length]}}
              />
              <span className="mt-2 block text-sm font-medium text-ink">{c.name}</span>
              <span className="text-[11px] text-ink-faint">{c.count} styles</span>
            </Link>
          ))}
          {data.under999 > 0 && (
            <Link to="/products" search={{priceMax: 999, inStock: true}} className="group w-28 shrink-0 text-center">
              <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#E7E1D6] font-serif text-lg text-brand transition group-hover:scale-105 sm:h-28 sm:w-28">
                ₹999
              </span>
              <span className="mt-2 block text-sm font-medium text-ink">Under ₹999</span>
              <span className="text-[11px] text-ink-faint">{data.under999} styles</span>
            </Link>
          )}
        </div>
      </section>

      {/* New arrivals */}
      <section>
        <SectionTitle
          title="New arrivals"
          sub="Fresh in from our stores this week"
          action={
            <Link to="/products" search={{newOnly: true, sort: 'new'}} className={btn.ghost}>
              View all
            </Link>
          }
        />
        <ProductGrid items={data.newArrivals} />
      </section>

      {/* Coupons */}
      {data.coupons.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {data.coupons.map((c, i) => (
            <div key={c.code} className={`rounded-lg p-6 ${i === 0 ? 'bg-brand-dark text-white' : 'bg-[#D7E1EC] text-ink'}`}>
              <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">{c.description ?? 'Offer'}</p>
              <p className="mt-1 font-serif text-2xl">{couponTitle(c)}</p>
              <p className="mt-2 text-sm opacity-90">
                Code <strong className="tracking-wider">{c.code}</strong>
                {c.minPurchaseAmount > 0 && ` · min ${inr(c.minPurchaseAmount)}`}
                {c.maxDiscountLimit ? ` · max ${inr(c.maxDiscountLimit)}` : ''}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Trending */}
      <section>
        <SectionTitle
          title="Trending now"
          sub="Most bought in our stores this month"
          action={
            <div className="flex gap-1" role="tablist">
              {(['women', 'men', 'kids'] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wider ${tab === t ? 'bg-brand text-white' : 'text-ink-soft hover:bg-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          }
        />
        {data.trending[tab].length ? (
          <ProductGrid items={data.trending[tab]} />
        ) : (
          <p className="py-10 text-center text-sm text-ink-soft">Nothing here yet.</p>
        )}
      </section>
    </div>
  );
}
