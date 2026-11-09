import {NextFunction, Request, Response} from 'express';
import httpStatus from 'http-status';
import {BranchStatus, Role, ShopStatus} from '@prisma/client';
import {catchAsync, ApiError} from '@utils/index';
import prisma from '../client';

/*
 * "Shop mode": a company admin works in one of their shops by sending its id
 * in X-Shop-Id. The request then runs exactly as that shop's own login, so
 * every existing shop scope check applies unchanged.
 */

// Company-level master lists the company panel reads from the shop API
// (e.g. the offer form's subcategories), allowed without an open shop
const MASTER_LISTS = new Set(['categories', 'subcategories', 'colors', 'sizes']);
const READ_METHODS = new Set(['GET', 'HEAD']);

// The frontend matches this text to send the admin back to the shop picker
const SHOP_REFUSED ='This shop is closed or not in your company. Pick another shop.';

export const companyAdminShopMode = catchAsync(async (req, res, next) => {
    if (req.user.role !== Role.ADMIN) return next();

    res.vary('X-Shop-Id');
    const shopId = req.get('x-shop-id')?.trim();
    if (!shopId) {
        const segment = req.path.split('/').filter(Boolean)[0] ?? '';
        if (READ_METHODS.has(req.method) && MASTER_LISTS.has(segment)) return next();
        throw new ApiError(httpStatus.FORBIDDEN, 'Open a shop first');
    }

    const shop = await prisma.shop.findFirst({
        where: {
            id: shopId,
            companyId: req.user.companyId ?? '',
            deletedAt: null,
            status: ShopStatus.ACTIVE,
            branch: {deletedAt: null, status: BranchStatus.ACTIVE},
        },
        select: {id: true, branchId: true},
    });
    // Never 401 here: the app signs the user out on 401
    if (!shop) throw new ApiError(httpStatus.FORBIDDEN, SHOP_REFUSED);

    req.user = {
        ...req.user,
        role: Role.SHOP_ADMIN,
        realRole: Role.ADMIN,
        shopId: shop.id,
        branchId: shop.branchId,
    };
    next();
});

/** Only the company admin in shop mode; the shop's own login and employees cannot */
export const ownerOnly = (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.realRole !== Role.ADMIN) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only the owner can approve refunds here');
    }
    next();
};
