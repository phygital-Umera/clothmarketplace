import { randomUUID } from 'crypto';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import { MovementType, Prisma, StockSourceType } from '@prisma/client';
import { dayKey, dayRange } from '../utils/day';
import accountService from './account.service';
import { financialYear } from './bill.service';

const SLOW_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

type FlowColumn = 'purchase' | 'sold' | 'salesReturn' | 'transfer' | 'adjust';
/** Which column each movement lands in, and its sign there (sold counts sales out) */
const FLOW: Record<MovementType, [FlowColumn, 1 | -1]> = {
  PURCHASE_IN: ['purchase', 1],
  PURCHASE_REVERSAL: ['purchase', -1],
  SALE_OUT: ['sold', 1],
  SALE_REVERSAL: ['sold', -1],
  RETURN_RESTOCK: ['salesReturn', 1],
  TRANSFER_IN: ['transfer', 1],
  TRANSFER_OUT: ['transfer', -1],
  ADJUSTMENT_INCREASE: ['adjust', 1],
  ADJUSTMENT_DECREASE: ['adjust', -1],
  DAMAGE_WRITE_OFF: ['adjust', -1],
};

export type Scope = {
  companyId: string;
  branchId: string;
  shopId?: string;
};

export interface StockSummaryQuery {
  period?: 'today' | 'this-week' | 'this-month' | 'last-30-days' | 'all-time';
  tab?: 'STOCK_SUMMARY' | 'LOW_OUT' | 'DAMAGED' | 'SLOW_MOVING';
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdjustStockPayload {
  variantId: string;
  type: 'INCREASE' | 'DECREASE' | 'CORRECTION' | 'DAMAGE';
  quantity: number;
  reason: string;
  notes?: string;
}

export interface PhysicalStockCountItem {
  variantId: string;
  systemQty: number;
  countedQty: number;
  reason?: string;
}

export interface PhysicalStockCountPayload {
  notes?: string;
  items: PhysicalStockCountItem[];
}

class StockService {
  /**
   * Helper to resolve branchId
   */
  private async resolveBranchId(scope: Scope): Promise<string> {
    if (scope.branchId) return scope.branchId;
    if (scope.shopId) {
      const shop = await prisma.shop.findUnique({
        where: { id: scope.shopId },
        select: { branchId: true },
      });
      if (shop?.branchId) return shop.branchId;
    }
    const firstBranch = await prisma.branch.findFirst({
      where: { companyId: scope.companyId },
      select: { id: true },
    });
    return firstBranch?.id || '';
  }

  /** A shop its own products; a branch its shops' and shop-less catalog ones */
  private ownProducts(scope: Scope, branchId: string): Prisma.ProductWhereInput {
    return scope.shopId ? { shopId: scope.shopId } : { OR: [{ shopId: null }, { shop: { branchId } }] };
  }

