import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '@utils/catchAsync';
import ApiError from '@utils/ApiError';
import creditService from '../services/credit.service';
import { receivePaymentSchema } from '../validations/credit.validation';
import { ShopScope } from '../services/shopProduct.service';

const shopOf = (req: Request): ShopScope => {
  const { companyId, shopId } = req.user as any;
  if (!companyId || !shopId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
  }
  return { companyId, shopId };
};

export const getMetrics = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const data = await creditService.getMetrics(scope);
  res.status(httpStatus.OK).json({ success: true, data });
});

export const getCustomersWithDue = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const search = req.query.search as string | undefined;
  const data = await creditService.getCustomersWithDue(scope, search);
  res.status(httpStatus.OK).json({ success: true, data });
});

export const getCustomerStatement = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const { customerId } = req.params;
  const data = await creditService.getCustomerStatement(scope, customerId);
  res.status(httpStatus.OK).json({ success: true, data });
});

export const getNextReceiptNumber = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const receiptNumber = await creditService.getNextReceiptNumber(scope);
  res.status(httpStatus.OK).json({ success: true, receiptNumber });
});

export const recordPayment = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const { customerId } = req.params;
  const actorId = req.user?.id || 'user-admin';
  const validated = receivePaymentSchema.parse(req.body);
  const result = await creditService.recordPayment(scope, customerId, actorId, validated);
  res.status(httpStatus.CREATED).json({ success: true, data: result });
});

export const getWhatsAppReminders = catchAsync(async (req: Request, res: Response) => {
  const scope = shopOf(req);
  const customerId = req.query.customerId as string | undefined;
  const reminders = await creditService.getWhatsAppReminders(scope, customerId);
  res.status(httpStatus.OK).json({ success: true, data: reminders });
});

export default {
  getMetrics,
  getCustomersWithDue,
  getCustomerStatement,
  getNextReceiptNumber,
  recordPayment,
  getWhatsAppReminders,
};
