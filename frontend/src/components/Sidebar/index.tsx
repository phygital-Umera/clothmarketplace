import {useAuthContext} from '@/context/AuthContext';
import useCurrentUser from '@/hooks/useCurrentUser';
import {SidebarProps} from '@/types';
import {Link} from '@tanstack/react-router';
import {roleConfig, Role, ROLES} from '@/lib/roles';
import {employeeCanOpen} from '@/lib/shopModules';
import {
  ArrowLeftRight,
  BarChart3,
  BookUser,
  Boxes,
  Barcode,
  Building2,
  Briefcase,
  CreditCard,
  FileInput,
  FileOutput,
  KeyRound,
  Layers,
  LayoutDashboard,
  Megaphone,
  Monitor,
  Package,
  Palette,
  RotateCcw,
  Ruler,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tag,
  Tags,
  Truck,
  Undo2,
  User,
  UserCheck,
  UserCog,
  Users,
  Wallet,
  Warehouse,
  X,
} from 'lucide-react';
import {ReactNode, useEffect} from 'react';

type NavItem = {label: string; to: string; icon: ReactNode};
type NavGroup = {heading: string; items: NavItem[]};

const item = (label: string, to: string, Icon: typeof LayoutDashboard): NavItem => ({
  label,
  to,
  icon: <Icon size={18} strokeWidth={1.5} />,
});

const dashboard = (to: string): NavGroup => ({
  heading: 'Overview',
  items: [item('Dashboard', to, LayoutDashboard)],
});

// What each role sees; the backend still checks every request
const NAV: Record<Role, NavGroup[]> = {
  SUPER_ADMIN: [
    dashboard(ROLES.SUPER_ADMIN.home),
    {
      heading: 'Businesses',
      items: [
        item('Companies', '/super-admin/companies', Briefcase),
        item('Branches', '/super-admin/branches', Building2),
        item('Shops', '/super-admin/shops', Store),
        item('Users', '/super-admin/users', Users),
      ],
    },
    {
      heading: 'Catalog',
      items: [
        item('Categories', '/super-admin/categories', Tags),
        item('Brands', '/super-admin/brands', Tag),
        item('Products', '/super-admin/products', Package),
      ],
    },
    {heading: 'Sales', items: [item('Orders', '/super-admin/orders', ShoppingBag)]},
  ],
  ADMIN: [
    dashboard(ROLES.ADMIN.home),
    {
      heading: 'Business',
      items: [
        item('Branches', '/company-admin/branches', Building2),
        item('Shops', '/company-admin/shops', Store),
        item('Employees', '/company-admin/employees', Users),
        item('Company Profile', '/company-admin/profile', Briefcase),
      ],
    },
    {
      heading: 'Catalog',
      items: [
        item('Products', '/company-admin/products', Package),
        item('Brands', '/company-admin/brands', Tag),
        item('Stock', '/company-admin/inventory', Boxes),
      ],
    },
    {
      heading: 'Sales',
      items: [
        item('Orders', '/company-admin/orders', ShoppingBag),
        item('Promotions', '/company-admin/promotions', Megaphone),
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
        item('Purchase Return', '/branch-admin/purchase-return', RotateCcw),
        item('Suppliers', '/branch-admin/suppliers', Truck),
      ],
    },
    {
      heading: 'Stock',
      items: [
        item('Products & Prices', '/branch-admin/products', Tag),
        item('Stock by Shop', '/branch-admin/inventory', Boxes),
        item('Barcode Labels', '/branch-admin/barcode-labels', Barcode),
        item('Stock Transfers', '/branch-admin/stock-transfers', ArrowLeftRight),
      ],
    },
    {
      heading: 'Accounts',
      items: [
        item('Cash & Day Close', '/branch-admin/day-close', Wallet),
        item('Expenses', '/branch-admin/expenses', CreditCard),
        item('Reports', '/branch-admin/reports', BarChart3),
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
        item('Sales Returns', '/shop-admin/sales-returns', RotateCcw),
      ],
    },
    {
      heading: 'Customers',
      items: [
        item('Customers', '/shop-admin/customers', BookUser),
        item('Credit / Udhaar', '/shop-admin/credit', CreditCard),
      ],
    },
    {
      heading: 'Purchase',
      items: [
        item('Purchase Bills', '/shop-admin/purchase-bills', FileInput),
        item('Purchase Return', '/shop-admin/purchase-return', RotateCcw),
        item('Suppliers', '/shop-admin/suppliers', Truck),
      ],
    },
    {
      heading: 'Stock',
      items: [
        item('Products', '/shop-admin/products', Package),
        item('Stock', '/shop-admin/inventory', Boxes),
        item('Stock Adjustment', '/shop-admin/stock-adjustment', SlidersHorizontal),
        item('Stock Transfer', '/shop-admin/stock-transfer', ArrowLeftRight),
        item('Barcode Labels', '/shop-admin/barcode-labels', Barcode),
      ],
    },
    {
      heading: 'Accounts',
      items: [
        item('Cash Book', '/shop-admin/cash-book', Wallet),
        item('Expenses', '/shop-admin/expenses', CreditCard),
        item('Reports', '/shop-admin/reports', BarChart3),
      ],
    },
    {
      heading: 'Team',
      items: [
        item('Employees', '/shop-admin/employees', Users),
        item('Staff & Rights', '/shop-admin/staff', UserCog),
      ],
    },
    {
      heading: 'Masters',
      items: [
        item('Categories', '/shop-admin/categories', Tags),
        item('Subcategories', '/shop-admin/subcategories', Layers),
        item('Colors', '/shop-admin/colors', Palette),
        item('Sizes', '/shop-admin/sizes', Ruler),
      ],
    },
  ],
  // Employees: built from the shop menu and their module access (see below)
  EMPLOYEE: [],
  USER: [{heading: 'Account', items: [item('My Account', ROLES.USER.home, User)]}],
};

