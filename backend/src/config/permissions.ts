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
] as const;

/**
 * The rights shown as columns on the shop's Staff & rights page, in order.
 * ADJUST maps to the existing inventory.adjust permission.
 */
export const STAFF_RIGHTS = [
    {key: 'pos.bill', label: 'POS'},
    {key: 'sales.discount', label: 'Discount'},
    {key: 'sales.credit', label: 'Credit sale'},
    {key: 'purchase.create', label: 'Purchase'},
    {key: 'inventory.adjust', label: 'Adjust'},
    {key: 'stock.transfer', label: 'Transfer'},
    {key: 'cash.manage', label: 'Cash book'},
] as const satisfies ReadonlyArray<{key: EmployeePermission; label: string}>;

export type EmployeePermission = (typeof EMPLOYEE_PERMISSIONS)[number];
