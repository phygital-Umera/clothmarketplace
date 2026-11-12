import { randomUUID } from 'crypto';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import { MovementType, Prisma, StockSourceType } from '@prisma/client';
import { CreateAdjustmentInput, GetAdjustmentsQuery } from '../validations/stockAdjustment.validation';
import { dayKey } from '../utils/day';
import accountService from './account.service';
import inventoryService from './inventory.service';

export type Scope = {
  companyId: string;
  branchId: string;
  shopId?: string;
};

class StockAdjustmentService {
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

  /** Adjustment numbers run per branch: ADJ-0001, ADJ-0002... */
  private nextNumber = (tx: Prisma.TransactionClient, branchId: string) =>
    accountService.nextCode(tx, 'ADJ-', 4, async (prefix) =>
      (
        await tx.stockAdjustment.findMany({
          where: { branchId, adjustmentNumber: { startsWith: prefix } },
          select: { adjustmentNumber: true },
        })
      ).map((a) => a.adjustmentNumber ?? ''),
    );

  /**
   * Next adjustment number (a preview; the number is fixed when saved)
   */
  public async getNextAdjustmentNumber(scope: Scope) {
    const branchId = await this.resolveBranchId(scope);
    return { adjustmentNumber: await this.nextNumber(prisma, branchId) };
  }

  /**
   * Get Variants for Adjustment Dropdown with current stock and damaged count
   */
  public async getAdjustmentVariants(scope: Scope, search?: string) {
    const branchId = await this.resolveBranchId(scope);
    const searchFilter = search ? search.trim().toLowerCase() : '';

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        v."id",
        v."productId",
        v."variantSku",
        v."size",
        v."color",
        p."name" as "productName",
        COALESCE(i."physicalQty", 0)::int as "currentAvailable",
        COALESCE(i."damagedQty", 0)::int as "damagedQty"
      FROM "ProductVariant" v
      JOIN "Product" p ON p."id" = v."productId"
      LEFT JOIN "Shop" s ON s."id" = p."shopId"
      LEFT JOIN "Inventory" i ON i."variantId" = v."id" AND i."branchId" = $1
      WHERE p."companyId" = $2 AND p."deletedAt" IS NULL
        AND CASE WHEN $3::text IS NULL THEN p."shopId" IS NULL OR s."branchId" = $1 ELSE p."shopId" = $3 END
      ORDER BY p."name" ASC, v."size" ASC
      LIMIT 50
    `, branchId, scope.companyId, scope.shopId ?? null);

    return {
      variants: rows.map((r) => ({
        id: r.id,
        variantId: r.id,
        productId: r.productId,
        productName: r.productName,
        size: r.size,
        color: r.color,
        sku: r.variantSku,
        currentAvailable: Number(r.currentAvailable || 0),
        damaged: Number(r.damagedQty || 0),
        label: `${r.productName} · ${r.size}`,
        subtext: `${r.variantSku} · current available: ${r.currentAvailable} · damaged: ${r.damagedQty}`,
      })),
    };
  }

  /**
   * Get Adjustment History Table
   */
  public async getAdjustmentHistory(scope: Scope, query: GetAdjustmentsQuery) {
    const branchId = await this.resolveBranchId(scope);
    const typeFilter = query.type && query.type !== 'All types' && query.type !== 'ALL' ? query.type : undefined;

    // A shop sees only its own products' adjustments (rows from the other stock screens carry no shopId)
    let whereClause = `WHERE a."branchId" = $1 AND ($2::text IS NULL OR p."shopId" = $2)`;
    if (typeFilter) {
      if (typeFilter === 'Mark damaged' || typeFilter === 'MARK_DAMAGED') {
        whereClause += ` AND a."type" = 'MARK_DAMAGED'`;
      } else if (typeFilter === 'Count correction' || typeFilter === 'DECREASE') {
        whereClause += ` AND a."type" = 'DECREASE'`;
      } else if (typeFilter === 'Found stock' || typeFilter === 'INCREASE') {
        whereClause += ` AND a."type" = 'INCREASE'`;
      } else if (typeFilter === 'Write off' || typeFilter === 'WRITE_OFF') {
        whereClause += ` AND a."type" = 'WRITE_OFF'`;
      }
    }

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        a."id",
        a."adjustmentNumber" as "ref",
        a."type",
        a."quantity",
        a."reason",
        a."approvalStatus",
        a."createdAt",
        a."notes",
        a."reference",
        a."photoUrl",
        v."size",
        v."variantSku",
        p."name" as "productName",
        u."fullname" as "userName"
      FROM "StockAdjustment" a
      JOIN "ProductVariant" v ON v."id" = a."variantId"
      JOIN "Product" p ON p."id" = v."productId"
      LEFT JOIN "User" u ON u."id" = a."createdById"
      ${whereClause}
      ORDER BY a."createdAt" DESC, a."adjustmentNumber" DESC
      LIMIT ${query.limit || 50}
    `, branchId, scope.shopId ?? null);

    const now = new Date();
    const todayStr = dayKey(now);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = dayKey(yesterday);

