import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import branchReportsService, {pnlQuerySchema} from '../services/branchReports.service';
import prisma from '../client';

const branchOf = (req: Request) => {
    const {companyId, branchId} = req.user;
    if (!companyId || !branchId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch is linked to this account');
    }
    return {companyId, branchId};
};

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

const getPnl = catchAsync(async (req, res) => {
    const data = await branchReportsService.getPnl(branchOf(req), pnlQuerySchema.parse(req.query));
    return ok(res, data, 'Report fetched successfully');
});

/** Shop login: the same report for its own shop */
const getShopPnl = catchAsync(async (req, res) => {
    const {companyId, shopId} = req.user;
    const shop = shopId
        ? await prisma.shop.findFirst({
              where: {id: shopId, companyId: companyId ?? undefined},
              select: {branchId: true},
          })
        : null;
    if (!companyId || !shopId || !shop) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
    }
    const data = await branchReportsService.getPnl(
        {companyId, branchId: shop.branchId, shopId},
        pnlQuerySchema.parse(req.query),
    );
    return ok(res, data, 'Report fetched successfully');
});

export default {
    getPnl,
    getShopPnl,
};

