import {Request, Response} from 'express';
import httpStatus from 'http-status';
import {ApiError, ApiResponse} from '@utils/index';
import {ShopScope} from '../services/shopProduct.service';
import {BranchScope} from '../services/customerDue.service';

/** The signed-in user's shop; never taken from the request */
export const shopOf = (req: Request): ShopScope => {
    const {companyId, shopId} = req.user;
    if (!companyId || !shopId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
    }
    return {companyId, shopId};
};

/** The signed-in branch admin's branch */
export const branchOf = (req: Request): BranchScope => {
    const {companyId, branchId} = req.user;
    if (!companyId || !branchId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch is linked to this account');
    }
    return {companyId, branchId};
};

export const ok = (res: Response, data: unknown, message: string, status = 200) =>
    res.status(status).json(new ApiResponse(status, data, message));
