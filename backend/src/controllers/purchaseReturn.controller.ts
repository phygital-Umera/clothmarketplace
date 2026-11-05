import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '@utils/catchAsync';
import ApiError from '@utils/ApiError';
import purchaseReturnService from '../services/purchaseReturn.service';
import { createPurchaseReturnSchema } from '../validations/purchaseReturn.validation';
import { ShopScope } from '../services/shopProduct.service';

const shopOf = (req: Request): ShopScope => {
  const { companyId, shopId } = req.user as any;
  if (!companyId || !shopId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
  }
  return { companyId, shopId };
};

export const getNextDebitNoteNumber = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const nextNumber = await purchaseReturnService.getNextDebitNoteNumber(scope);
  res.status(httpStatus.OK).json({ success: true, nextNumber });
});

export const getSuppliers = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const suppliers = await purchaseReturnService.getSuppliers(scope);
  res.status(httpStatus.OK).json({ success: true, data: suppliers });
});

export const getBillsBySupplier = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const supplierName = req.query.supplierName as string | undefined;
  const bills = await purchaseReturnService.getBillsBySupplier(scope, supplierName);
  res.status(httpStatus.OK).json({ success: true, data: bills });
});

export const getEarlierReturns = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const earlierReturns = await purchaseReturnService.getEarlierReturns(scope);
  res.status(httpStatus.OK).json({ success: true, data: earlierReturns });
});

export const createPurchaseReturn = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const actorId = req.user?.id || 'user-admin';
  const validated = createPurchaseReturnSchema.parse(req.body);
  const result = await purchaseReturnService.createPurchaseReturn(scope, actorId, validated);
  res.status(httpStatus.CREATED).json({ success: true, data: result });
});

export const getPurchaseReturn = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const { id } = req.params;
  const pr = await purchaseReturnService.getPurchaseReturn(scope, id);
  res.status(httpStatus.OK).json({ success: true, data: pr });
});

export default {
  getNextDebitNoteNumber,
  getSuppliers,
  getBillsBySupplier,
  getEarlierReturns,
  createPurchaseReturn,
  getPurchaseReturn,
};

