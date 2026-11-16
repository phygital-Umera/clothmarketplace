import {Request} from 'express';
import httpStatus from 'http-status';
import {auditService, shopGstService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import shopGstValidation from '../validations/shopGst.validation';

/* The open shop's GST price rule and slabs (D-18) */

const shopIdOf = (req: Request) => {
    const {shopId} = req.user;
    if (!shopId) throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
    return shopId;
};

const get = catchAsync(async (req, res) => {
    const data = await shopGstService.get(shopIdOf(req));
    res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, data, 'GST rule'));
});

const update = catchAsync(async (req, res) => {
    const shopId = shopIdOf(req);
    const rule = shopGstValidation.gstRuleSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'shop.gstRule.update', module: 'settings', targetId: shopId},
        () => shopGstService.update(shopId, rule),
    );
    res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, after, 'GST rule saved'));
});

export default {get, update};
