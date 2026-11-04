/*
 * Exact internal role identifiers:
 * 1. SUPER_ADMIN = Platform Super Admin
 * 2. ADMIN = Company Admin
 * 3. SUB_ADMIN = Branch Admin
 * 4. SHOP_ADMIN = Shop login
 * 5. EMPLOYEE = Staff member
 * 6. USER = Customer
 */

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SUB_ADMIN'
  | 'SHOP_ADMIN'
  | 'EMPLOYEE'
  | 'USER';

type Landing = {to: string; search?: Record<string, string>};

type RoleConfig = {
  label: string;
  home: string;
  prefix: string;
  /** First page after sign-in, when it is not the home page */
  landing?: Landing;
};

export const ROLES: Record<Role, RoleConfig> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    home: '/super-admin/dashboard',
    prefix: '/super-admin',
  },
  ADMIN: {
    label: 'Company Admin',
    home: '/company-admin/dashboard',
    prefix: '/company-admin',
  },
  SUB_ADMIN: {
    label: 'Admin', // Display as Admin / Branch Admin per specification
    home: '/branch-admin/shops',
    prefix: '/branch-admin',
    // Branch admins start on Shops with the Add Shop form open
    landing: {to: '/branch-admin/shops', search: {add: '1'}},
  },
  SHOP_ADMIN: {
    label: 'Shop',
    home: '/shop-admin/dashboard',
    prefix: '/shop-admin',
  },
  EMPLOYEE: {
    label: 'Employee',
    home: '/employee/dashboard',
    prefix: '/employee',
  },
  USER: {
    label: 'Customer',
    home: '/account',
    prefix: '/account',
  },
};

/** Pages every signed-in role may open */
export const SHARED_PATHS = ['/change-password'];

export const roleConfig = (role?: string | null): RoleConfig | undefined =>
  role && role in ROLES ? ROLES[role as Role] : undefined;

export const homeFor = (role?: string | null) =>
  roleConfig(role)?.home ?? '/signin';

/** Where each role lands right after signing in */
export const landingFor = (role?: string | null): Landing =>
  roleConfig(role)?.landing ?? {to: homeFor(role)};

export const canOpen = (role: string | null | undefined, path: string) => {
  const config = roleConfig(role);
  if (!config) return false;
  return (
    SHARED_PATHS.includes(path) ||
    path === config.prefix ||
    path.startsWith(`${config.prefix}/`)
  );
};
