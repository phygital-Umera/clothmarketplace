import {Request} from 'express';
import httpStatus from 'http-status';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import customerService from '../services/customer.service';
import {
  createCustomerSchema,
  customerListQuerySchema,
  updateCustomerSchema,
} from '../validations/customer.validation';
import {ShopScope} from '../services/shopProduct.service';

const shopOf = (req: Request): ShopScope => {
  const {companyId, shopId} = req.user;
  if (!companyId || !shopId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
  }
  return {companyId, shopId};
};

const ok = (
  res: Parameters<Parameters<typeof catchAsync>[0]>[1],
  data: unknown,
  message: string,
  status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

export const customerController = {
  list: catchAsync(async (req, res) => {
    const query = customerListQuerySchema.parse(req.query);
    const result = await customerService.list(shopOf(req), query);
    return ok(res, result, 'Customers fetched successfully');
  }),

  get: catchAsync(async (req, res) => {
    const {id} = req.params;
    const result = await customerService.get(shopOf(req), id);
    return ok(res, result, 'Customer fetched successfully');
  }),

  create: catchAsync(async (req, res) => {
    const data = createCustomerSchema.parse(req.body);
    const result = await customerService.create(shopOf(req), data);
    return ok(res, result, 'Customer created successfully', httpStatus.CREATED);
  }),

  update: catchAsync(async (req, res) => {
    const {id} = req.params;
    const data = updateCustomerSchema.parse(req.body);
    const result = await customerService.update(shopOf(req), id, data);
    return ok(res, result, 'Customer updated successfully');
  }),

  importExcel: catchAsync(async (req, res) => {
    const rows = Array.isArray(req.body) ? req.body : req.body.rows || [];
    const result = await customerService.importExcel(shopOf(req), rows);
    return ok(res, result, `Imported ${result.imported} customers successfully`);
  }),
};

