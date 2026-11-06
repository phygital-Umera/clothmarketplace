import {Link} from '@tanstack/react-router';
import {KeyRound} from 'lucide-react';
import useCurrentUser from '@/hooks/useCurrentUser';
import {SHOP_MODULES, levelOf, type ShopModule} from '@/lib/shopModules';

/** The first screen of each module */
const MODULE_HOME: Record<ShopModule, {to: string; label: string}[]> = {
  dashboard: [{to: '/shop-admin/dashboard', label: 'Shop dashboard'}],
  billing: [
    {to: '/shop-admin/new-bill', label: 'New bill (POS)'},
    {to: '/shop-admin/sales-bills', label: 'Sales bills'},
    {to: '/shop-admin/sales-returns', label: 'Sales returns'},
  ],
  customers: [
    {to: '/shop-admin/customers', label: 'Customers'},
    {to: '/shop-admin/credit', label: 'Credit / udhaar'},
  ],
  purchase: [
    {to: '/shop-admin/purchase-bills', label: 'Purchase bills'},
    {to: '/shop-admin/purchase-return', label: 'Purchase return'},
    {to: '/shop-admin/suppliers', label: 'Suppliers'},
  ],
  products: [{to: '/shop-admin/products', label: 'Products'}],
  stock: [
    {to: '/shop-admin/inventory', label: 'Stock'},
    {to: '/shop-admin/stock-adjustment', label: 'Adjustment'},
    {to: '/shop-admin/stock-transfer', label: 'Transfer'},
    {to: '/shop-admin/barcode-labels', label: 'Barcode labels'},
  ],
  accounts: [
    {to: '/shop-admin/cash-book', label: 'Cash book'},
    {to: '/shop-admin/expenses', label: 'Expenses'},
  ],
  reports: [{to: '/shop-admin/reports', label: 'Profit & loss'}],
  masters: [
    {to: '/shop-admin/categories', label: 'Categories'},
    {to: '/shop-admin/sizes', label: 'Sizes'},
    {to: '/shop-admin/colors', label: 'Colors'},
  ],
};

/** Employee home: who they are, where they work and what they can open */
export default function EmployeeHomePage() {
  const {data: me, isLoading} = useCurrentUser();
  const modules = SHOP_MODULES.map((m) => ({...m, level: levelOf(me?.permissions, m.key)})).filter(
    (m) => m.level !== 'none',
  );

  const details: [string, string | null | undefined][] = [
    ['Employee ID', me?.employeeCode],
    ['Shop', me?.shop?.name],
    ['Branch', me?.branch?.name],
    ['Mobile', me ? `+91 ${me.phoneNumber}` : null],
    ['Email', me?.email],
    [
      'Last sign-in',
      me?.lastLoginAt
        ? new Date(me.lastLoginAt).toLocaleString('en-IN', {dateStyle: 'medium', timeStyle: 'short'})
        : null,
    ],
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label-caps uppercase tracking-wider text-outline">My work</p>
        <h1 className="font-serif text-headline-md text-burgundy-deep">
          {isLoading ? '…' : `Hello, ${me?.fullname.split(' ')[0] ?? ''}`}
        </h1>
        <p className="text-body-sm text-on-surface-variant">
          {me?.shop ? `You work in ${me.shop.name}.` : 'You are not linked to a shop yet. Ask your shop admin.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="panel space-y-3 p-5 lg:col-span-2">
          <h2 className="font-serif text-lg text-burgundy-deep">What you can use</h2>
          {!isLoading && !modules.length && (
            <p className="text-body-sm text-on-surface-variant">
              Your shop admin hasn't given you access to anything yet. Ask them to set your access
              on the Employees page.
            </p>
          )}
          <ul className="divide-y divide-ivory-200">
            {modules.map((m) => (
              <li key={m.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-body-md font-medium text-espresso">
                    {m.label}{' '}
                    <span
                      className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        m.level === 'edit' ? 'bg-burgundy-deep/10 text-burgundy-deep' : 'bg-ivory-200 text-on-surface-variant'
                      }`}
                    >
                      {m.level === 'edit' ? 'View & edit' : 'View only'}
                    </span>
                  </p>
                  <p className="text-[11px] text-on-surface-variant">{m.hint}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MODULE_HOME[m.key]
                    .filter((l) => m.level === 'edit' || l.to !== '/shop-admin/new-bill')
                    .map((l) => (
                      <Link key={l.to} to={l.to} className="btn-ghost !px-2.5 !py-1 text-xs">
                        {l.label}
                      </Link>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="mb-2 font-serif text-lg text-burgundy-deep">My details</h2>
            <dl className="divide-y divide-ivory-200 text-body-sm">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2">
                  <dt className="text-on-surface-variant">{k}</dt>
                  <dd className="truncate text-right font-medium text-espresso">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Link to="/change-password" className="panel flex items-center gap-3 p-4 hover:border-burgundy/40">
            <KeyRound size={18} className="text-burgundy" />
            <span className="text-body-sm font-medium text-espresso">Change my password</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