  /** Start of the period (local day); null for all time */
  private periodStart(period: StockSummaryQuery['period'], now: Date): Date | null {
    const daysAgo = (n: number) =>
      dayRange(dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n))).start;
    switch (period) {
      case 'today':
        return daysAgo(0);
      case 'this-week':
        return daysAgo((now.getDay() + 6) % 7); // back to Monday
      case 'last-30-days':
        return daysAgo(29);
      case 'all-time':
        return null;
      default:
        return daysAgo(now.getDate() - 1); // 1st of this month
    }
  }

  /**
   * Stock by item and size: today's count from Inventory, the period's movements by kind,
   * and the opening worked back from them
   */
  public async getStockSummary(scope: Scope, query: StockSummaryQuery) {
    const branchId = await this.resolveBranchId(scope);
    if (!branchId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Branch not found');
    }

    const now = new Date();
    const from = this.periodStart(query.period, now);
    const search = (query.search || '').trim().toLowerCase();
    const tab = query.tab || 'STOCK_SUMMARY';

    const product: Prisma.ProductWhereInput = {
      companyId: scope.companyId,
      deletedAt: null,
      ...this.ownProducts(scope, branchId),
    };
    // Turned-off variants still show while they hold stock
    const variants = await prisma.productVariant.findMany({
      where: {
        product,
        OR: [
          { isActive: true },
          { inventories: { some: { branchId, OR: [{ physicalQty: { gt: 0 } }, { damagedQty: { gt: 0 } }] } } },
        ],
      },
      select: {
        id: true,
        productId: true,
        variantSku: true,
        size: true,
        color: true,
        mrp: true,
        sellingPrice: true,
        product: { select: { name: true, mrp: true, sellingPrice: true } },
        inventories: {
          where: { branchId },
          select: { physicalQty: true, reservedQty: true, damagedQty: true, threshold: true },
        },
      },
      orderBy: [{ product: { name: 'asc' } }, { size: 'asc' }],
    });
    const ids = variants.map((v) => v.id);

    const [periodMoves, allTimeMoves, costs] = await Promise.all([
      prisma.stockMovement.groupBy({
        by: ['variantId', 'type'],
        where: { branchId, variant: { product }, ...(from ? { createdAt: { gte: from } } : {}) },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.groupBy({
        by: ['variantId', 'type'],
        where: { branchId, variant: { product } },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      // Cost is the unit cost (before GST) on the variant's latest confirmed purchase bill
      prisma.$queryRaw<{ variantId: string; unitCost: number }[]>`
        SELECT DISTINCT ON (bi."variantId") bi."variantId", bi."unitCost"
        FROM "PurchaseBillItem" bi
        JOIN "PurchaseBill" b ON b."id" = bi."billId"
        WHERE bi."variantId" = ANY(${ids})
          AND b."status" = 'CONFIRMED' AND b."deletedAt" IS NULL
        ORDER BY bi."variantId", b."billDate" DESC, b."createdAt" DESC`,
    ]);

    const flows = new Map<string, Record<FlowColumn, number>>();
    for (const m of periodMoves) {
      const f = flows.get(m.variantId) ?? { purchase: 0, sold: 0, salesReturn: 0, transfer: 0, adjust: 0 };
      const [column, sign] = FLOW[m.type];
      f[column] += sign * (m._sum.quantity ?? 0);
      flows.set(m.variantId, f);
    }
    const lastSale = new Map<string, Date>();
    const firstMove = new Map<string, Date>();
    for (const m of allTimeMoves) {
      if (m.type === MovementType.SALE_OUT && m._max.createdAt) lastSale.set(m.variantId, m._max.createdAt);
      const first = firstMove.get(m.variantId);
      if (m._min.createdAt && (!first || m._min.createdAt < first)) firstMove.set(m.variantId, m._min.createdAt);
    }
    const costOf = new Map(costs.map((c) => [c.variantId, Number(c.unitCost)]));
    const slowSince = new Date(now.getTime() - SLOW_DAYS * DAY_MS);

    const allItems = variants.map((v) => {
      const inv = v.inventories[0];
      const closing = inv?.physicalQty ?? 0;
      const available = closing - (inv?.reservedQty ?? 0);
      const threshold = inv?.threshold ?? 5;
      const damagedQty = inv?.damagedQty ?? 0;
      const f = flows.get(v.id) ?? { purchase: 0, sold: 0, salesReturn: 0, transfer: 0, adjust: 0 };
      // Worked back from today's count, so it also carries any change made without a movement
      const opening = closing - f.purchase + f.sold - f.salesReturn - f.transfer - f.adjust;
      const costPrice = costOf.get(v.id) ?? null;
      const sale = lastSale.get(v.id) ?? null;
      // Slow: in stock and no sale in SLOW_DAYS days (never sold: first stocked over SLOW_DAYS ago)
      const since = sale ?? firstMove.get(v.id) ?? null;

      return {
        id: v.id,
        variantId: v.id,
        productId: v.productId,
        productName: v.product.name,
        size: v.size,
        color: v.color,
        barcode: v.variantSku,
        opening,
        ...f,
        closing,
        available,
        costPrice,
        mrp: v.mrp ?? v.product.mrp,
        sellingPrice: v.sellingPrice ?? v.product.sellingPrice,
        valueCost: costPrice === null ? null : Math.round(closing * costPrice),
        threshold,
        damagedQty,
        isOutOfStock: available <= 0,
        isLowStock: available > 0 && available <= threshold,
        isSlowMoving: closing > 0 && (!since || since < slowSince),
        daysWithoutSale: sale ? Math.floor((now.getTime() - sale.getTime()) / DAY_MS) : null,
      };
    });

    const inStockItems = allItems.filter((i) => i.available > 0);
    const lowOutItems = allItems.filter((i) => i.isLowStock || i.isOutOfStock);
    const damagedItems = allItems.filter((i) => i.damagedQty > 0);
    const slowMovingItems = allItems.filter((i) => i.isSlowMoving);
    const sum = (list: typeof allItems, value: (i: (typeof allItems)[number]) => number) =>
      list.reduce((t, i) => t + value(i), 0);

    // Filter items based on active Tab
    let filteredItems = allItems;
    if (tab === 'LOW_OUT') {
      filteredItems = lowOutItems;
    } else if (tab === 'DAMAGED') {
      filteredItems = damagedItems;
    } else if (tab === 'SLOW_MOVING') {
      filteredItems = slowMovingItems;
    }

    // Filter by search
    if (search) {
      filteredItems = filteredItems.filter(
        (i) =>
          i.productName.toLowerCase().includes(search) ||
          i.barcode.toLowerCase().includes(search) ||
          i.size.toLowerCase().includes(search)
      );
    }

    return {
      period: { from: from ? dayKey(from) : null, to: dayKey(now) },
      metrics: {
        sellablePcs: sum(inStockItems, (i) => i.available),
        sellableItemSizes: inStockItems.length,
        costValue: sum(allItems, (i) => i.valueCost ?? 0),
        // In-stock item-sizes with no confirmed purchase bill, left out of costValue
        withoutCost: allItems.filter((i) => i.closing > 0 && i.costPrice === null).length,
        mrpValue: Math.round(sum(allItems, (i) => i.closing * i.mrp)),
        damagedPcs: sum(damagedItems, (i) => i.damagedQty),
        damagedItemSizes: damagedItems.length,
        lowCount: allItems.filter((i) => i.isLowStock).length,
        outCount: allItems.filter((i) => i.isOutOfStock).length,
        slowCount: slowMovingItems.length,
        slowDays: SLOW_DAYS,
      },
      counts: {
        all: allItems.length,
        lowOut: lowOutItems.length,
        damaged: damagedItems.length,
        slowMoving: slowMovingItems.length,
      },
      items: filteredItems,
    };
  }

  /**
   * Adjust Physical Stock for a Variant
   */
  public async adjustStock(scope: Scope, actorId: string, payload: AdjustStockPayload) {
    const branchId = await this.resolveBranchId(scope);
    if (!branchId) throw new ApiError(httpStatus.BAD_REQUEST, 'Branch not found');

    // Only the caller's own products
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: payload.variantId,
        product: { companyId: scope.companyId, deletedAt: null, ...this.ownProducts(scope, branchId) },
      },
      include: { product: true },
    });
    if (!variant) throw new ApiError(httpStatus.NOT_FOUND, 'Product variant not found');

    const inv = await prisma.inventory.findUnique({
      where: {
        branchId_variantId: {
          branchId,
          variantId: payload.variantId,
        },
      },
    });

    const currentQty = inv?.physicalQty || 0;
    let newQty = currentQty;
    let movementType: MovementType = MovementType.ADJUSTMENT_INCREASE;
    let movementQty = payload.quantity;

    if (payload.type === 'INCREASE') {
      newQty = currentQty + payload.quantity;
      movementType = MovementType.ADJUSTMENT_INCREASE;
    } else if (payload.type === 'DECREASE') {
      newQty = Math.max(0, currentQty - payload.quantity);
      movementType = MovementType.ADJUSTMENT_DECREASE;
    } else if (payload.type === 'CORRECTION') {
      newQty = payload.quantity;
      const diff = newQty - currentQty;
      movementQty = Math.abs(diff);
      movementType = diff >= 0 ? MovementType.ADJUSTMENT_INCREASE : MovementType.ADJUSTMENT_DECREASE;
    } else if (payload.type === 'DAMAGE') {
      newQty = Math.max(0, currentQty - payload.quantity);
      movementType = MovementType.DAMAGE_WRITE_OFF;
      // Increment damagedQty
      await prisma.$executeRawUnsafe(`
        UPDATE "Inventory" SET "damagedQty" = "damagedQty" + $1 WHERE "branchId" = $2 AND "variantId" = $3
      `, payload.quantity, branchId, payload.variantId);
    }

    // Upsert Inventory
    const invId = inv?.id || `inv-${payload.variantId}-${branchId.slice(0, 8)}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Inventory" ("id", "branchId", "variantId", "physicalQty", "reservedQty", "threshold", "damagedQty", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, 0, 5, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("branchId", "variantId")
      DO UPDATE SET "physicalQty" = $4, "updatedAt" = CURRENT_TIMESTAMP
    `, invId, branchId, payload.variantId, newQty);

    // Record Stock Movement
    await prisma.stockMovement.create({
      data: {
        branchId,
        variantId: payload.variantId,
        type: movementType,
        quantity: movementQty,
        prevPhysical: currentQty,
        newPhysical: newQty,
        reason: payload.reason,
        reference: payload.notes || null,
        sourceType: StockSourceType.ADJUSTMENT,
        performedById: actorId,
      },
    });

    // Record in StockAdjustment
    await prisma.stockAdjustment.create({
      data: {
        branchId,
        variantId: payload.variantId,
        type: payload.type,
        quantity: movementQty,
        reason: payload.reason,
        notes: payload.notes || null,
        createdById: actorId,
      },
    });

    return {
      success: true,
      variantId: payload.variantId,
      previousQty: currentQty,
      newQty,
      message: `Stock adjusted successfully for ${variant.product.name} (${variant.size}). New stock: ${newQty}`,
    };
  }

  /**
   * Record Physical Stock Count / Audit
   */
  public async recordPhysicalStockCount(scope: Scope, actorId: string, payload: PhysicalStockCountPayload) {
    const branchId = await this.resolveBranchId(scope);
    if (!branchId) throw new ApiError(httpStatus.BAD_REQUEST, 'Branch not found');

    const auditNumber = await accountService.nextCode(prisma, `AUD-${financialYear()}/`, 4, async (prefix) =>
      (
        await prisma.physicalStockAudit.findMany({
          where: { branchId, auditNumber: { startsWith: prefix } },
          select: { auditNumber: true },
        })
      ).map((a) => a.auditNumber),
    );
    const auditId = randomUUID();

    let totalItemsCounted = 0;
    let discrepanciesCount = 0;

    for (const item of payload.items) {
      totalItemsCounted += 1;
      const variance = item.countedQty - item.systemQty;
      if (variance !== 0) {
        discrepanciesCount += 1;
        // Adjust inventory to match physical count
        await this.adjustStock(scope, actorId, {
          variantId: item.variantId,
          type: 'CORRECTION',
          quantity: item.countedQty,
          reason: item.reason || `Physical audit reconciliation (${auditNumber})`,
          notes: payload.notes,
        });
      }
    }

    // Save PhysicalStockAudit
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PhysicalStockAudit" (
        "id", "auditNumber", "shopId", "branchId", "companyId", "conductedById",
        "status", "totalItemsCounted", "discrepanciesCount", "notes", "auditItems", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8, $9, $10::jsonb, CURRENT_TIMESTAMP
      )
    `, auditId, auditNumber, scope.shopId || null, branchId, scope.companyId, actorId,
       totalItemsCounted, discrepanciesCount, payload.notes || null, JSON.stringify(payload.items));

    return {
      success: true,
      auditNumber,
      totalItemsCounted,
      discrepanciesCount,
      message: `Physical stock count ${auditNumber} completed. ${totalItemsCounted} items audited, ${discrepanciesCount} variances reconciled.`,
    };
  }
}

export default new StockService();
