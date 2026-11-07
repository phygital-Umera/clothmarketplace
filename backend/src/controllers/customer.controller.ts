import {Request} from 'express';
import httpStatus from 'http-status';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import prisma from '../client';
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
  /** People who bought from this shop on the online store */
  online: catchAsync(async (req, res) => {
    const scope = shopOf(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const rows = await prisma.order.groupBy({
      by: ['customerId'],
      where: {shopId: scope.shopId, status: {not: 'CANCELLED'}},
      _count: {_all: true},
      _sum: {totalAmount: true},
      _max: {createdAt: true},
      orderBy: {_max: {createdAt: 'desc'}},
    });
    const users = await prisma.user.findMany({
      where: {
        id: {in: rows.map((r) => r.customerId)},
        ...(search
          ? {OR: [{fullname: {contains: search, mode: 'insensitive'}}, {phoneNumber: {contains: search}}, {email: {contains: search, mode: 'insensitive'}}]}
          : {}),
      },
      select: {id: true, fullname: true, phoneNumber: true, email: true},
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const items = rows
      .filter((r) => byId.has(r.customerId))
      .map((r) => ({
        ...byId.get(r.customerId)!,
        orders: r._count._all,
        spent: Math.round((r._sum.totalAmount ?? 0) * 100) / 100,
        lastOrderAt: r._max.createdAt,
      }));
    return ok(res, {items, total: items.length}, 'Online customers fetched');
  }),

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

