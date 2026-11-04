import {useAuthContext} from '@/context/AuthContext';
import useCurrentUser from '@/hooks/useCurrentUser';
import usePermissions from '@/hooks/usePermissions';
import {SidebarProps} from '@/types';
import {Link} from '@tanstack/react-router';
import {roleConfig, Role, ROLES} from '@/lib/roles';
import {
  ArrowLeftRight,
  BarChart3,
  BookUser,
  Building2,
  CreditCard,
  FilePlus2,
  Percent,
  Tag,
  Truck,
  Undo2,
  UserCheck,
  UserCog,
  Wallet,
  Boxes,

  FileInput,
  FileOutput,
  Layers,
  Palette,
  RotateCcw,
  Ruler,
  Tags,
  TicketPercent,
  KeyRound,
  LayoutDashboard,
  Monitor,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import {ReactNode, useEffect} from 'react';

type NavItem = {label: string; to: string; icon: ReactNode; exact?: boolean};

type NavGroup = {heading: string; items: NavItem[]};

const icon = (Icon: typeof LayoutDashboard) => (
  <Icon size={18} strokeWidth={1.5} />
);

const dashboard = (to: string): NavGroup => ({
  heading: 'Overview',
  items: [{label: 'Dashboard', to, icon: icon(LayoutDashboard)}],
});

const item = (label: string, to: string, Icon: typeof LayoutDashboard) => ({
  label,
  to,
  icon: icon(Icon),
});

// What each role sees; the backend still checks every request
const NAV: Record<Role, NavGroup[]> = {
  SUPER_ADMIN: [
    dashboard(ROLES.SUPER_ADMIN.home),
    {
      heading: 'Masters',
      items: [item('Admins', '/super-admin/admins', ShieldCheck)],
    },
  ],
  ADMIN: [
    dashboard(ROLES.ADMIN.home),
    {
      heading: 'Masters',
      items: [item('Branches', '/company-admin/branches', Store)],
    },
    {
      heading: 'Sales & Fulfillment',
      items: [
        item('Orders', '/company-admin/orders', ShoppingBag),
      ],
    },
  ],
  SUB_ADMIN: [
    {
      heading: 'Overview',
      items: [
        item('Dashboard', ROLES.SUB_ADMIN.home, LayoutDashboard),
        item('Approvals', '/branch-admin/approvals', UserCheck),
      ],
    },
    {
      heading: 'Sales',
      items: [
        item('Sales Bills', '/branch-admin/sales-bills', FileOutput),
        item('Sales Returns', '/branch-admin/sales-returns', Undo2),
        item('Customers & Dues', '/branch-admin/customers', BookUser),
      ],
    },
    {
      heading: 'Purchase',
      items: [
        item('Purchase Bills', '/branch-admin/purchase-bills', FileInput),
        item('Suppliers', '/branch-admin/suppliers', Truck),
      ],
    },
    {
      heading: 'Stock',
      items: [
        item('Products & Prices', '/branch-admin/products', Tag),
        item('Stock by Shop', '/branch-admin/inventory', Boxes),
        item(
          'Stock Transfers',
          '/branch-admin/stock-transfers',
          ArrowLeftRight,
        ),
      ],
    },
    {
      heading: 'Accounts',
      items: [
        item('Cash & Day Close', '/branch-admin/day-close', Wallet),
        item('Expenses', '/branch-admin/expenses', CreditCard),
      ],
    },
    {
      heading: 'Reports',
      items: [
        item('Reports', '/branch-admin/reports', BarChart3),
        item('GST Summary', '/branch-admin/gst', Percent),
      ],
    },
    {
      heading: 'Setup',
      items: [
        item('Shops', '/branch-admin/shops', Warehouse),
        item('Staff', '/branch-admin/employees', Users),
        item('Shop Assignment', '/branch-admin/shop-assignment', UserCog),
        item('Branch Profile', '/branch-admin/profile', Building2),
        item('My Profile', '/branch-admin/my-profile', User),
      ],
    },
  ],
  SHOP_ADMIN: [
    dashboard(ROLES.SHOP_ADMIN.home),
    {
      heading: 'Billing',
      items: [
        item('New Bill (POS)', '/shop-admin/new-bill', Monitor),
        item('Sales Bills', '/shop-admin/sales-bills', FileOutput),
        item('Sales Return', '/shop-admin/sales-return', RotateCcw),
      ],
    },
    {
      heading: 'Customers',
      items: [
        item('Customers', '/shop-admin/customers', Users),
        item('Credit / Udhaar', '/shop-admin/customers?tab=WITH_DUE', CreditCard),
      ],
    },
    {
      heading: 'Masters',
      items: [
        item('Categories', '/shop-admin/categories', Tags),
        item('Subcategories', '/shop-admin/subcategories', Layers),
        item('Colors', '/shop-admin/colors', Palette),
        item('Sizes', '/shop-admin/sizes', Ruler),
        item('Employees', '/shop-admin/employees', Users),
      ],
    },
    {
      heading: 'Catalog & Promotions',
      items: [
        item('Products', '/shop-admin/products', Package),
        item('Inventory', '/shop-admin/inventory', Boxes),
        item('Purchase Bills', '/shop-admin/purchase-bills', FileInput),
        item('Offers & Coupons', '/shop-admin/promotions', TicketPercent),
      ],
    },
    {
      heading: 'Sales & Fulfillment',
      items: [
        item('Sales Returns', '/shop-admin/sales-returns', Undo2),
        item('Orders', '/shop-admin/orders', ShoppingBag),
      ],
    },
  ],
  EMPLOYEE: [
    dashboard(ROLES.EMPLOYEE.home),
    {
      heading: 'Billing',
      items: [
        item('New Bill (POS)', '/shop-admin/new-bill', Monitor),
        item('Sales Return', '/shop-admin/sales-return', RotateCcw),
      ],
    },
  ],
  USER: [
    {
      heading: 'Account',
      items: [item('My Account', ROLES.USER.home, User)],
    },
  ],
};

const ACCOUNT_GROUP: NavGroup = {
  heading: 'Settings',
  items: [
    {label: 'Change Password', to: '/change-password', icon: icon(KeyRound)},
  ],
};

const Sidebar = ({sidebarOpen, setSidebarOpen}: SidebarProps) => {
  const {role} = useAuthContext();
  const {can} = usePermissions();
  const config = roleConfig(role);
  const {data: me} = useCurrentUser();

  // Branch admins see "BRANCH ADMIN · SANGLI" (or their branch name)
  const panelLabel =
    role === 'SUB_ADMIN'
      ? me?.branch?.name
        ? `BRANCH ADMIN · ${me.branch.name.replace(/branch/i, '').trim().toUpperCase()}`
        : 'BRANCH ADMIN'
      : config?.label;

  // Employees see the tools their permissions allow
  const workItems =
    role === 'EMPLOYEE'
      ? [
          can('products.manage') &&
            item('Products', '/employee/products', Package),
          can('inventory.view') &&
            item('Inventory', '/employee/inventory', Boxes),
          can('orders.process') &&
            item('Orders', '/employee/orders', ShoppingBag),
        ].filter((i): i is NavItem => !!i)
      : [];
  const employeeTools: NavGroup[] = workItems.length
    ? [{heading: 'Work', items: workItems}]
    : [];
  const nav = [...(NAV[role as Role] ?? []), ...employeeTools, ACCOUNT_GROUP];

  useEffect(() => {
    if (role === 'SHOP_ADMIN') {
      console.log(
        '[Shop Panel Sidebar] Mounted with nav items:',
        nav.flatMap((g) => g.items.map((i) => ({ heading: g.heading, label: i.label, to: i.to })))
      );
    }
  }, [role, nav]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && setSidebarOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <>
      {/* Mobile scrim */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-[60] bg-scrim backdrop-blur-[8px] transition-opacity lg:hidden ${
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-[70] flex w-64 flex-col border-r border-stone-200/80 bg-white text-stone-700 shadow-sm transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <Link
            to={config?.home ?? '/'}
            className="block"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="block font-serif text-2xl font-bold tracking-tight text-[#4A1521]">
              Cloth Pro
            </span>
            <span className="mt-1 inline-block rounded border border-stone-200/70 bg-stone-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
              {panelLabel}
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-stone-400 hover:text-stone-700 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
          {nav.map((group) => (
            <div key={group.heading} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((navItem) => (
                  <li key={navItem.to}>
                    <Link
                      to={navItem.to}
                      activeOptions={{exact: navItem.exact}}
                      onClick={() => {
                        console.log(`[Shop Panel Sidebar] Navigation clicked: "${item.label}" -> ${item.to}`);
                        setSidebarOpen(false);
                      }}
                      className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-stone-600 transition-all duration-150 hover:bg-stone-100/80 hover:text-[#4A1521]"
                      activeProps={{
                        className:
                          '!bg-[#4A1521] !text-white shadow-sm font-semibold',
                      }}
                    >
                      <span className="flex-shrink-0 transition-transform duration-150 group-hover:scale-105">
                        {navItem.icon}
                      </span>
                      <span className="truncate">{navItem.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <p className="border-t border-stone-100 px-5 py-3 text-[11px] font-medium text-stone-400">
          © {new Date().getFullYear()} Cloth Pro
        </p>
      </aside>
    </>
  );
};

export default Sidebar;
