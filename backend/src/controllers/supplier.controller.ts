import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import supplierService from '../services/supplier.service';
import { createSupplierSchema, recordSupplierPaymentSchema } from '../validations/supplier.validation';

const resolveScope = async (req: Request) => {
  const user = req.user as any;
  const companyId = user?.companyId;
  let branchId = user?.branchId;
  let shopId = user?.shopId;

  if (!branchId && shopId) {
    const shop: any[] = await prisma.$queryRawUnsafe(`
      SELECT "branchId" FROM "Shop" WHERE "id" = $1 LIMIT 1
    `, shopId);
    branchId = shop[0]?.branchId;
  }
  if (!branchId && companyId) {
    const branch: any[] = await prisma.$queryRawUnsafe(`
      SELECT "id" FROM "Branch" WHERE "companyId" = $1 LIMIT 1
    `, companyId);
    branchId = branch[0]?.id;
  }

  if (!companyId || !branchId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User is not linked to a company or branch');
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
