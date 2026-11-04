import httpStatus from 'http-status';
import {randomUUID} from 'crypto';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {ShopScope} from './shopProduct.service';
import {CreateCustomer, CustomerListQuery, UpdateCustomer} from '../validations/customer.validation';

export interface ShopCustomerRecord {
  id: string;
  shopId: string;
  companyId: string;
  branchId: string;
  name: string;
  mobile: string;
  customerType: string;
  businessName: string | null;
  gstin: string | null;
  address: string | null;
  creditLimit: number;
  openingDue: number;
  totalBought: number;
  balanceDue: number;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class CustomerService {
  /**
   * Sync past customers from confirmed SalesBills into ShopCustomer if not already present
   */
  public syncFromSalesBills = async (scope: ShopScope) => {
    try {
      const bills = await prisma.salesBill.findMany({
        where: {
          shopId: scope.shopId,
          deletedAt: null,
          status: 'CONFIRMED',
          customerPhone: {not: null},
        },
        select: {
          customerName: true,
          customerPhone: true,
          totalAmount: true,
          balanceDue: true,
        },
      });

      for (const b of bills) {
        if (!b.customerPhone) continue;
        const phone = b.customerPhone.trim();
        const existing = await prisma.$queryRaw<ShopCustomerRecord[]>`
          SELECT * FROM "ShopCustomer" WHERE "shopId" = ${scope.shopId} AND "mobile" = ${phone} LIMIT 1
        `;

        if (!existing || existing.length === 0) {
          const id = randomUUID();
          const name = b.customerName?.trim() || 'Customer';
          await prisma.$executeRawUnsafe(
            `INSERT INTO "ShopCustomer" ("id", "shopId", "companyId", "branchId", "name", "mobile", "customerType", "creditLimit", "openingDue", "totalBought", "balanceDue")
             VALUES ($1, $2, $3, $4, $5, $6, 'Retail', 0, 0, $7, $8)
             ON CONFLICT ("shopId", "mobile") DO UPDATE SET "totalBought" = "ShopCustomer"."totalBought" + $7`,
            id,
            scope.shopId,
            scope.companyId,
            scope.shopId, // fallback branch
            name,
            phone,
            b.totalAmount || 0,
            b.balanceDue || 0,
          );
        }
      }
    } catch (err) {
      console.warn('Customer auto-sync note:', err);
    }
  };

  public list = async (scope: ShopScope, query: CustomerListQuery) => {
    await this.syncFromSalesBills(scope);

    const search = (query.search || query.q || '').trim();
    const tab = query.tab || 'ALL';
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    // Base WHERE
    let whereClause = `WHERE "shopId" = '${scope.shopId}' AND "isActive" = true`;

    if (search) {
      const sanitized = search.replace(/'/g, "''");
      whereClause += ` AND (
        "name" ILIKE '%${sanitized}%' OR
        "mobile" ILIKE '%${sanitized}%' OR
        "businessName" ILIKE '%${sanitized}%' OR
        "gstin" ILIKE '%${sanitized}%'
      )`;
    }

    if (tab === 'WITH_DUE') {
      whereClause += ` AND "balanceDue" > 0`;
    } else if (tab === 'B2B') {
      whereClause += ` AND "customerType" = 'B2B'`;
    }

    const items = await prisma.$queryRawUnsafe<ShopCustomerRecord[]>(`
      SELECT * FROM "ShopCustomer"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await prisma.$queryRawUnsafe<[{count: string | number}]>(`
      SELECT COUNT(*) as count FROM "ShopCustomer"
      ${whereClause}
    `);
    const total = Number(countResult[0]?.count || 0);

    // Compute Metrics
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const metricsRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN "createdAt" >= '${firstDayMonth}' THEN 1 END) as new_this_month,
        COUNT(CASE WHEN "balanceDue" > 0 THEN 1 END) as on_credit_count,
        COALESCE(SUM("balanceDue"), 0) as total_due,
        COUNT(CASE WHEN "customerType" = 'B2B' THEN 1 END) as b2b_count
      FROM "ShopCustomer"
      WHERE "shopId" = '${scope.shopId}' AND "isActive" = true
    `);

    const metricsRow = metricsRaw[0] || {};
    const metrics = {
      totalCustomers: Number(metricsRow.total_customers || 0),
      newThisMonth: Number(metricsRow.new_this_month || 0),
      onCreditCount: Number(metricsRow.on_credit_count || 0),
      totalDue: Math.round(Number(metricsRow.total_due || 0) * 100) / 100,
      b2bCount: Number(metricsRow.b2b_count || 0),
    };

    return {
      items: items.map((c) => ({
        ...c,
        creditLimit: Number(c.creditLimit || 0),
        openingDue: Number(c.openingDue || 0),
        totalBought: Number(c.totalBought || 0),
        balanceDue: Number(c.balanceDue || 0),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      metrics,
    };
  };

  public get = async (scope: ShopScope, id: string) => {
    const rows = await prisma.$queryRaw<ShopCustomerRecord[]>`
      SELECT * FROM "ShopCustomer" WHERE "id" = ${id} AND "shopId" = ${scope.shopId} LIMIT 1
    `;
    if (!rows || rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
    }
    const customer = rows[0];

    // Recent sales bills for this customer
    const bills = await prisma.salesBill.findMany({
      where: {
        shopId: scope.shopId,
        customerPhone: customer.mobile,
        deletedAt: null,
      },
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

    return {
      ...customer,
      bills,
    };
  };

  public create = async (scope: ShopScope, data: CreateCustomer) => {
    const mobile = data.mobile.trim();
    const existing = await prisma.$queryRaw<ShopCustomerRecord[]>`
      SELECT * FROM "ShopCustomer" WHERE "shopId" = ${scope.shopId} AND "mobile" = ${mobile} LIMIT 1
    `;
    if (existing && existing.length > 0) {
      throw new ApiError(httpStatus.CONFLICT, 'A customer with this mobile number already exists');
    }

    const shop = await prisma.shop.findUnique({
      where: {id: scope.shopId},
      select: {companyId: true, branchId: true},
    });

    const id = randomUUID();
    const companyId = scope.companyId || shop?.companyId || '';
    const branchId = shop?.branchId || '';
    const openingDue = Number(data.openingDue || 0);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ShopCustomer" (
        "id", "shopId", "companyId", "branchId", "name", "mobile",
        "customerType", "businessName", "gstin", "address",
        "creditLimit", "openingDue", "totalBought", "balanceDue", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13, $14)`,
      id,
      scope.shopId,
      companyId,
      branchId,
      data.name.trim(),
      mobile,
      data.customerType || 'Retail',
      data.businessName?.trim() || null,
      data.gstin?.trim() || null,
      data.address?.trim() || null,
      Number(data.creditLimit || 0),
      openingDue,
      openingDue,
      data.notes?.trim() || null,
    );

    return this.get(scope, id);
  };

  public update = async (scope: ShopScope, id: string, data: UpdateCustomer) => {
    await this.get(scope, id);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`"name" = $${idx++}`);
      values.push(data.name.trim());
    }
    if (data.mobile !== undefined) {
      fields.push(`"mobile" = $${idx++}`);
      values.push(data.mobile.trim());
    }
    if (data.customerType !== undefined) {
      fields.push(`"customerType" = $${idx++}`);
      values.push(data.customerType);
    }
    if (data.businessName !== undefined) {
      fields.push(`"businessName" = $${idx++}`);
      values.push(data.businessName?.trim() || null);
    }
    if (data.gstin !== undefined) {
      fields.push(`"gstin" = $${idx++}`);
      values.push(data.gstin?.trim() || null);
    }
    if (data.address !== undefined) {
      fields.push(`"address" = $${idx++}`);
      values.push(data.address?.trim() || null);
    }
    if (data.creditLimit !== undefined) {
      fields.push(`"creditLimit" = $${idx++}`);
      values.push(Number(data.creditLimit));
    }
    if (data.notes !== undefined) {
      fields.push(`"notes" = $${idx++}`);
      values.push(data.notes?.trim() || null);
    }

    if (fields.length > 0) {
      fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
      values.push(id);
      values.push(scope.shopId);
      const sql = `UPDATE "ShopCustomer" SET ${fields.join(', ')} WHERE "id" = $${idx++} AND "shopId" = $${idx++}`;
      await prisma.$executeRawUnsafe(sql, ...values);
    }

    return this.get(scope, id);
  };

  public importExcel = async (scope: ShopScope, rows: any[]) => {
    let imported = 0;
    for (const r of rows) {
      const name = String(r.Name || r.name || '').trim();
      const mobile = String(r.Mobile || r.mobile || r.Phone || r.phone || '').trim();
      if (!name || !mobile) continue;

      const customerType = String(r.Type || r.customerType || 'Retail').toUpperCase() === 'B2B' ? 'B2B' : 'Retail';
      const creditLimit = Number(r.CreditLimit || r.creditLimit || 0);
      const openingDue = Number(r.OpeningDue || r.openingDue || 0);

      try {
        await this.create(scope, {
          name,
          mobile,
          customerType: customerType as any,
          businessName: r.BusinessName || r.businessName || null,
          gstin: r.GSTIN || r.gstin || null,
          address: r.Address || r.address || null,
          creditLimit,
          openingDue,
        });
        imported++;
      } catch {
        // Skip duplicate or invalid
      }
    }
    return {imported, total: rows.length};
  };
}

export default new CustomerService();

