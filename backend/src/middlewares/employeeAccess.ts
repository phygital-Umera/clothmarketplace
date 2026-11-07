import {NextFunction, Request, Response} from 'express';
import httpStatus from 'http-status';
import {ApiError} from '@utils/index';
import {ShopModule} from '../config/permissions';

/*
 * Employees use the shop API under /employee. Each request belongs to a shop
 * module (by its first path segment): reading needs "<module>.view" or
 * "<module>.edit", changing needs "<module>.edit". Anything not listed here
 * (employees, staff rights, promotions) is closed to employees.
 */

type Rule = {read: ShopModule[]; write: ShopModule[]};
const only = (m: ShopModule): Rule => ({read: [m], write: [m]});

const RULES: Record<string, Rule> = {
    dashboard: only('dashboard'),

    'sales-bills': only('billing'),
    'credit-notes': only('billing'),
    counter: only('billing'),
    // Online store orders and their returns
    orders: only('orders'),
    returns: only('orders'),
    // The POS searches customers; the Customers page manages them
    customers: {read: ['billing', 'customers'], write: ['customers']},
    credit: only('customers'),

    'purchase-bills': only('purchase'),
    'purchase-returns': only('purchase'),
    suppliers: only('purchase'),

    products: only('products'),
    // Whether AI photos are set up (shown on the product page)
    'ai-status': only('products'),
    // The POS picks items from stock
    inventory: {read: ['stock', 'billing', 'products'], write: ['stock']},
    stock: only('stock'),
    'stock-adjustments': only('stock'),
    transfers: only('stock'),
    'barcode-labels': {read: ['stock', 'purchase'], write: ['stock', 'purchase']},

    'cash-book': only('accounts'),
    expenses: only('accounts'),

    reports: only('reports'),

    // The product form needs the master lists
    categories: {read: ['masters', 'products'], write: ['masters']},
    subcategories: {read: ['masters', 'products'], write: ['masters']},
    colors: {read: ['masters', 'products'], write: ['masters']},
    sizes: {read: ['masters', 'products'], write: ['masters']},
};

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Modules the employee can open, with their level, from their permissions */
export const moduleAccess = (permissions: string[]) => {
    const access: Partial<Record<ShopModule, 'view' | 'edit'>> = {};
    for (const p of permissions) {
        const [mod, level] = p.split('.') as [ShopModule, string];
        if (level === 'edit') access[mod] = 'edit';
        else if (level === 'view' && access[mod] !== 'edit') access[mod] = 'view';
    }
    return access;
};

export const employeeModuleGuard = (req: Request, _res: Response, next: NextFunction) => {
    const segment = req.path.split('/').filter(Boolean)[0] ?? '';
    const rule = RULES[segment];
    if (!rule) {
        return next(new ApiError(httpStatus.FORBIDDEN, 'This is not available to employees'));
    }
    const permissions = new Set(req.user?.permissions ?? []);
    const writing = !READ_METHODS.has(req.method);
    const allowed = writing
        ? rule.write.some((m) => permissions.has(`${m}.edit`))
        : rule.read.some((m) => permissions.has(`${m}.view`) || permissions.has(`${m}.edit`));
    if (!allowed) {
        return next(
            new ApiError(
                httpStatus.FORBIDDEN,
                writing
                    ? 'You can only view this. Ask your shop admin for edit access.'
                    : 'You do not have access to this. Ask your shop admin.',
            ),
        );
    }
    next();
};
