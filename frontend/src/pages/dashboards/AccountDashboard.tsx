import {useState} from 'react';
import {PageHeader} from '@/components/ui';
import useCurrentUser from '@/hooks/useCurrentUser';
import {roleConfig} from '@/lib/roles';
import {Link} from '@tanstack/react-router';
import {ReactNode} from 'react';
import MyOrdersPage from '@/pages/customer/MyOrdersPage';
import {ShoppingBag, User as UserIcon} from 'lucide-react';

const Row = ({label, children}: {label: string; children: ReactNode}) => (
  <div className="grid grid-cols-[8rem_1fr] gap-3 py-2">
    <dt className="text-label-caps uppercase text-outline">{label}</dt>
    <dd className="break-words text-body-sm text-espresso">{children}</dd>
  </div>
);

type AccountDashboardProps = {
  title: string;
  /** Shown while this role's own modules are not built yet */
  note?: string;
};

/**
 * Signed-in user's own details from GET /users/me. Used as the customer
 * account page and as the employee dashboard.
 */
const AccountDashboard = ({title, note}: AccountDashboardProps) => {
  const {data: me} = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');

  if (!me) return null;

  const isCustomer = me.role === 'USER';

  return (
    <>
      <PageHeader compact breadcrumbs={[{label: title}]} title={me.fullname} />

      {note && (
        <p className="mb-4 max-w-xl border border-hairline bg-ivory-100 px-4 py-3 text-body-sm text-on-surface-variant">
          {note}
        </p>
      )}

      {isCustomer ? (
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-ivory-300 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === 'orders'
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'bg-ivory-100 text-espresso hover:bg-ivory-200'
              }`}
            >
              <ShoppingBag size={14} /> My Orders & Shipments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === 'profile'
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'bg-ivory-100 text-espresso hover:bg-ivory-200'
              }`}
            >
              <UserIcon size={14} /> Profile & Settings
            </button>
          </div>

          {activeTab === 'orders' ? (
            <MyOrdersPage />
          ) : (
            <section className="panel max-w-xl p-4 md:p-5">
              <h2 className="mb-1 border-b border-ivory-300 pb-1.5 text-label-caps uppercase text-burgundy">
                Account Profile
              </h2>
              <dl className="divide-y divide-ivory-200">
                <Row label="Name">{me.fullname}</Row>
                <Row label="Email">{me.email ?? '–'}</Row>
                <Row label="Phone">+91 {me.phoneNumber}</Row>
                <Row label="Account">{roleConfig(me.role)?.label}</Row>
              </dl>
              <Link to="/change-password" className="btn-ghost mt-4">
                Change password
              </Link>
            </section>
          )}
        </div>
      ) : (
        <section className="panel max-w-xl p-4 md:p-5">
          <h2 className="mb-1 border-b border-ivory-300 pb-1.5 text-label-caps uppercase text-burgundy">
            Account
          </h2>
          <dl className="divide-y divide-ivory-200">
            <Row label="Name">{me.fullname}</Row>
            <Row label="Email">{me.email ?? '–'}</Row>
            <Row label="Phone">+91 {me.phoneNumber}</Row>
            <Row label="Account">{roleConfig(me.role)?.label}</Row>
            {me.company && (
              <Row label="Company">
                {me.company.name} ({me.company.code})
              </Row>
            )}
            {me.branch && (
              <Row label="Branch">
                {me.branch.name} ({me.branch.code})
              </Row>
            )}
            {me.shop && (
              <Row label="Shop">
                {me.shop.name} ({me.shop.code})
              </Row>
            )}
          </dl>
          <Link to="/change-password" className="btn-ghost mt-4">
            Change password
          </Link>
        </section>
      )}
    </>
  );
};

export default AccountDashboard;
