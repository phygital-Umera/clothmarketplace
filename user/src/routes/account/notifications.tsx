import {createFileRoute, useNavigate} from '@tanstack/react-router';
import {Bell, CheckCheck, CreditCard, Package, RotateCcw, Tag, User} from 'lucide-react';
import {NotificationTab, useMarkRead, useNotifications} from '@/lib/queries';
import type {Notification, NotificationType} from '@/lib/types';
import {btn, Empty, ErrorBox, Spinner} from '@/components/ui';
import {card, PageHead, Tabs} from '@/components/account';

const TABS: {key: NotificationTab; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'unread', label: 'Unread'},
  {key: 'orders', label: 'Orders'},
  {key: 'offers', label: 'Offers'},
  {key: 'account', label: 'Account'},
];

export const Route = createFileRoute('/account/notifications')({
  validateSearch: (s: Record<string, unknown>): {tab?: NotificationTab} => ({
    tab: TABS.some((t) => t.key === s.tab) && s.tab !== 'all' ? (s.tab as NotificationTab) : undefined,
  }),
  component: NotificationsPage,
});

const ICON: Record<NotificationType, {icon: typeof Bell; cls: string}> = {
  ORDER: {icon: Package, cls: 'bg-brand-soft text-brand'},
  PAYMENT: {icon: CreditCard, cls: 'bg-ok/10 text-ok'},
  RETURN: {icon: RotateCcw, cls: 'bg-gold/15 text-[#8A6420]'},
  OFFER: {icon: Tag, cls: 'bg-[#FCE8EC] text-[#B4234A]'},
  ACCOUNT: {icon: User, cls: 'bg-ink/5 text-ink-soft'},
};

const dayOf = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? 'This week' : 'Earlier';
};
const timeOf = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'});
};

function NotificationsPage() {
  const {tab = 'all'} = Route.useSearch();
  const navigate = useNavigate();
  const {data, isLoading, error, refetch} = useNotifications(tab);
  const mark = useMarkRead();

  const open = (n: Notification) => {
    if (!n.readAt) mark.mutate(n.id);
    if (n.link) navigate({href: n.link});
  };

  const groups: [string, Notification[]][] = [];
  for (const n of data?.items ?? []) {
    const day = dayOf(n.createdAt);
    const g = groups.find(([d]) => d === day);
    if (g) g[1].push(n);
    else groups.push([day, [n]]);
  }

  return (
    <div>
      <PageHead
        title="Notifications"
        sub={data ? (data.unread ? `${data.unread} unread` : 'You are all caught up') : undefined}
        action={
          !!data?.unread && (
            <button onClick={() => mark.mutate('all')} className={btn.outline} disabled={mark.isPending}>
              <CheckCheck size={14} /> Mark all as read
            </button>
          )
        }
      />
      <Tabs
        label="Notification type"
        tabs={TABS.map((t) => ({...t, count: t.key === 'unread' ? data?.unread : undefined}))}
        value={tab}
        onChange={(t) => navigate({to: '/account/notifications', search: {tab: t === 'all' ? undefined : t}})}
      />
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message="Could not load notifications." retry={refetch} />
      ) : !groups.length ? (
        <Empty icon={<Bell size={28} />} title={tab === 'unread' ? 'No unread notifications' : 'Nothing here yet'} text="Order updates, refunds and offers will show up here." />
      ) : (
        <div className="space-y-5">
          {groups.map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{day}</h2>
              <ul className={`${card} divide-y divide-line overflow-hidden`}>
                {items.map((n) => {
                  const I = ICON[n.type] ?? ICON.ACCOUNT;
                  return (
                    <li key={n.id}>
                      <button onClick={() => open(n)} className={`flex w-full gap-3 px-4 py-3.5 text-left transition hover:bg-canvas ${n.readAt ? '' : 'bg-brand-soft/40'}`}>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${I.cls}`}>
                          <I.icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className={`text-sm ${n.readAt ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
                            <span className="shrink-0 text-[11px] text-ink-faint">{timeOf(n.createdAt)}</span>
                          </span>
                          <span className="mt-0.5 block text-sm text-ink-soft">{n.body}</span>
                        </span>
                        {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
