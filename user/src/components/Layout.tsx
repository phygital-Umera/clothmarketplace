import {ReactNode, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Link, useNavigate, useRouterState} from '@tanstack/react-router';
import {Bell, Heart, Menu, Search, ShoppingBag, User, X} from 'lucide-react';
import {useDebounceValue} from 'usehooks-ts';
import {useAuth} from '@/lib/auth';
import {useCart, useSuggest, useUnreadCount, useWishlistIds} from '@/lib/queries';
import {inr} from '@/lib/format';
import {ProductVisual} from './ui';
import MobileTabBar from './MobileTabBar';

export const NAV: {label: string; to: string; search: Record<string, string | boolean>; accent?: boolean}[] = [
  {label: 'Women', to: '/products', search: {gender: 'WOMEN'}},
  {label: 'Men', to: '/products', search: {gender: 'MEN'}},
  {label: 'Kids', to: '/products', search: {gender: 'KIDS'}},
  {label: 'Ethnic', to: '/products', search: {category: 'Ethnic'}},
  {label: 'Accessories', to: '/products', search: {category: 'Accessories'}},
  {label: 'New arrivals', to: '/products', search: {newOnly: true, sort: 'new'}},
  {label: 'Offers', to: '/products', search: {minDiscount: '20', sort: 'discount'}, accent: true},
];

const RECENT_KEY = 'clothpro.recentSearches';
const recent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[];
  } catch {
    return [];
  }
};
const remember = (q: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...recent().filter((x) => x !== q)].slice(0, 5)));
  } catch {
    /* storage off: nothing to remember */
  }
};

