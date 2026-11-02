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
] as const;

export type EmployeePermission = (typeof EMPLOYEE_PERMISSIONS)[number];
