import prisma from '../client';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import { PrintBarcodeLabelsInput } from '../validations/barcodeLabel.validation';

export type Scope = {
  companyId: string;
  branchId: string;
  shopId?: string;
};

class BarcodeLabelService {
  /**
   * Get purchase bills list for dropdown
   */
  public async getPurchaseBills(scope: Scope) {
    const bills: any[] = await prisma.$queryRawUnsafe(`
      SELECT b."id", b."billNumber", b."supplierName", b."billDate", b."status",
             COALESCE(SUM(bi."quantity"), 0)::int as "totalQuantity",
             COUNT(bi."id")::int as "itemsCount"
      FROM "PurchaseBill" b
      LEFT JOIN "PurchaseBillItem" bi ON bi."billId" = b."id"
      WHERE b."branchId" = $1
      GROUP BY b."id", b."billNumber", b."supplierName", b."billDate", b."status"
      ORDER BY b."billDate" DESC
    `, scope.branchId);

    return {
      bills: bills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        supplierName: b.supplierName,
        billDate: b.billDate,
        totalQuantity: b.totalQuantity,
        itemsCount: b.itemsCount,
        label: `${b.billNumber} · ${b.supplierName}`,
      })),
    };
  }

  /**
   * Get items of a purchase bill formatted for barcode labels
   */
  public async getBillItemsForLabels(scope: Scope, billIdOrNumber: string) {
    const bills: any[] = await prisma.$queryRawUnsafe(`
      SELECT "id", "billNumber", "supplierName"
      FROM "PurchaseBill"
      WHERE "branchId" = $1 AND ("id" = $2 OR "billNumber" = $2)
      LIMIT 1
    `, scope.branchId, billIdOrNumber);

    if (!bills.length) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase bill not found');
    }

    const bill = bills[0];

    const items: any[] = await prisma.$queryRawUnsafe(`
      SELECT bi."id", bi."productId", bi."variantId", bi."quantity", bi."unitCost",
             p."name" as "productName",
             COALESCE(v."size", 'Free') as "size",
             COALESCE(v."variantSku", p."sku") as "barcode",
             COALESCE(v."mrp", p."mrp", 0)::float as "mrp",
             COALESCE(v."sellingPrice", p."sellingPrice", 0)::float as "price"
      FROM "PurchaseBillItem" bi
      JOIN "Product" p ON p."id" = bi."productId"
      LEFT JOIN "ProductVariant" v ON v."id" = bi."variantId"
      WHERE bi."billId" = $1
      ORDER BY bi."id" ASC
    `, bill.id);

    let totalLabels = 0;
    const formattedItems = items.map((i) => {
      const labelCount = Math.max(1, Number(i.quantity || 1));
      totalLabels += labelCount;

      return {
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        size: i.size,
        barcode: i.barcode,
        mrp: Number(i.mrp || 0),
        price: Number(i.price || 0),
        labels: labelCount,
        selected: true,
      };
    });

    return {
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        supplierName: bill.supplierName,
      },
      items: formattedItems,
      totalLabels,
    };
  }

  /**
   * Search catalog products/variants for "PICK PRODUCTS" tab
   */
  public async searchProductsForLabels(scope: Scope, search?: string) {
    let whereClause = `WHERE p."companyId" = '${scope.companyId}'`;
    if (search && search.trim()) {
      const q = search.trim().replace(/'/g, "''");
      whereClause += ` AND (p."name" ILIKE '%${q}%' OR p."sku" ILIKE '%${q}%' OR v."variantSku" ILIKE '%${q}%')`;
    }

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT p."id" as "productId", p."name" as "productName",
             v."id" as "variantId", COALESCE(v."size", 'Free') as "size",
             COALESCE(v."variantSku", p."sku") as "barcode",
             COALESCE(v."mrp", p."mrp", 0)::float as "mrp",
             COALESCE(v."sellingPrice", p."sellingPrice", 0)::float as "price"
      FROM "Product" p
      LEFT JOIN "ProductVariant" v ON v."productId" = p."id"
      ${whereClause}
      ORDER BY p."name" ASC, v."size" ASC
      LIMIT 50
    `);

    return {
      items: rows.map((r) => ({
        id: r.variantId || r.productId,
        productId: r.productId,
        variantId: r.variantId,
        productName: r.productName,
        size: r.size,
        barcode: r.barcode,
        mrp: Number(r.mrp || 0),
        price: Number(r.price || 0),
        labels: 1,
        selected: false,
      })),
    };
  }

  /**
   * Get reprint batches for "REPRINT" tab
   */
  public async getReprintBatches(scope: Scope) {
    const batches: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "BarcodePrintJob"
      WHERE "branchId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 20
    `, scope.branchId);

    return {
      batches: batches.map((b) => ({
        id: b.id,
        jobId: b.jobId,
        sourceType: b.sourceType,
        sourceRef: b.sourceRef,
        labelSize: b.labelSize,
        printer: b.printer,
        totalLabels: b.totalLabels,
        itemsSummary: b.itemsSummary,
        createdAt: b.createdAt,
      })),
    };
  }

  /**
   * Save a print job record
   */
  public async recordPrintJob(scope: Scope, actorId: string, input: PrintBarcodeLabelsInput) {
    const countRes: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*) as count FROM "BarcodePrintJob" WHERE "branchId" = $1
    `, scope.branchId);
    const count = parseInt(countRes[0]?.count ?? '0', 10) + 1;
    const jobId = `JOB-${String(count).padStart(4, '0')}`;
    const id = `job-${Date.now()}`;

    await prisma.$executeRawUnsafe(`
      INSERT INTO "BarcodePrintJob" (
        "id", "jobId", "shopId", "branchId", "companyId", "sourceType", "sourceRef",
        "labelSize", "printer", "showShopName", "showItemNameSize", "showMrp", "showSalePrice",
        "showCostCode", "totalLabels", "itemsSummary", "createdById", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, CURRENT_TIMESTAMP
      )
    `, id, jobId, scope.shopId || null, scope.branchId, scope.companyId, input.sourceType,
       input.sourceRef || null, input.labelSize, input.printer, input.showShopName,
       input.showItemNameSize, input.showMrp, input.showSalePrice, input.showCostCode,
       input.totalLabels, JSON.stringify(input.items), actorId);

    return {
      success: true,
      jobId,
      totalLabels: input.totalLabels,
      message: `Print job ${jobId} with ${input.totalLabels} labels queued successfully to ${input.printer}`,
    };
  }
}

export default new BarcodeLabelService();

