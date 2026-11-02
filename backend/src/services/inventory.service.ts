import {Prisma} from '@prisma/client';
import {MovementType} from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {Scope} from './account.service';

export interface AdjustStockInput {
    branchId: string;
    variantId: string;
    type: 'INCREASE' | 'DECREASE' | 'CORRECTION';
    quantity: number;
    reason: string;
    notes?: string;
}

class InventoryService {
    // List inventory for a branch or company
    public list = async (
        scope: Scope,
        params: {branchId?: string; search?: string; page?: number; limit?: number},
    ) => {
        const {page = 1, limit = 20, search, branchId} = params;
        const targetBranchId = scope.branchId || branchId;
        const skip = (page - 1) * limit;

        const where: Prisma.InventoryWhereInput = {
            ...(targetBranchId ? {branchId: targetBranchId} : {}),
            ...(scope.companyId ? {branch: {companyId: scope.companyId}} : {}),
            ...(search
                ? {
                      OR: [
                          {variant: {product: {name: {contains: search, mode: 'insensitive'}}}},
                          {variant: {product: {sku: {contains: search, mode: 'insensitive'}}}},
                          {variant: {variantSku: {contains: search, mode: 'insensitive'}}},
                      ],
                  }
                : {}),
        };

        const [items, total] = await Promise.all([
            prisma.inventory.findMany({
                where,
                skip,
                take: limit,
                include: {
                    branch: {select: {id: true, name: true, code: true}},
                    variant: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    sellingPrice: true,
                                    images: {where: {isMain: true}, take: 1},
                                },
                            },
                        },
                    },
                },
                orderBy: {updatedAt: 'desc'},
            }),
            prisma.inventory.count({where}),
        ]);

        return {
            items: items.map((inv) => ({
                id: inv.id,
                branch: inv.branch,
                product: inv.variant.product,
                variant: {
                    id: inv.variant.id,
                    sku: inv.variant.variantSku,
                    size: inv.variant.size,
                    color: inv.variant.color,
                },
                physicalStock: inv.physicalQty,
                reservedStock: inv.reservedQty,
                availableStock: Math.max(0, inv.physicalQty - inv.reservedQty),
                threshold: inv.threshold,
                isLowStock: inv.physicalQty - inv.reservedQty <= inv.threshold,
                isOutOfStock: inv.physicalQty - inv.reservedQty <= 0,
                updatedAt: inv.updatedAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    // Adjust physical stock with movement history in a database transaction
    public adjustStock = async (scope: Scope, input: AdjustStockInput, performedById: string) => {
        const branchId = scope.branchId || input.branchId;
        if (!branchId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Branch is required for stock adjustment');
        }

        // Verify branch belongs to user's company
        if (scope.companyId) {
            const branch = await prisma.branch.findFirst({
                where: {id: branchId, companyId: scope.companyId},
            });
            if (!branch) {
                throw new ApiError(httpStatus.FORBIDDEN, 'Branch does not belong to your company');
            }
        }

        return prisma.$transaction(async (tx) => {
            const existing = await tx.inventory.findUnique({
                where: {branchId_variantId: {branchId, variantId: input.variantId}},
            });

            const prevPhysical = existing?.physicalQty || 0;
            let newPhysical = prevPhysical;

            if (input.type === 'INCREASE') {
                newPhysical = prevPhysical + input.quantity;
            } else if (input.type === 'DECREASE') {
                newPhysical = Math.max(0, prevPhysical - input.quantity);
            } else if (input.type === 'CORRECTION') {
                newPhysical = Math.max(0, input.quantity);
            }

            const updatedInventory = await tx.inventory.upsert({
                where: {branchId_variantId: {branchId, variantId: input.variantId}},
                create: {
                    branchId,
                    variantId: input.variantId,
                    physicalQty: newPhysical,
                    reservedQty: 0,
                },
                update: {
                    physicalQty: newPhysical,
                },
            });

            // Record Movement
            await tx.stockMovement.create({
                data: {
                    branchId,
                    variantId: input.variantId,
                    type:
                        input.type === 'INCREASE'
                            ? MovementType.ADJUSTMENT_INCREASE
                            : MovementType.ADJUSTMENT_DECREASE,
                    quantity: Math.abs(newPhysical - prevPhysical),
                    prevPhysical,
                    newPhysical,
                    reason: input.reason,
                    reference: input.notes,
                    performedById,
                },
            });

            // Record Audit Record
            await tx.stockAdjustment.create({
                data: {
                    branchId,
                    variantId: input.variantId,
                    type: input.type,
                    quantity: input.quantity,
                    reason: input.reason,
                    notes: input.notes,
                    createdById: performedById,
                },
            });

            return updatedInventory;
        });
    };

    // Movement History
    public movements = async (
        scope: Scope,
        params: {branchId?: string; page?: number; limit?: number},
    ) => {
        const {page = 1, limit = 20, branchId} = params;
        const targetBranchId = scope.branchId || branchId;
        const skip = (page - 1) * limit;

        const where: Prisma.StockMovementWhereInput = {
            ...(targetBranchId ? {branchId: targetBranchId} : {}),
            ...(scope.companyId ? {branch: {companyId: scope.companyId}} : {}),
        };

        const [items, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
                skip,
                take: limit,
                include: {
                    branch: {select: {id: true, name: true, code: true}},
                    variant: {
                        include: {
                            product: {select: {name: true, sku: true}},
                        },
                    },
                },
                orderBy: {createdAt: 'desc'},
            }),
            prisma.stockMovement.count({where}),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };
}

export default new InventoryService();
