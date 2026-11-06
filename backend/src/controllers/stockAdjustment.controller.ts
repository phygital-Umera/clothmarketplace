import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import stockAdjustmentService, { Scope } from '../services/stockAdjustment.service';
import {createAdjustmentSchema, getAdjustmentsQuerySchema} from '../validations/stockAdjustment.validation';
import { catchAsync, ApiError, ApiResponse } from '../utils';

const scopeOf = (req: Request): Scope => {
  const { role, companyId, branchId, shopId } = req.user;
  if (role === Role.SUPER_ADMIN) return { companyId: companyId || '', branchId: branchId || '', shopId: shopId || undefined };
  if (!companyId) throw new ApiError(httpStatus.FORBIDDEN, 'No company is linked to this account');
  return { companyId, branchId: branchId || '', shopId: shopId || undefined };
};

export const getNextAdjustmentNumber = catchAsync(async (req: Request, res: Response) => {
  const scope = scopeOf(req);
  const result = await stockAdjustmentService.getNextAdjustmentNumber(scope);
  return res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, result, 'Next adjustment number fetched'));
});

export const getAdjustmentVariants = catchAsync(async (req: Request, res: Response) => {
  const scope = scopeOf(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const result = await stockAdjustmentService.getAdjustmentVariants(scope, search);
  return res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, result, 'Variants fetched successfully'));
});

export const getAdjustmentHistory = catchAsync(async (req: Request, res: Response) => {
  const scope = scopeOf(req);
  const result = await stockAdjustmentService.getAdjustmentHistory(scope, getAdjustmentsQuerySchema.parse(req.query));
  return res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, result, 'Adjustment history fetched successfully'));
});

export const createAdjustment = catchAsync(async (req: Request, res: Response) => {
  const scope = scopeOf(req);
  const actorId = req.user?.id || 'system';
  const actorName = req.user?.fullname || '';
  const data = createAdjustmentSchema.parse(req.body);
  const result = await stockAdjustmentService.createAdjustment(scope, actorId, actorName, data);
  return res.status(httpStatus.CREATED).json(new ApiResponse(httpStatus.CREATED, result, result.message));
});

