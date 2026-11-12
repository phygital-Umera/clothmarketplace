/*
 * Permission catalog for the Super Admin Panel, one entry per action in the
 * spec. Routes guard with checkPermission('companies.edit'); the frontend
 * reads the same strings from GET /users/me to hide actions.
 *
 * Add new permissions here; SUPERADMIN picks them up on the next server start.
 */
export const PERMISSIONS = [
    'dashboard.view',

    'companies.view',
    'companies.create',
    'companies.edit',
    'companies.delete',
    'companies.suspend',

    'companyAdmins.view',
    'companyAdmins.invite',
    'companyAdmins.edit',
    'companyAdmins.suspend',

    'branches.view',

    'users.view',
    'users.edit',
    'users.block',

    'categories.view',
    'categories.create',
    'categories.edit',
    'categories.delete',

    'products.view',
    'products.restrict',

    'orders.view',

    'reports.view',
    'reports.export',

    'settings.view',
    'settings.edit',

    'audit.view',

    'profile.view',
    'profile.edit',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Shop modules an employee can be given, each as "view" (read only) or "edit"
 * (view and change). Stored on the user as e.g. "billing.view" / "billing.edit".
 * The /employee API is the shop API; employeeModuleGuard maps each request to
 * one of these modules. Team management (employees, staff rights) is never
 * given to employees.
 */
export const SHOP_MODULES = [
    {key: 'dashboard', label: 'Dashboard', short: 'Dashboard'},
    {key: 'billing', label: 'Billing (POS, sales bills, returns)', short: 'Billing'},
    {key: 'orders', label: 'Online orders & returns', short: 'Online orders'},
    {key: 'customers', label: 'Customers & credit', short: 'Customers'},
    {key: 'purchase', label: 'Purchase & suppliers', short: 'Purchase'},
    {key: 'products', label: 'Products', short: 'Products'},
    {key: 'stock', label: 'Stock, transfers & barcodes', short: 'Stock'},
    {key: 'accounts', label: 'Cash book & expenses', short: 'Cash book'},
    {key: 'reports', label: 'Reports', short: 'Reports'},
    {key: 'masters', label: 'Masters (categories, colors, sizes)', short: 'Masters'},
] as const;
export type ShopModule = (typeof SHOP_MODULES)[number]['key'];

export const MODULE_PERMISSIONS = SHOP_MODULES.flatMap((m) => [
    `${m.key}.view` as const,
    `${m.key}.edit` as const,
]);

/**
 * Permissions a company admin or branch admin can give to an employee
 * (stored per user in User.permissions). Kept apart from PERMISSIONS so the
 * super admin does not get operational rights such as the AI studio.
 */
export const EMPLOYEE_PERMISSIONS = [
    'products.manage',
    'products.publish',
    'inventory.view',
    'inventory.adjust',
    'orders.process',
    'ai.studio',
    'reports.view',
    // Shop counter rights (Staff & rights page)
    'pos.bill',
    'sales.discount',
    'sales.credit',
    'purchase.create',
    'stock.transfer',
    'cash.manage',
    // Shop module access (see SHOP_MODULES)
    'dashboard.view',
    'dashboard.edit',
    'billing.view',
    'billing.edit',
    'orders.view',
    'orders.edit',
    'customers.view',
    'customers.edit',
    'purchase.view',
    'purchase.edit',
    'products.view',
    'products.edit',
    'stock.view',
    'stock.edit',
    'accounts.view',
    'accounts.edit',
    'reports.edit',
    'masters.view',
    'masters.edit',
] as const;

/**
 * The rights shown as columns on the shop's Staff & rights page: every shop
 * module (one list with the Employees form, P3-08); a tick gives that module
 * with edit access.
 */
export const STAFF_RIGHTS: ReadonlyArray<{key: EmployeePermission; label: string}> = SHOP_MODULES.map(
    (m) => ({key: `${m.key}.edit` as EmployeePermission, label: m.short}),
);

export type EmployeePermission = (typeof EMPLOYEE_PERMISSIONS)[number];
