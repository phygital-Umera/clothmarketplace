import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import stockService, { Scope } from '../services/stock.service';
import {adjustStockSchema, physicalCountSchema} from '../validations/stockAdjustment.validation';
import { catchAsync, ApiError, ApiResponse } from '../utils';

const scopeOf = (req: Request): Scope => {
  const { role, companyId, branchId, shopId } = req.user;
  if (role === Role.SUPER_ADMIN) return { companyId: companyId || '', branchId: branchId || '', shopId: shopId || undefined };
  if (!companyId) throw new ApiError(httpStatus.FORBIDDEN, 'No company is linked to this account');
  return { companyId, branchId: branchId || '', shopId: shopId || undefined };
};

export const getStockSummary = catchAsync(async (req: Request, res: Response) => {
  const scope = scopeOf(req);
  const result = await stockService.getStockSummary(scope, req.query as any);
  return res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, result, 'Stock summary fetched successfully'));
});

export const adjustStock = catchAsync(async (req: Request, res: Response) => {
  const scope = scopeOf(req);
  const actorId = req.user?.id || 'system';
  const result = await stockService.adjustStock(scope, actorId, adjustStockSchema.parse(req.body));
  return res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, result, result.message));
});

export const recordPhysicalStockCount = catchAsync(async (req: Request, res: Response) => {
  const scope = scopeOf(req);
  const actorId = req.user?.id || 'system';
  const result = await stockService.recordPhysicalStockCount(scope, actorId, physicalCountSchema.parse(req.body));
  return res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, result, result.message));
});