const ACCOUNT_GROUP: NavGroup = {
  heading: 'Settings',
  items: [item('Change Password', '/change-password', KeyRound)],
};

const Sidebar = ({sidebarOpen, setSidebarOpen}: SidebarProps) => {
  const {role} = useAuthContext();
  const config = roleConfig(role);
  const {data: me} = useCurrentUser();

  // Under the brand: the role, and the branch / shop the account belongs to
  const place =
    role === 'SUB_ADMIN'
      ? me?.branch?.name
      : role === 'SHOP_ADMIN' || role === 'EMPLOYEE'
        ? me?.shop?.name
        : null;
  const panelLabel = [config?.label, place].filter(Boolean).join(' · ');

  // An employee sees the shop screens of the modules they were given
  const employeeNav: NavGroup[] =
    role === 'EMPLOYEE'
      ? [
          {heading: 'Me', items: [item('My Work', ROLES.EMPLOYEE.home, User)]},
          ...NAV.SHOP_ADMIN.map((g) => ({
            ...g,
            items: g.items.filter((i) => employeeCanOpen(i.to, me?.permissions)),
          })).filter((g) => g.items.length),
        ]
      : [];
  const nav = [...(role === 'EMPLOYEE' ? employeeNav : (NAV[role as Role] ?? [])), ACCOUNT_GROUP];

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSidebarOpen(false);
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
        className={`fixed inset-y-0 left-0 z-[70] flex w-64 flex-col border-r border-[#3a101a] bg-[#4A1521] text-stone-200 shadow-sm transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#5c1c2b] px-5 py-4">
          <Link to={config?.home ?? '/'} className="block min-w-0" onClick={() => setSidebarOpen(false)}>
            <span className="block font-serif text-2xl font-bold tracking-tight text-[#FAF7F5]">
              Cloth Pro
            </span>
            <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-wider text-[#C99A9F]">
              {panelLabel}
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-[#C99A9F] hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
          {nav.map((group) => (
            <div key={group.heading} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-[#B77B84]">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((navItem) => (
                  <li key={navItem.to}>
                    <Link
                      to={navItem.to}
                      onClick={() => setSidebarOpen(false)}
                      className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#E8DCD9] transition-all duration-150 hover:bg-[#5C1E2B] hover:text-white"
                      activeProps={{className: '!bg-[#5C1E2B] !text-white shadow-sm font-semibold'}}
                    >
                      <span className="flex-shrink-0 text-[#D4B5B9] transition-transform duration-150 group-hover:scale-105 group-hover:text-white">
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

        <p className="border-t border-[#5c1c2b] px-5 py-3 text-[11px] font-medium text-[#A4707A]">
          © {new Date().getFullYear()} Cloth Pro
        </p>
      </aside>
    </>
  );
};

export default Sidebar;
