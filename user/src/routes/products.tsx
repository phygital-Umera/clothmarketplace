import {ReactNode, useEffect, useState} from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {ChevronLeft, ChevronRight, SlidersHorizontal, X, SearchX} from 'lucide-react';
import {useProducts, type ListParams} from '@/lib/queries';
import {ProductGrid} from '@/components/ProductCard';
import {btn, Empty, ErrorBox, Spinner} from '@/components/ui';
import {errorMessage} from '@/lib/api';
import {inr} from '@/lib/format';

const SORTS = [
  {value: 'popular', label: 'Popularity'},
  {value: 'new', label: 'Newest first'},
  {value: 'price_asc', label: 'Price: low to high'},
  {value: 'price_desc', label: 'Price: high to low'},
  {value: 'discount', label: 'Biggest discount'},
  {value: 'rating', label: 'Top rated'},
];

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));
const bool = (v: unknown) => (v === true || v === 'true' ? true : undefined);

export const Route = createFileRoute('/products')({
  validateSearch: (s: Record<string, unknown>): ListParams => ({
    q: str(s.q),
    gender: ['WOMEN', 'MEN', 'KIDS'].includes(String(s.gender)) ? (s.gender as ListParams['gender']) : undefined,
    category: str(s.category),
    subcategory: str(s.subcategory),
    brand: str(s.brand),
    size: str(s.size),
    color: str(s.color),
    fabric: str(s.fabric),
    priceMin: num(s.priceMin),
    priceMax: num(s.priceMax),
    minDiscount: num(s.minDiscount),
    inStock: bool(s.inStock),
    newOnly: bool(s.newOnly),
    sort: SORTS.some((o) => o.value === s.sort) ? String(s.sort) : undefined,
    page: num(s.page),
  }),
  component: ProductsPage,
});

const list = (v?: string) => (v ? v.split(',').filter(Boolean) : []);
const toggleIn = (v: string | undefined, item: string) => {
  const cur = list(v);
  const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
  return next.length ? next.join(',') : undefined;
};

