import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import barcodeLabelService from '../services/barcodeLabel.service';
import { printBarcodeLabelsSchema } from '../validations/barcodeLabel.validation';

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

export const getPurchaseBills = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const data = await barcodeLabelService.getPurchaseBills(scope);
  res.status(httpStatus.OK).json({ success: true, data });
});

export const getBillItems = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const { billId } = req.params;
  const data = await barcodeLabelService.getBillItemsForLabels(scope, billId);
  res.status(httpStatus.OK).json({ success: true, data });
});

export const searchProducts = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const search = req.query.search as string | undefined;
  const data = await barcodeLabelService.searchProductsForLabels(scope, search);
  res.status(httpStatus.OK).json({ success: true, data });
});

export const getReprintBatches = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const data = await barcodeLabelService.getReprintBatches(scope);
  res.status(httpStatus.OK).json({ success: true, data });
});

export const recordPrintJob = catchAsync(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const actorId = req.user?.id || 'admin';
  const validated = printBarcodeLabelsSchema.parse(req.body);
  const data = await barcodeLabelService.recordPrintJob(scope, actorId, validated);
  res.status(httpStatus.CREATED).json({ success: true, data });
});

