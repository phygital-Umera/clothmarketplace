import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import supplierService from '../services/supplier.service';
import { createSupplierSchema, recordSupplierPaymentSchema } from '../validations/supplier.validation';

// Suppliers belong to a branch: a shop login uses its shop's branch
const resolveScope = async (req: Request) => {
  const user = req.user as any;
  const companyId = user?.companyId;
  let branchId = user?.branchId;
  const shopId = user?.shopId;
  if (!branchId && shopId) {
    const shop = await prisma.shop.findFirst({where: {id: shopId}, select: {branchId: true}});
    branchId = shop?.branchId;
  }
  if (!companyId || !branchId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'This account is not linked to a branch');
  }
  return { companyId, branchId, shopId };
};

export const listSuppliers = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const search = req.query.search as string | undefined;
  const data = await supplierService.listSuppliers(scope, search);
  res.status(httpStatus.OK).json({ success: true, data });
});

export const getSupplierLedger = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const { id } = req.params;
  const data = await supplierService.getSupplierLedger(scope, id);
  res.status(httpStatus.OK).json({ success: true, data });
});

export const createSupplier = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const validated = createSupplierSchema.parse(req.body);
  const data = await supplierService.createSupplier(scope, validated);
  res.status(httpStatus.CREATED).json({ success: true, data });
});

export const recordPayment = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const actorId = req.user?.id || 'admin';
  const validated = recordSupplierPaymentSchema.parse(req.body);
  const data = await supplierService.recordPayment(scope, actorId, validated);
  res.status(httpStatus.CREATED).json({ success: true, data });
});

export const getNextReceipt = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const receiptNumber = await supplierService.getNextReceiptNumber(scope.branchId);
  res.status(httpStatus.OK).json({ success: true, receiptNumber });
});