function Group({title, children}: {title: string; children: ReactNode}) {
  return (
    <fieldset className="border-b border-line py-4 last:border-0">
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({checked, onChange, children}: {checked: boolean; onChange: () => void; children: ReactNode}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink-soft hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-brand" />
      {children}
    </label>
  );
}

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({from: '/products'});
  const {data, isLoading, isFetching, error, refetch} = useProducts({...search, limit: 20});
  const [drawer, setDrawer] = useState(false);
  const [price, setPrice] = useState({min: search.priceMin?.toString() ?? '', max: search.priceMax?.toString() ?? ''});
  useEffect(() => setPrice({min: search.priceMin?.toString() ?? '', max: search.priceMax?.toString() ?? ''}), [search.priceMin, search.priceMax]);

  const set = (patch: Partial<ListParams>) =>
    navigate({search: (prev: ListParams) => ({...prev, ...patch, page: undefined}), resetScroll: false});

  const title = search.q
    ? `Results for “${search.q}”`
    : search.subcategory ??
      search.category ??
      (search.gender ? {WOMEN: 'Women', MEN: 'Men', KIDS: 'Kids'}[search.gender] : search.newOnly ? 'New arrivals' : search.minDiscount ? 'Offers' : 'All products');

  // Applied filters as removable chips
  const chips: {label: string; remove: Partial<ListParams>}[] = [
    ...list(search.subcategory).map((v) => ({label: v, remove: {subcategory: toggleIn(search.subcategory, v)}})),
    ...(search.q && search.category ? [{label: search.category, remove: {category: undefined}}] : []),
    ...list(search.brand).map((v) => ({label: v, remove: {brand: toggleIn(search.brand, v)}})),
    ...list(search.size).map((v) => ({label: `Size ${v}`, remove: {size: toggleIn(search.size, v)}})),
    ...list(search.color).map((v) => ({label: v, remove: {color: toggleIn(search.color, v)}})),
    ...list(search.fabric).map((v) => ({label: v, remove: {fabric: toggleIn(search.fabric, v)}})),
    ...(search.priceMin !== undefined || search.priceMax !== undefined
      ? [{label: `${inr(search.priceMin ?? 0)} – ${search.priceMax !== undefined ? inr(search.priceMax) : 'any'}`, remove: {priceMin: undefined, priceMax: undefined}}]
      : []),
    ...(search.minDiscount ? [{label: `${search.minDiscount}% off or more`, remove: {minDiscount: undefined}}] : []),
    ...(search.inStock ? [{label: 'In stock', remove: {inStock: undefined}}] : []),
  ];
  const clearAll = () =>
    navigate({search: {q: search.q, gender: search.gender, category: search.q ? undefined : search.category, sort: search.sort}});

  const f = data?.facets;
  const filters = f && (
    <div>
      <div className="flex items-center justify-between pb-2">
        <p className="font-serif text-lg">Filters</p>
        {chips.length > 0 && (
          <button onClick={clearAll} className="text-xs font-semibold text-brand hover:underline">
            Clear all
          </button>
        )}
      </div>
      {!search.q && !search.category && f.categories.length > 1 && (
        <Group title="Category">
          {f.categories.map((c) => (
            <button key={c.value} onClick={() => set({category: c.value})} className="flex w-full justify-between py-1 text-left text-sm text-ink-soft hover:text-brand">
              {c.value} <span className="text-ink-faint">{c.count}</span>
            </button>
          ))}
        </Group>
      )}
      {f.subcategories.length > 0 && (
        <Group title={search.category ? search.category : 'Type'}>
          {f.subcategories.map((c) => (
            <Check key={c.value} checked={list(search.subcategory).includes(c.value)} onChange={() => set({subcategory: toggleIn(search.subcategory, c.value)})}>
              {c.value} <span className="text-ink-faint">({c.count})</span>
            </Check>
          ))}
        </Group>
      )}
      <Group title="Price">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({priceMin: num(price.min), priceMax: num(price.max)});
          }}
        >
          <input value={price.min} onChange={(e) => setPrice((p) => ({...p, min: e.target.value}))} placeholder={`₹${f.price.min}`} inputMode="numeric" className="w-full rounded border border-line px-2 py-1.5 text-sm" aria-label="Minimum price" />
          <span className="text-ink-faint">–</span>
          <input value={price.max} onChange={(e) => setPrice((p) => ({...p, max: e.target.value}))} placeholder={`₹${f.price.max}`} inputMode="numeric" className="w-full rounded border border-line px-2 py-1.5 text-sm" aria-label="Maximum price" />
          <button className="rounded border border-line px-2 py-1.5 text-xs font-semibold hover:border-brand">Go</button>
        </form>
      </Group>
      {f.brands.length > 0 && (
        <Group title="Brand">
          {f.brands.map((b) => (
            <Check key={b.value} checked={list(search.brand).includes(b.value)} onChange={() => set({brand: toggleIn(search.brand, b.value)})}>
              {b.value} <span className="text-ink-faint">({b.count})</span>
            </Check>
          ))}
        </Group>
      )}
      {f.sizes.length > 0 && (
        <Group title="Size">
          <div className="flex flex-wrap gap-1.5">
            {f.sizes.map((s) => {
              const on = list(search.size).includes(s.value);
              return (
                <button
                  key={s.value}
                  onClick={() => set({size: toggleIn(search.size, s.value)})}
                  aria-pressed={on}
                  className={`min-w-10 rounded border px-2 py-1 text-xs ${on ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'}`}
                >
                  {s.value}
                </button>
              );
            })}
          </div>
        </Group>
      )}
      {f.colors.length > 0 && (
        <Group title="Colour">
          <div className="flex flex-wrap gap-2">
            {f.colors.map((c) => {
              const on = list(search.color).includes(c.value);
              return (
                <button
                  key={c.value}
                  onClick={() => set({color: toggleIn(search.color, c.value)})}
                  title={`${c.value} (${c.count})`}
                  aria-label={c.value}
                  aria-pressed={on}
                  className={`h-7 w-7 rounded-full border-2 ${on ? 'border-brand ring-2 ring-brand/30' : 'border-white shadow'}`}
                  style={{backgroundColor: c.hex ?? '#ccc'}}
                />
              );
            })}
          </div>
        </Group>
      )}
      {f.fabrics.length > 0 && (
        <Group title="Fabric">
          {f.fabrics.map((x) => (
            <Check key={x.value} checked={list(search.fabric).includes(x.value)} onChange={() => set({fabric: toggleIn(search.fabric, x.value)})}>
              {x.value} <span className="text-ink-faint">({x.count})</span>
            </Check>
          ))}
        </Group>
      )}
      <Group title="Discount">
        {[10, 20, 30].map((d) => (
          <label key={d} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink-soft">
            <input type="radio" name="discount" checked={search.minDiscount === d} onChange={() => set({minDiscount: d})} className="accent-brand" />
            {d}% and above
          </label>
        ))}
      </Group>
      <Group title="Availability">
        <Check checked={!!search.inStock} onChange={() => set({inStock: search.inStock ? undefined : true})}>
          In stock only
        </Check>
      </Group>
    </div>
  );

  return (
    <div>
      <nav className="mb-2 text-xs text-ink-faint" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand">
          Home
        </Link>
        {' / '}
        <span className="text-ink-soft">{title}</span>
      </nav>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-ink">{title}</h1>
          {data && <p className="text-sm text-ink-soft">{data.pagination.total} products</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDrawer(true)} className={`${btn.outline} !px-3 !py-2 lg:hidden`}>
            <SlidersHorizontal size={14} /> Filters{chips.length ? ` (${chips.length})` : ''}
          </button>
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <span className="hidden sm:inline">Sort by</span>
            <select value={search.sort ?? 'popular'} onChange={(e) => set({sort: e.target.value})} className="rounded border border-line bg-white px-2 py-2 text-sm text-ink">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-faint">Applied</span>
          {chips.map((c) => (
            <button key={c.label} onClick={() => set(c.remove)} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs hover:border-brand">
              {c.label} <X size={12} />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden self-start rounded-md border border-line bg-white p-4 lg:sticky lg:top-40 lg:block">{filters ?? <Spinner />}</aside>
        <div className={isFetching && !isLoading ? 'opacity-60 transition' : ''}>
          {isLoading ? (
            <Spinner />
          ) : error ? (
            <ErrorBox message={errorMessage(error)} retry={() => refetch()} />
          ) : !data!.items.length ? (
            <Empty
              icon={<SearchX size={28} />}
              title={search.q ? `No results for “${search.q}”` : 'No products match these filters'}
              text={search.q ? 'Check the spelling, try fewer words, or browse a category.' : 'Try removing a filter.'}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {chips.length > 0 && (
                    <button onClick={clearAll} className={btn.outline}>
                      Clear filters
                    </button>
                  )}
                  <Link to="/products" className={btn.primary}>
                    Browse all products
                  </Link>
                </div>
              }
            />
          ) : (
            <>
              <ProductGrid items={data!.items} cols="lg:grid-cols-4 xl:grid-cols-4" />
              {data!.pagination.pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3 text-sm">
                  <button
                    disabled={data!.pagination.page <= 1}
                    onClick={() => navigate({search: (p: ListParams) => ({...p, page: data!.pagination.page - 1})})}
                    className="rounded border border-line bg-white p-2 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    Page {data!.pagination.page} of {data!.pagination.pages}
                  </span>
                  <button
                    disabled={data!.pagination.page >= data!.pagination.pages}
                    onClick={() => navigate({search: (p: ListParams) => ({...p, page: data!.pagination.page + 1})})}
                    className="rounded border border-line bg-white p-2 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="Filters">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-full flex-col bg-white shadow-xl">
            <div className="flex-1 overflow-y-auto p-5">{filters}</div>
            <div className="border-t border-line p-4">
              <button onClick={() => setDrawer(false)} className={`${btn.primary} w-full`}>
                Show {data?.pagination.total ?? ''} products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