function SearchBox() {
  const navigate = useNavigate();
  const currentQ = useRouterState({select: (s) => (s.location.search as {q?: string}).q ?? ''});
  const [q, setQ] = useState(currentQ);
  const [open, setOpen] = useState(false);
  const [debounced] = useDebounceValue(q.trim(), 250);
  const {data} = useSuggest(debounced);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setQ(currentQ), [currentQ]);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    remember(t);
    setOpen(false);
    navigate({to: '/products', search: {q: t}});
  };

  const recents = recent();
  return (
    <div ref={box} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex"
        role="search"
      >
        <label className="relative flex-1">
          <span className="sr-only">Search products</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
            placeholder="Search kurtas, sarees, jeans, brands…"
            className="w-full rounded-l border border-r-0 border-line bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
          />
        </label>
        <button type="submit" className="rounded-r bg-brand px-4 text-xs font-semibold uppercase tracking-wider text-white hover:bg-brand-dark sm:px-5">
          Search
        </button>
      </form>
      {open && (debounced.length >= 2 ? !!data : recents.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-md border border-line bg-white p-3 shadow-lg">
          {debounced.length >= 2 && data ? (
            <>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">While typing “{debounced}”</p>
              {data.suggestions.length === 0 && <p className="py-2 text-sm text-ink-soft">No matches yet. Press Search to look everywhere.</p>}
              {data.suggestions.map((s) => (
                <button key={s.where} onClick={() => go(debounced)} className="flex w-full justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-canvas">
                  <span>
                    {s.text} <span className="text-ink-faint">in {s.where}</span>
                  </span>
                  <span className="text-xs text-ink-faint">{s.count}</span>
                </button>
              ))}
              {data.products.map((p) => (
                <Link
                  key={p.id}
                  to="/product/$id"
                  params={{id: p.slug ?? p.id}}
                  onClick={() => setOpen(false)}
                  className="mt-1 flex items-center gap-3 rounded px-2 py-1.5 hover:bg-canvas"
                >
                  <span className="h-10 w-8 shrink-0 overflow-hidden rounded-sm">
                    <ProductVisual image={p.image} hex={p.colors[0]?.hex} name={p.name} iconSize={14} />
                  </span>
                  <span className="flex-1 truncate text-sm">{p.name}</span>
                  <span className="text-sm font-semibold">{inr(p.price)}</span>
                </Link>
              ))}
            </>
          ) : (
            <>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Recent</p>
              <div className="flex flex-wrap gap-2">
                {recents.map((r) => (
                  <button key={r} onClick={() => go(r)} className="rounded-full border border-line px-3 py-1 text-xs hover:border-brand">
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CountIcon({to, icon, count, label}: {to: string; icon: ReactNode; count?: number; label: string}) {
  return (
    <Link to={to} className="relative p-1.5 text-ink hover:text-brand" aria-label={`${label}${count ? ` (${count})` : ''}`}>
      {icon}
      {!!count && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}

function Header() {
  const {me, signedIn} = useAuth();
  const {data: cart} = useCart();
  const {data: wish} = useWishlistIds();
  const {data: unread} = useUnreadCount();
  const [menu, setMenu] = useState(false);
  const pathname = useRouterState({select: (s) => s.location.pathname});
  useEffect(() => setMenu(false), [pathname]);
  // While the menu is open: no page scrolling behind it, Escape closes it
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [menu]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur print:hidden">
      {/* Desktop only: on phones it took two lines above every page */}
      <div className="hidden bg-brand px-4 py-1.5 text-center text-[11px] font-medium text-white lg:block">
        Free delivery above ₹999 · Easy 7-day returns · Cash on delivery available
      </div>
      <div className="mx-auto flex max-w-page items-center gap-3 px-4 py-3 sm:gap-6">
        <button className="p-1 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <Link to="/" className="shrink-0 font-serif text-2xl text-brand">
          Cloth Pro
        </Link>
        <div className="hidden flex-1 md:block">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <Link to={signedIn ? '/account/orders' : '/signin'} className="flex items-center gap-1.5 p-1.5 text-sm text-ink hover:text-brand">
            <User size={18} />
            <span className="hidden max-w-24 truncate sm:inline">{signedIn ? me!.fullname.split(' ')[0] : 'Sign in'}</span>
          </Link>
          {signedIn && <CountIcon to="/account/notifications" icon={<Bell size={18} />} count={unread?.unread} label="Notifications" />}
          <CountIcon to="/account/wishlist" icon={<Heart size={18} />} count={wish?.length} label="Wishlist" />
          <CountIcon to="/bag" icon={<ShoppingBag size={18} />} count={cart?.count} label="Bag" />
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>
      <nav className="mx-auto hidden max-w-page gap-6 px-4 pb-2.5 lg:flex" aria-label="Categories">
        {NAV.map((n) => (
          <Link
            key={n.label}
            to={n.to}
            search={n.search}
            className={`text-xs font-semibold uppercase tracking-wider hover:text-brand ${n.accent ? 'text-brand' : 'text-ink'}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Rendered on <body>: the header's blur would otherwise clip the menu to the header */}
      {menu &&
        createPortal(
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="Menu">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[85vw] max-w-xs flex-col overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif text-xl text-brand">Cloth Pro</span>
              <button onClick={() => setMenu(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map((n) => (
                <Link key={n.label} to={n.to} search={n.search} className="block rounded px-2 py-2.5 text-sm font-medium hover:bg-canvas">
                  {n.label}
                </Link>
              ))}
              <hr className="my-3 border-line" />
              {signedIn ? (
                [
                  ['/account', 'My account'],
                  ['/account/orders', 'My orders'],
                  ['/account/wishlist', 'Wishlist'],
                  ['/account/notifications', 'Notifications'],
                ].map(([to, text]) => (
                  <Link key={to} to={to} className="block rounded px-2 py-2.5 text-sm hover:bg-canvas">
                    {text}
                  </Link>
                ))
              ) : (
                <Link to="/signin" className="block rounded px-2 py-2.5 text-sm font-semibold text-brand hover:bg-canvas">
                  Sign in / Create account
                </Link>
              )}
              <Link to="/help" className="block rounded px-2 py-2.5 text-sm hover:bg-canvas">
                Help & returns
              </Link>
            </nav>
          </div>
        </div>,
          document.body,
        )}
    </header>
  );
}

function Footer() {
  const cols: {title: string; links: {label: string; to: string; search?: Record<string, string>}[]}[] = [
    {
      title: 'Shop',
      links: [
        {label: 'Women', to: '/products', search: {gender: 'WOMEN'}},
        {label: 'Men', to: '/products', search: {gender: 'MEN'}},
        {label: 'Kids', to: '/products', search: {gender: 'KIDS'}},
        {label: 'Ethnic', to: '/products', search: {category: 'Ethnic'}},
      ],
    },
    {
      title: 'Account',
      links: [
        {label: 'My orders', to: '/account/orders'},
        {label: 'Wishlist', to: '/account/wishlist'},
        {label: 'Addresses', to: '/account/addresses'},
        {label: 'Help & returns', to: '/help'},
      ],
    },
  ];
  return (
    <footer className="mt-16 bg-brand-dark pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-white/80 lg:pb-0 print:hidden">
      <div className="mx-auto grid max-w-page grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-1">
          <p className="font-serif text-2xl text-white">Cloth Pro</p>
          <p className="mt-2 text-sm">Clothing from trusted local brands and stores, delivered to your door.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">{c.title}</p>
            <ul className="space-y-1.5 text-sm">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} search={l.search} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} Cloth Pro</p>
    </footer>
  );
}

export default function Layout({children}: {children: ReactNode}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink print:bg-white">
      <Header />
      <main className="mx-auto w-full max-w-page flex-1 px-4 py-6 print:max-w-none print:p-0">{children}</main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}
