import {ReactNode, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {Link, useRouterState} from '@tanstack/react-router';
import {
  Bell,
  ChevronRight,
  Heart,
  HelpCircle,
  Home,
  LayoutGrid,
  LogOut,
  MapPin,
  MoreHorizontal,
  Package,
  RotateCcw,
  ShoppingBag,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import {useAuth} from '@/lib/auth';
import {useCart, useUnreadCount, useWishlistIds} from '@/lib/queries';
import {NAV} from './Layout';

/** Pages where the bar would only get in the way (paying, the printable invoice) */
const HIDDEN_ON = ['/checkout', '/payment', '/order-placed', '/invoice', '/signin', '/signup', '/forgot-password', '/reset-password'];

const Badge = ({count}: {count?: number}) =>
  count ? (
    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
      {count > 9 ? '9+' : count}
    </span>
  ) : null;

function Tab({to, label, icon, active, count}: {to: string; label: string; icon: ReactNode; active: boolean; count?: number}) {
  return (
    <Link
      to={to}
      aria-label={`${label}${count ? ` (${count})` : ''}`}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10.5px] font-semibold tracking-wide transition ${active ? 'text-brand' : 'text-ink-soft'}`}
    >
      {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand" />}
      <span className="relative">
        {icon}
        <Badge count={count} />
      </span>
      {label}
    </Link>
  );
}

/** A tile in the More sheet */
function Tile({to, icon, label, count}: {to: string; icon: ReactNode; label: string; count?: number}) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-white px-1 py-3 text-center text-[11.5px] font-medium text-ink active:bg-canvas">
      <span className="relative text-brand">
        {icon}
        <Badge count={count} />
      </span>
      {label}
    </Link>
  );
}

/** Phone and tablet only: app-style menu fixed at the bottom, with a More sheet */
export default function MobileTabBar() {
  const {me, signedIn, signOut} = useAuth();
  const {data: cart} = useCart();
  const {data: wish} = useWishlistIds();
  const {data: unread} = useUnreadCount();
  const pathname = useRouterState({select: (s) => s.location.pathname});
  const [more, setMore] = useState(false);

  useEffect(() => setMore(false), [pathname]);
  // While the sheet is open: no page scrolling behind it, Escape closes it
  useEffect(() => {
    if (!more) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMore(false);
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [more]);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const is = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  const accountOpen = is('/account') && !is('/account/wishlist');
  const initials = (me?.fullname ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(42,34,32,0.06)] backdrop-blur lg:hidden print:hidden"
      >
        <div className="mx-auto flex h-14 max-w-lg">
          <Tab to="/" label="Home" icon={<Home size={20} strokeWidth={1.8} />} active={pathname === '/'} />
          <Tab to="/products" label="Shop" icon={<LayoutGrid size={20} strokeWidth={1.8} />} active={is('/products') || is('/product')} />
          <Tab to="/account/wishlist" label="Wishlist" icon={<Heart size={20} strokeWidth={1.8} />} active={is('/account/wishlist')} count={wish?.length} />
          <Tab to="/bag" label="Bag" icon={<ShoppingBag size={20} strokeWidth={1.8} />} active={is('/bag')} count={cart?.count} />
          <button
            type="button"
            onClick={() => setMore(true)}
            aria-haspopup="dialog"
            aria-expanded={more}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10.5px] font-semibold tracking-wide ${more || accountOpen || is('/help') ? 'text-brand' : 'text-ink-soft'}`}
          >
            {(accountOpen || is('/help')) && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand" />}
            <span className="relative">
              <MoreHorizontal size={20} strokeWidth={1.8} />
              <Badge count={signedIn ? unread?.unread : 0} />
            </span>
            More
          </button>
        </div>
      </nav>

      {more &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="More">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMore(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-canvas pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-canvas/95 px-4 pb-2 pt-2 backdrop-blur">
                <span className="mx-auto mb-1 block h-1 w-10 rounded-full bg-line" aria-hidden />
                <button onClick={() => setMore(false)} aria-label="Close" className="absolute right-3 top-2 rounded-full p-1.5 text-ink-soft hover:bg-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5 px-4">
                {/* Who is signed in */}
                {signedIn ? (
                  <Link to="/account" className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{initials || 'Me'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] text-ink-faint">Hello,</span>
                      <span className="block truncate font-semibold text-ink">{me?.fullname}</span>
                    </span>
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-brand">
                      My account <ChevronRight size={14} />
                    </span>
                  </Link>
                ) : (
                  <div className="rounded-xl border border-line bg-white p-4 text-center">
                    <p className="font-serif text-lg text-ink">Welcome to Cloth Pro</p>
                    <p className="mt-0.5 text-xs text-ink-soft">Sign in to track orders, save your wishlist and check out faster.</p>
                    <div className="mt-3 flex gap-2">
                      <Link to="/signin" className="flex-1 rounded bg-brand py-2.5 text-xs font-bold uppercase tracking-wider text-white">
                        Sign in
                      </Link>
                      <Link to="/signup" className="flex-1 rounded border border-brand py-2.5 text-xs font-bold uppercase tracking-wider text-brand">
                        Create account
                      </Link>
                    </div>
                  </div>
                )}

                {/* Account shortcuts */}
                {signedIn && (
                  <section>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Your account</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Tile to="/account/orders" icon={<Package size={20} />} label="Orders" />
                      <Tile to="/account/returns" icon={<RotateCcw size={20} />} label="Returns" />
                      <Tile to="/account/notifications" icon={<Bell size={20} />} label="Alerts" count={unread?.unread} />
                      <Tile to="/account/reviews" icon={<Star size={20} />} label="Reviews" />
                      <Tile to="/account/addresses" icon={<MapPin size={20} />} label="Addresses" />
                      <Tile to="/account/profile" icon={<UserRound size={20} />} label="Profile" />
                    </div>
                  </section>
                )}

                {/* Shop by */}
                <section>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Shop by</p>
                  <div className="flex flex-wrap gap-2">
                    {NAV.map((n) => (
                      <Link
                        key={n.label}
                        to={n.to}
                        search={n.search}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${n.accent ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-ink'}`}
                      >
                        {n.label}
                      </Link>
                    ))}
                  </div>
                </section>

                {/* Help and sign out */}
                <section className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                  <Link to="/help" className="flex items-center gap-3 px-3.5 py-3 text-sm text-ink">
                    <HelpCircle size={18} className="text-brand" />
                    <span className="flex-1">Help & returns</span>
                    <ChevronRight size={16} className="text-ink-faint" />
                  </Link>
                  {signedIn && (
                    <button
                      type="button"
                      onClick={() => {
                        setMore(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm text-ink"
                    >
                      <LogOut size={18} className="text-ink-soft" />
                      <span className="flex-1">Sign out</span>
                    </button>
                  )}
                </section>

              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
