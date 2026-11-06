import httpStatus from 'http-status';
import {Prisma} from '@prisma/client';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {ShopScope} from './shopProduct.service';
import {
  CreateCustomer,
  CustomerListQuery,
  UpdateCustomer,
  createCustomerSchema,
} from '../validations/customer.validation';

/*
 * Shop customers. Their balanceDue / totalBought are kept up to date by every
 * sales bill change (see customerLedger.ts) and by credit receipts.
 */
class CustomerService {
  public list = async (scope: ShopScope, query: CustomerListQuery) => {
    const search = (query.search || query.q || '').trim();
    const tab = query.tab || 'ALL';
    const page = query.page;
    const limit = query.limit;

    const base: Prisma.ShopCustomerWhereInput = {shopId: scope.shopId, isActive: true};
    const where: Prisma.ShopCustomerWhereInput = {
      ...base,
      ...(tab === 'WITH_DUE' ? {balanceDue: {gt: 0}} : {}),
      ...(tab === 'B2B' ? {customerType: 'B2B'} : {}),
      ...(search
        ? {
            OR: (['name', 'mobile', 'businessName', 'gstin'] as const).map((f) => ({
              [f]: {contains: search, mode: 'insensitive' as const},
            })),
          }
        : {}),
    };

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [items, total, totalCustomers, newThisMonth, onCreditCount, due, b2bCount] =
      await prisma.$transaction([
        prisma.shopCustomer.findMany({
          where,
          orderBy: {createdAt: 'desc'},
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.shopCustomer.count({where}),
        prisma.shopCustomer.count({where: base}),
        prisma.shopCustomer.count({where: {...base, createdAt: {gte: monthStart}}}),
        prisma.shopCustomer.count({where: {...base, balanceDue: {gt: 0}}}),
        prisma.shopCustomer.aggregate({where: base, _sum: {balanceDue: true}}),
        prisma.shopCustomer.count({where: {...base, customerType: 'B2B'}}),
      ]);

    return {
      items,
      pagination: {total, page, limit, totalPages: Math.ceil(total / limit) || 1},
      metrics: {
        totalCustomers,
        newThisMonth,
        onCreditCount,
        totalDue: Math.round((due._sum.balanceDue ?? 0) * 100) / 100,
        b2bCount,
      },
    };
  };

  public get = async (scope: ShopScope, id: string) => {
    const customer = await prisma.shopCustomer.findFirst({where: {id, shopId: scope.shopId}});
    if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');

    const bills = await prisma.salesBill.findMany({
      where: {shopId: scope.shopId, customerPhone: customer.mobile, deletedAt: null},
      orderBy: {billDate: 'desc'},
      take: 10,
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        totalAmount: true,
        balanceDue: true,
        paymentStatus: true,
        paymentMethod: true,
      },
    });
    return {...customer, bills};
  };

  private assertMobileFree = async (scope: ShopScope, mobile: string, exceptId?: string) => {
    const taken = await prisma.shopCustomer.findFirst({
      where: {shopId: scope.shopId, mobile, ...(exceptId ? {NOT: {id: exceptId}} : {})},
      select: {id: true},
    });
    if (taken) {
      const message = 'A customer with this mobile number already exists';
      throw new ApiError(httpStatus.CONFLICT, message, [{field: 'mobile', message}]);
    }
  };

  public create = async (scope: ShopScope, data: CreateCustomer) => {
    await this.assertMobileFree(scope, data.mobile);
    const shop = await prisma.shop.findFirst({
      where: {id: scope.shopId},
      select: {companyId: true, branchId: true},
    });
    if (!shop) throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');

    const created = await prisma.shopCustomer.create({
      data: {
        ...data,
        shopId: scope.shopId,
        companyId: shop.companyId,
        branchId: shop.branchId,
        // The opening due is what the customer owes from before
        balanceDue: data.openingDue,
      },
    });
    return this.get(scope, created.id);
  };

  public update = async (scope: ShopScope, id: string, data: UpdateCustomer) => {
    const current = await this.get(scope, id);
    if (data.mobile && data.mobile !== current.mobile) {
      // Bills are matched to customers by mobile number
      const hasBills = await prisma.salesBill.count({
        where: {shopId: scope.shopId, customerPhone: current.mobile, deletedAt: null},
      });
      if (hasBills) {
        throw new ApiError(
          httpStatus.CONFLICT,
          'This customer already has bills on this mobile number, so it cannot be changed',
          [{field: 'mobile', message: 'Mobile number is linked to existing bills'}],
        );
      }
      await this.assertMobileFree(scope, data.mobile, id);
    }
    await prisma.shopCustomer.update({where: {id}, data});
    return this.get(scope, id);
  };

  /** Rows that fail validation or already exist are skipped and reported */
  public importExcel = async (scope: ShopScope, rows: Record<string, unknown>[]) => {
    let imported = 0;
    const skipped: {row: number; reason: string}[] = [];
    for (const [i, r] of rows.entries()) {
      const parsed = createCustomerSchema.safeParse({
        name: r.Name ?? r.name,
        mobile: String(r.Mobile ?? r.mobile ?? r.Phone ?? r.phone ?? ''),
        customerType: String(r.Type ?? r.customerType ?? '').toUpperCase() === 'B2B' ? 'B2B' : 'Retail',
        businessName: r.BusinessName ?? r.businessName,
        gstin: r.GSTIN ?? r.gstin,
        address: r.Address ?? r.address,
        creditLimit: r.CreditLimit ?? r.creditLimit ?? 0,
        openingDue: r.OpeningDue ?? r.openingDue ?? 0,
      });
      if (!parsed.success) {
        skipped.push({row: i + 1, reason: parsed.error.errors[0]?.message ?? 'Invalid row'});
        continue;
      }
      try {
        await this.create(scope, parsed.data);
        imported++;
      } catch (e) {
        skipped.push({row: i + 1, reason: e instanceof ApiError ? e.message : 'Could not save'});
      }
    }
    return {imported, total: rows.length, skipped};
  };
}

export default new CustomerService();
