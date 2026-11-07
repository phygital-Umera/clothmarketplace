/*
 * Shop modules an employee can be given (same keys as the backend's
 * SHOP_MODULES). Each is stored on the employee as "<module>.view" (read only)
 * or "<module>.edit" (view and change).
 *
 * Employees open the same /shop-admin/... screens as the shop login; their API
 * calls go to /employee/... (see utils/axios.ts).
 */

export const SHOP_MODULES = [
  {key: 'dashboard', label: 'Dashboard', hint: 'Shop dashboard: today’s sales and cash'},
  {key: 'billing', label: 'Billing', hint: 'New bill (POS), sales bills, sales returns'},
  {key: 'orders', label: 'Online orders', hint: 'Orders from the online store: pack, ship, returns'},
  {key: 'customers', label: 'Customers', hint: 'Customers, credit / udhaar'},
  {key: 'purchase', label: 'Purchase', hint: 'Purchase bills, purchase return, suppliers'},
  {key: 'products', label: 'Products', hint: 'Products and their prices'},
  {key: 'stock', label: 'Stock', hint: 'Stock, adjustment, transfer, barcode labels'},
  {key: 'accounts', label: 'Accounts', hint: 'Cash book, expenses'},
  {key: 'reports', label: 'Reports', hint: 'Profit & loss'},
  {key: 'masters', label: 'Masters', hint: 'Categories, subcategories, colors, sizes'},
] as const;

export type ShopModule = (typeof SHOP_MODULES)[number]['key'];
export type AccessLevel = 'none' | 'view' | 'edit';

/** Shop screen (first part after /shop-admin/) -> module. Others are shop-login only. */
const SCREEN_MODULE: Record<string, ShopModule> = {
  dashboard: 'dashboard',
  'new-bill': 'billing',
  'sales-bills': 'billing',
  'sales-returns': 'billing',
  orders: 'orders',
  customers: 'customers',
  credit: 'customers',
  'purchase-bills': 'purchase',
  'purchase-return': 'purchase',
  suppliers: 'purchase',
  products: 'products',
  inventory: 'stock',
  'stock-adjustment': 'stock',
  'stock-transfer': 'stock',
  'barcode-labels': 'stock',
  'cash-book': 'accounts',
  expenses: 'accounts',
  reports: 'reports',
  categories: 'masters',
  subcategories: 'masters',
  colors: 'masters',
  sizes: 'masters',
};

/** Screens that only make sense with edit access */
const EDIT_ONLY = [/^\/shop-admin\/new-bill/, /^\/shop-admin\/products\/(new|edit)/];

export const levelOf = (permissions: string[] = [], module: ShopModule): AccessLevel =>
  permissions.includes(`${module}.edit`)
    ? 'edit'
    : permissions.includes(`${module}.view`)
      ? 'view'
      : 'none';

/** Module of a /shop-admin/... path, or null for shop-login-only screens */
export const moduleOfPath = (path: string): ShopModule | null => {
  const m = path.match(/^\/shop-admin\/([^/]+)/);
  return m ? (SCREEN_MODULE[m[1]] ?? null) : null;
};

/** Can an employee with these permissions open this shop screen? */
export const employeeCanOpen = (path: string, permissions: string[] = []) => {
  const module = moduleOfPath(path);
  if (!module) return false;
  const level = levelOf(permissions, module);
  if (level === 'none') return false;
  return level === 'edit' || !EDIT_ONLY.some((re) => re.test(path));
};

/** Permissions list with one module set to a level (other permissions kept) */
export const withLevel = (permissions: string[], module: ShopModule, level: AccessLevel) => [
  ...permissions.filter((p) => p !== `${module}.view` && p !== `${module}.edit`),
  ...(level === 'none' ? [] : [`${module}.${level}`]),
];
