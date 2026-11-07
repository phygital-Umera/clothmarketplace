import {createFileRoute, Link, Outlet, useNavigate} from '@tanstack/react-router';
import {Bell, Heart, HelpCircle, LayoutGrid, LogOut, MapPin, Package, RotateCcw, Star, User} from 'lucide-react';
import {useAuth} from '@/lib/auth';
import {useUnreadCount} from '@/lib/queries';
import {RequireAuth} from '@/components/checkout';

export const Route = createFileRoute('/account')({
  component: () => (
    <RequireAuth>
      <AccountLayout />
    </RequireAuth>
  ),
});

const LINKS = [
  {to: '/account', label: 'Overview', icon: LayoutGrid, exact: true},
  {to: '/account/orders', label: 'My orders', icon: Package},
  {to: '/account/returns', label: 'Returns & refunds', icon: RotateCcw},
  {to: '/account/notifications', label: 'Notifications', icon: Bell},
  {to: '/account/wishlist', label: 'Wishlist', icon: Heart},
  {to: '/account/reviews', label: 'Reviews', icon: Star},
  {to: '/account/profile', label: 'My profile', icon: User},
  {to: '/account/addresses', label: 'Addresses', icon: MapPin},
  {to: '/help', label: 'Help & support', icon: HelpCircle},
] as const;

export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

function AccountLayout() {
  const {me, signOut} = useAuth();
  const {data: unread} = useUnreadCount();
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="min-w-0 self-start rounded-lg border border-line bg-white p-4 lg:sticky lg:top-40">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{initialsOf(me?.fullname)}</span>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-faint">Hello,</p>
            <p className="truncate text-sm font-semibold">{me?.fullname}</p>
          </div>
        </div>
        <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:px-0" aria-label="My account">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{exact: 'exact' in l}}
              className="flex shrink-0 items-center gap-2.5 rounded px-3 py-2 text-sm text-ink-soft hover:bg-canvas hover:text-ink"
              activeProps={{className: '!bg-brand-soft !text-brand font-semibold'}}
            >
              <l.icon size={16} /> {l.label}
              {l.to === '/account/notifications' && !!unread?.unread && (
                <span className="ml-auto rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">{unread.unread}</span>
              )}
            </Link>
          ))}
          <button
            onClick={async () => {
              // Leave the account pages first, so they don't send you to Sign in
              await navigate({to: '/'});
              signOut();
            }}
            className="flex shrink-0 items-center gap-2.5 rounded px-3 py-2 text-left text-sm text-ink-soft hover:bg-canvas hover:text-red-700"
          >
            <LogOut size={16} /> Log out
          </button>
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
