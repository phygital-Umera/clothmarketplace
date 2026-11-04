import {useAuthContext} from '@/context/AuthContext';
import usePermissions from '@/hooks/usePermissions';
import {SidebarProps} from '@/types';
import {Link} from '@tanstack/react-router';
import {roleConfig, Role, ROLES} from '@/lib/roles';
import {
  Boxes,
  CreditCard,
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
  // Each panel shows only its own master: Admins > Branches > Shops > Employees
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
      heading: 'Masters',
      items: [item('Shops', '/branch-admin/shops', Warehouse)],
    },
    {
      heading: 'Sales & Fulfillment',
      items: [
        item('Orders', '/branch-admin/orders', ShoppingBag),
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
        className={`fixed inset-y-0 left-0 z-[70] flex w-64 flex-col bg-burgundy-deep text-ivory transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-ivory/10 px-6 py-5">
          <Link
            to={config?.home ?? '/'}
            className="block"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="block font-serif text-headline-sm leading-none">
              Cloth Pro
            </span>
            <span className="mt-1 block text-label-caps uppercase text-blush/80">
              {config?.label}
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-ivory/70 hover:text-ivory lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-5">
          {nav.map((group) => (
            <div key={group.heading} className="mb-6">
              <p className="mb-2 px-3 text-label-caps uppercase text-ivory/40">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      activeOptions={{exact: item.exact}}
                      onClick={() => {
                        console.log(`[Shop Panel Sidebar] Navigation clicked: "${item.label}" -> ${item.to}`);
                        setSidebarOpen(false);
                      }}
                      className="flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-body-sm text-ivory/75 transition-colors hover:bg-ivory/5 hover:text-ivory"
                      activeProps={{
                        className: '!border-blush bg-ivory/10 !text-ivory',
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <p className="border-t border-ivory/10 px-6 py-4 text-technical-data text-ivory/40">
          © {new Date().getFullYear()} Cloth Pro
        </p>
      </aside>
    </>
  );
};

export default Sidebar;