    const history = rows.map((r) => {
      const d = new Date(r.createdAt);
      const dateStr = dayKey(d);
      let displayDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

      if (dateStr === todayStr) {
        displayDate = 'Today';
      } else if (dateStr === yesterdayStr) {
        displayDate = 'Yesterday';
      }

      // Format display type
      let displayType = 'Count correction';
      let signedQty = -r.quantity;

      if (r.type === 'MARK_DAMAGED') {
        displayType = 'Mark damaged';
        signedQty = -Math.abs(r.quantity);
      } else if (r.type === 'INCREASE') {
        displayType = 'Found stock';
        signedQty = Math.abs(r.quantity);
      } else if (r.type === 'WRITE_OFF') {
        displayType = 'Write off';
        signedQty = -Math.abs(r.quantity);
      } else if (r.type === 'DECREASE') {
        if (r.reason?.toLowerCase().includes('lost') || r.reason?.toLowerCase().includes('theft') || r.reason?.toLowerCase().includes('missing')) {
          displayType = 'Lost / theft';
        } else {
          displayType = 'Count correction';
        }
        signedQty = -Math.abs(r.quantity);
      }

      // Determine actor name from notes if available e.g. "Logged by Shital Mane"
      let byName = r.userName || '—';
      if (r.notes && r.notes.includes('Logged by ')) {
        byName = r.notes.replace('Logged by ', '').trim();
      }

      return {
        id: r.id,
        ref: r.ref || '—',
        date: displayDate,
        variantName: `${r.productName}`,
        variantSubtext: `${r.size}`,
        type: displayType,
        typeKey: r.type,
        qty: signedQty > 0 ? `+${signedQty}` : `${signedQty}`,
        qtyRaw: signedQty,
        reason: r.reason,
        by: byName,
        approvalStatus: r.approvalStatus || 'AUTO',
        reference: r.reference,
        photoUrl: r.photoUrl,
      };
    });

    return { history };
  }

  /**
   * Create Stock Adjustment
   */
  public async createAdjustment(scope: Scope, actorId: string, actorName: string, input: CreateAdjustmentInput) {
    const branchId = await this.resolveBranchId(scope);
    if (!branchId) throw new ApiError(httpStatus.BAD_REQUEST, 'Branch not found');

    // Only the caller's own products: a shop its own, a branch its shops' and shop-less catalog ones
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: input.variantId,
        product: {
          companyId: scope.companyId,
          deletedAt: null,
          ...(scope.shopId
            ? { shopId: scope.shopId }
            : { OR: [{ shopId: null }, { shop: { branchId } }] }),
        },
      },
      include: { product: { select: { name: true } } },
    });
    if (!variant) throw new ApiError(httpStatus.NOT_FOUND, 'Product variant not found');

    const qty = input.quantity;
    // Damaged units sit outside the sellable count: marking damaged moves them out, writing off removes them
    const delta = input.type === 'INCREASE' ? qty : input.type === 'WRITE_OFF' ? 0 : -qty;
    const damagedDelta = input.type === 'MARK_DAMAGED' ? qty : input.type === 'WRITE_OFF' ? -qty : 0;
    const movementType =
      input.type === 'INCREASE'
        ? MovementType.ADJUSTMENT_INCREASE
        : input.type === 'MARK_DAMAGED'
          ? MovementType.DAMAGE_WRITE_OFF
          : MovementType.ADJUSTMENT_DECREASE;

    // Auto-approve rule: if mark damaged or count <= 2 -> AUTO, else APPROVED or PENDING
    const approvalStatus = input.type === 'MARK_DAMAGED' || qty <= 2 ? 'AUTO' : 'APPROVED';
    const where = { branchId_variantId: { branchId, variantId: input.variantId } };

    return prisma.$transaction(async (tx) => {
      // One adjustment at a time per branch, so two saves can't take the same number
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'stock-adjustment:' + branchId}))`;
      const adjustmentNumber = await this.nextNumber(tx, branchId);
      const id = randomUUID();

      if (delta) {
        await inventoryService.applyStockChanges(tx, {
          branchId,
          changes: [{ variantId: input.variantId, productId: variant.productId, delta, type: movementType }],
          reason: input.reason,
          reference: adjustmentNumber,
          sourceType: StockSourceType.ADJUSTMENT,
          sourceId: id,
          performedById: actorId,
        });
      }
      if (damagedDelta) {
        const { count } = await tx.inventory.updateMany({
          where: {
            branchId,
            variantId: input.variantId,
            ...(damagedDelta < 0 ? { damagedQty: { gte: qty } } : {}),
          },
          data: { damagedQty: { increment: damagedDelta } },
        });
        if (!count) {
          const inv = await tx.inventory.findUnique({ where });
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Only ${inv?.damagedQty ?? 0} damaged unit(s) of "${variant.product.name}" (${variant.size}) can be written off`,
          );
        }
      }

      // Read after the change: the row is locked by now, so before = after - change
      const inv = await tx.inventory.findUniqueOrThrow({ where });
      const availableAfter = inv.physicalQty;
      const damagedAfter = inv.damagedQty;
      const availableBefore = availableAfter - delta;
      const damagedBefore = damagedAfter - damagedDelta;

      await tx.stockAdjustment.create({
        data: {
          id,
          adjustmentNumber,
          reference: input.reference || null,
          photoUrl: input.photoUrl || null,
          branchId,
          shopId: scope.shopId || null,
          companyId: scope.companyId,
          variantId: input.variantId,
          type: input.type,
          quantity: qty,
          availableBefore,
          availableAfter,
          damagedBefore,
          damagedAfter,
          reason: input.reason,
          approvalStatus,
          notes: actorName ? `Logged by ${actorName}` : null,
          createdById: actorId,
        },
      });

      return {
        success: true,
        adjustmentNumber,
        availableBefore,
        availableAfter,
        damagedBefore,
        damagedAfter,
        message: `Adjustment ${adjustmentNumber} created successfully for ${variant.product.name} (${variant.size}).`,
      };
    });
  }
}

export default new StockAdjustmentService();
