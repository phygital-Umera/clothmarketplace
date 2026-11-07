import {useAuthContext} from '@/context/AuthContext';
import useCurrentUser from '@/hooks/useCurrentUser';
import {SidebarProps} from '@/types';
import {Link, useRouterState} from '@tanstack/react-router';
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

type NavItem = {label: string; to: string; icon: ReactNode; hint?: string};
type NavGroup = {heading: string; items: NavItem[]};

/** A menu entry; `hint` says in one line what the page is for (tooltip, and shown under the open page) */
const item = (label: string, to: string, Icon: typeof LayoutDashboard, hint?: string): NavItem => ({
  label,
  to,
  icon: <Icon size={18} strokeWidth={1.5} />,
  hint,
});

const dashboard = (to: string, hint = 'Today at a glance: sales, money, stock and what needs attention'): NavGroup => ({
  heading: 'Overview',
  items: [item('Dashboard', to, LayoutDashboard, hint)],
});

// What each role sees, in the order of the day's work; the backend still checks every request
const NAV: Record<Role, NavGroup[]> = {
  SUPER_ADMIN: [
    dashboard(ROLES.SUPER_ADMIN.home, 'All businesses on the platform at a glance'),
    {
      heading: 'Businesses',
      items: [
        item('Companies', '/super-admin/companies', Briefcase, 'Add and manage client companies and their admin logins'),
        item('Branches', '/super-admin/branches', Building2, 'Every branch of every company'),
        item('Shops', '/super-admin/shops', Store, 'Every shop, its branch and status'),
        item('Users', '/super-admin/users', Users, 'All logins: block, unblock or reset access'),
      ],
    },
    {
      heading: 'Catalog',
      items: [
        item('Categories', '/super-admin/categories', Tags, 'Platform-wide categories every company can use'),
        item('Brands', '/super-admin/brands', Tag, 'Brands available to companies'),
        item('Products', '/super-admin/products', Package, 'Products of all companies, read only'),
      ],
    },
    {heading: 'Sales', items: [item('Orders', '/super-admin/orders', ShoppingBag, 'Online store orders across all companies')]},
  ],
  ADMIN: [
    dashboard(ROLES.ADMIN.home, 'Your company: branches, shops and staff at a glance'),
    {
      heading: 'Sales',
      items: [
        item('Orders', '/company-admin/orders', ShoppingBag, 'Online store orders of all your shops'),
        item('Promotions', '/company-admin/promotions', Megaphone, 'Offers and coupons for your customers'),
      ],
    },
    {
      heading: 'Catalog & stock',
      items: [
        item('Products', '/company-admin/products', Package, 'Products of all your shops'),
        item('Stock', '/company-admin/inventory', Boxes, 'Stock of every product in every branch'),
        item('Brands', '/company-admin/brands', Tag, 'Your brands, used on products'),
      ],
    },
    {
      heading: 'Business setup',
      items: [
        item('Branches', '/company-admin/branches', Building2, 'Add branches and their branch admins'),
        item('Shops', '/company-admin/shops', Store, 'Add shops under a branch, with their logins'),
        item('Employees', '/company-admin/employees', Users, 'Staff of the whole company'),
        item('Company Profile', '/company-admin/profile', Briefcase, 'Name, address, GST and logo on bills'),
      ],
    },
  ],
  SUB_ADMIN: [
    {
      heading: 'Overview',
      items: [
        item('Dashboard', ROLES.SUB_ADMIN.home, LayoutDashboard, 'Your branch today: sales of each shop, cash, alerts'),
        item('Approvals', '/branch-admin/approvals', UserCheck, 'Discounts, credit, refunds and cancellations waiting for you'),
      ],
    },
    {
      heading: 'Sales',
      items: [
        item('Online Orders', '/branch-admin/orders', ShoppingBag, 'Website orders of your shops: confirm, pack, ship, returns'),
        item('Sales Bills', '/branch-admin/sales-bills', FileOutput, 'Counter bills of every shop, with edits flagged'),
        item('Sales Returns', '/branch-admin/sales-returns', Undo2, 'Returns and credit notes of every shop'),
        item('Customers & Dues', '/branch-admin/customers', BookUser, 'Customers who owe money (udhaar) across shops'),
      ],
    },
    {
      heading: 'Stock',
      items: [
        item('Products & Prices', '/branch-admin/products', Tag, 'Change prices for all shops of the branch'),
        item('Stock by Shop', '/branch-admin/inventory', Boxes, 'How much of each item every shop has'),
        item('Stock Transfers', '/branch-admin/stock-transfers', ArrowLeftRight, 'Move stock between your shops'),
        item('Barcode Labels', '/branch-admin/barcode-labels', Barcode, 'Print price tags with barcodes'),
      ],
    },
    {
      heading: 'Purchase',
      items: [
        item('Purchase Bills', '/branch-admin/purchase-bills', FileInput, 'Supplier bills of every shop'),
        item('Purchase Return', '/branch-admin/purchase-return', RotateCcw, 'Goods sent back to suppliers'),
        item('Suppliers', '/branch-admin/suppliers', Truck, 'Suppliers, what you owe them and payments'),
      ],
    },
    {
      heading: 'Accounts',
      items: [
        item('Cash & Day Close', '/branch-admin/day-close', Wallet, 'Cash of each shop and closing the day'),
        item('Expenses', '/branch-admin/expenses', CreditCard, 'Rent, salaries and other branch costs'),
        item('Reports', '/branch-admin/reports', BarChart3, 'Profit & loss of the branch or a shop'),
      ],
    },
    {
      heading: 'Setup',
      items: [
        item('Shops', '/branch-admin/shops', Warehouse, 'Shops in your branch'),
        item('Staff', '/branch-admin/employees', Users, 'Staff of your branch'),
        item('Shop Assignment', '/branch-admin/shop-assignment', UserCog, 'Which staff work in which shop'),
        item('Branch Profile', '/branch-admin/profile', Building2, 'Branch address, timings and holidays'),
        item('My Profile', '/branch-admin/my-profile', User, 'Your own details'),
      ],
    },
  ],
  SHOP_ADMIN: [
    dashboard(ROLES.SHOP_ADMIN.home, "Today's sales, cash, online orders and low stock"),
    {
      heading: 'Sell at the counter',
      items: [
        item('New Bill (POS)', '/shop-admin/new-bill', Monitor, 'Scan or search items and bill the customer'),
        item('Sales Bills', '/shop-admin/sales-bills', FileOutput, 'All counter bills: view, print, edit or cancel'),
        item('Sales Returns', '/shop-admin/sales-returns', RotateCcw, 'Take items back: refund, exchange or store credit'),
      ],
    },
    {
      heading: 'Online store',
      items: [item('Online Orders', '/shop-admin/orders', ShoppingBag, 'Website orders: confirm, pack, ship; customer returns')],
    },
    {
      heading: 'Customers',
      items: [
        item('Customers', '/shop-admin/customers', BookUser, 'Counter customers and online buyers'),
        item('Credit / Udhaar', '/shop-admin/credit', CreditCard, 'Who owes money, and collecting it'),
      ],
    },
    {
      heading: 'Products & stock',
      items: [
        item('Products', '/shop-admin/products', Package, 'Add products with photos, sizes, colours and prices'),
        item('Stock', '/shop-admin/inventory', Boxes, 'How much of each item you have, and every movement'),
        item('Stock Adjustment', '/shop-admin/stock-adjustment', SlidersHorizontal, 'Correct counts, damaged or lost items'),
        item('Stock Transfer', '/shop-admin/stock-transfer', ArrowLeftRight, 'Send or receive stock from other shops'),
        item('Barcode Labels', '/shop-admin/barcode-labels', Barcode, 'Print price tags with barcodes'),
      ],
    },
    {
      heading: 'Purchase',
      items: [
        item('Purchase Bills', '/shop-admin/purchase-bills', FileInput, 'Enter supplier bills; stock goes up'),
        item('Purchase Return', '/shop-admin/purchase-return', RotateCcw, 'Send goods back to a supplier'),
        item('Suppliers', '/shop-admin/suppliers', Truck, 'Suppliers, what you owe them and payments'),
      ],
    },
    {
      heading: 'Money',
      items: [
        item('Cash Book', '/shop-admin/cash-book', Wallet, 'Cash in and out of the drawer; close the day'),
        item('Expenses', '/shop-admin/expenses', CreditCard, 'Tea, transport, repairs and other shop costs'),
        item('Reports', '/shop-admin/reports', BarChart3, 'Profit & loss of the shop'),
      ],
    },
    {
      heading: 'Team',
      items: [
        item('Employees', '/shop-admin/employees', Users, 'Staff logins and which pages each can use'),
        item('Staff & Rights', '/shop-admin/staff', UserCog, 'Attendance and counter rights (discount, credit and more)'),
      ],
    },
    {
      heading: 'Setup (masters)',
      items: [
        item('Categories', '/shop-admin/categories', Tags, 'Groups like Men, Women, Kids'),
        item('Subcategories', '/shop-admin/subcategories', Layers, 'Types inside a category, like Shirts or Sarees'),
        item('Colors', '/shop-admin/colors', Palette, 'Colours you sell, with their shade'),
        item('Sizes', '/shop-admin/sizes', Ruler, 'Sizes you sell, in display order'),
      ],
    },
  ],
  // Employees: built from the shop menu and their module access (see below)
  EMPLOYEE: [],
  USER: [{heading: 'Account', items: [item('My Account', ROLES.USER.home, User)]}],
};

const ACCOUNT_GROUP: NavGroup = {
  heading: 'Settings',
  items: [item('Change Password', '/change-password', KeyRound, 'Change your own login password')],
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
  const pathname = useRouterState({select: (st) => st.location.pathname});
  const isOpen = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

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
                      title={navItem.hint}
                      className="group flex items-start gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#E8DCD9] transition-all duration-150 hover:bg-[#5C1E2B] hover:text-white"
                      activeProps={{className: '!bg-[#5C1E2B] !text-white shadow-sm font-semibold'}}
                    >
                      <span className="flex-shrink-0 text-[#D4B5B9] transition-transform duration-150 group-hover:scale-105 group-hover:text-white">
                        {navItem.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{navItem.label}</span>
                        {/* What this page is for, under the page that is open */}
                        {navItem.hint && isOpen(navItem.to) && (
                          <span className="mt-0.5 block whitespace-normal text-[10.5px] font-normal leading-snug text-[#D9BFC3]">
                            {navItem.hint}
                          </span>
                        )}
                      </span>
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
