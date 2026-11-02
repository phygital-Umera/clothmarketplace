import {Prisma, MovementType} from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {Scope} from './account.service';

export interface AdjustStockInput {
    branchId?: string;
    variantId: string;
    type: 'INCREASE' | 'DECREASE' | 'CORRECTION';
    quantity: number;
    reason: string;
    notes?: string;
}

export interface BatchAdjustItem {
    variantId: string;
    quantity: number;
}

export interface BatchAdjustInput {
    branchId?: string;
    type: 'INCREASE' | 'DECREASE';
    reason: string;
    reference?: string;
    items: BatchAdjustItem[];
}

export interface UpdateThresholdInput {
    branchId?: string;
    variantId: string;
    threshold: number;
}

export interface InventoryListParams {
    branchId?: string;
    search?: string;
    status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
    categoryId?: string;
    view?: 'product' | 'variant';
    page?: number;
    limit?: number;
}

class InventoryService {
    /**
     * Resolves the target branchId for the given scope and input.
     * If user is shop-admin, employee, or branch-admin, their branchId is used.
     * If company-admin/super-admin, provided branchId or the variant's owning branch is used.
     */
    private async resolveBranchId(scope: Scope, branchId?: string, variantId?: string): Promise<string> {
        if (scope.branchId) return scope.branchId;
        if (branchId) return branchId;

        // Try to resolve from variant's product shop/branch
        if (variantId) {
            const variant = await prisma.productVariant.findUnique({
                where: {id: variantId},
                select: {
                    product: {
                        select: {
                            shop: {select: {branchId: true}},
                            companyId: true,
                        },
                    },
                },
            });
            if (variant?.product?.shop?.branchId) {
                return variant.product.shop.branchId;
            }
            if (variant?.product?.companyId) {
                const firstBranch = await prisma.branch.findFirst({
                    where: {companyId: variant.product.companyId, deletedAt: null},
                    select: {id: true},
                });
                if (firstBranch) return firstBranch.id;
            }
        }

        if (scope.companyId) {
            const firstBranch = await prisma.branch.findFirst({
                where: {companyId: scope.companyId, deletedAt: null},
                select: {id: true},
            });
            if (firstBranch) return firstBranch.id;
        }

        throw new ApiError(httpStatus.BAD_REQUEST, 'Branch is required for inventory operations');
    }

    /**
     * Inventory Dashboard Metrics
     */
    public getDashboard = async (scope: Scope, params: {branchId?: string}) => {
        const targetBranchId = scope.branchId || params.branchId;

        const productWhere: Prisma.ProductWhereInput = {
            deletedAt: null,
            ...(scope.companyId ? {companyId: scope.companyId} : {}),
            ...(scope.shopId ? {shopId: scope.shopId} : {}),
        };

        // Get total products and all active variants
        const [totalProducts, products] = await Promise.all([
            prisma.product.count({where: productWhere}),
            prisma.product.findMany({
                where: productWhere,
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    category: {select: {name: true}},
                    images: {where: {isMain: true}, take: 1, select: {url: true}},
                    variants: {
                        where: {isActive: true},
                        select: {
                            id: true,
                            variantSku: true,
                            size: true,
                            color: true,
                            colorHex: true,
                            inventories: {
                                where: targetBranchId ? {branchId: targetBranchId} : {},
                                select: {
                                    physicalQty: true,
                                    reservedQty: true,
                                    threshold: true,
                                    branchId: true,
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        let totalVariants = 0;
        let totalPhysicalStock = 0;
        let totalAvailableStock = 0;
        let inStockCount = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        const alerts: Array<{
            id: string;
            variantId: string;
            productId: string;
            productName: string;
            productSku: string;
            variantSku: string;
            size: string;
            color: string;
            colorHex: string | null;
            category: string;
            image: string | null;
            physicalStock: number;
            reservedStock: number;
            availableStock: number;
            threshold: number;
            status: 'OUT_OF_STOCK' | 'LOW_STOCK';
        }> = [];

        for (const prod of products) {
            for (const v of prod.variants) {
                totalVariants++;
                // Aggregate across matching branch inventories or default to 0
                const inv = v.inventories[0];
                const physical = inv?.physicalQty ?? 0;
                const reserved = inv?.reservedQty ?? 0;
                const threshold = inv?.threshold ?? 5;
                const available = Math.max(0, physical - reserved);

                totalPhysicalStock += physical;
                totalAvailableStock += available;

                if (available <= 0) {
                    outOfStockCount++;
                    alerts.push({
                        id: inv ? `${inv.branchId}_${v.id}` : `v_${v.id}`,
                        variantId: v.id,
                        productId: prod.id,
                        productName: prod.name,
                        productSku: prod.sku,
                        variantSku: v.variantSku,
                        size: v.size,
                        color: v.color,
                        colorHex: v.colorHex,
                        category: prod.category.name,
                        image: prod.images[0]?.url ?? null,
                        physicalStock: physical,
                        reservedStock: reserved,
                        availableStock: available,
                        threshold,
                        status: 'OUT_OF_STOCK',
                    });
                } else if (available <= threshold) {
                    lowStockCount++;
                    alerts.push({
                        id: inv ? `${inv.branchId}_${v.id}` : `v_${v.id}`,
                        variantId: v.id,
                        productId: prod.id,
                        productName: prod.name,
                        productSku: prod.sku,
                        variantSku: v.variantSku,
                        size: v.size,
                        color: v.color,
                        colorHex: v.colorHex,
                        category: prod.category.name,
                        image: prod.images[0]?.url ?? null,
                        physicalStock: physical,
                        reservedStock: reserved,
                        availableStock: available,
                        threshold,
                        status: 'LOW_STOCK',
                    });
                } else {
                    inStockCount++;
                }
            }
        }

        // Sort alerts: Out of stock first, then lowest available
        alerts.sort((a, b) => a.availableStock - b.availableStock);

        // Fetch recent movements (last 10)
        const recentMovementsRaw = await prisma.stockMovement.findMany({
            where: {
                ...(targetBranchId ? {branchId: targetBranchId} : {}),
                ...(scope.companyId ? {branch: {companyId: scope.companyId}} : {}),
            },
            take: 8,
            orderBy: {createdAt: 'desc'},
            include: {
                branch: {select: {id: true, name: true, code: true}},
                variant: {
                    select: {
                        id: true,
                        variantSku: true,
                        size: true,
                        color: true,
                        product: {select: {id: true, name: true, sku: true}},
                    },
                },
            },
        });

        // Enrich performedBy users
        const userIds = [...new Set(recentMovementsRaw.map((m) => m.performedById).filter(Boolean))] as string[];
        const users = userIds.length
            ? await prisma.user.findMany({
                  where: {id: {in: userIds}},
                  select: {id: true, fullname: true, email: true},
              })
            : [];
        const userMap = new Map(users.map((u) => [u.id, u]));

        const recentMovements = recentMovementsRaw.map((m) => ({
            id: m.id,
            branch: m.branch,
            product: m.variant.product,
            variant: {
                id: m.variant.id,
                sku: m.variant.variantSku,
                size: m.variant.size,
                color: m.variant.color,
            },
            type: m.type,
            quantity: m.quantity,
            prevPhysical: m.prevPhysical,
            newPhysical: m.newPhysical,
            reason: m.reason,
            reference: m.reference,
            createdAt: m.createdAt,
            performedBy: m.performedById ? userMap.get(m.performedById) ?? null : null,
        }));

        return {
            summary: {
                totalProducts,
                totalVariants,
                totalPhysicalStock,
                totalAvailableStock,
                inStockCount,
                lowStockCount,
                outOfStockCount,
            },
            alerts: alerts.slice(0, 10),
            recentMovements,
        };
    };

    /**
     * List inventory with support for product-level grouping or flat variant list.
     */
    public list = async (scope: Scope, params: InventoryListParams) => {
        const {
            page = 1,
            limit = 20,
            search,
            status = 'all',
            categoryId,
            view = 'product',
            branchId,
        } = params;

        const targetBranchId = scope.branchId || branchId;
        const skip = (page - 1) * limit;

        // Base product filter
        const productWhere: Prisma.ProductWhereInput = {
            deletedAt: null,
            ...(scope.companyId ? {companyId: scope.companyId} : {}),
            ...(scope.shopId ? {shopId: scope.shopId} : {}),
            ...(categoryId ? {categoryId} : {}),
            ...(search
                ? {
                      OR: [
                          {name: {contains: search, mode: 'insensitive'}},
                          {sku: {contains: search, mode: 'insensitive'}},
                          {productType: {contains: search, mode: 'insensitive'}},
                          {variants: {some: {variantSku: {contains: search, mode: 'insensitive'}}}},
                      ],
                  }
                : {}),
        };

        if (view === 'product') {
            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where: productWhere,
                    skip,
                    take: limit,
                    orderBy: {updatedAt: 'desc'},
                    include: {
                        category: {select: {id: true, name: true}},
                        subcategory: {select: {id: true, name: true}},
                        shop: {select: {id: true, name: true, branchId: true}},
                        images: {orderBy: [{isMain: 'desc'}, {order: 'asc'}], take: 2},
                        variants: {
                            where: {isActive: true},
                            include: {
                                inventories: {
                                    where: targetBranchId ? {branchId: targetBranchId} : {},
                                    select: {
                                        id: true,
                                        branchId: true,
                                        physicalQty: true,
                                        reservedQty: true,
                                        threshold: true,
                                        updatedAt: true,
                                    },
                                },
                            },
                        },
                    },
                }),
                prisma.product.count({where: productWhere}),
            ]);

            const items = products.map((prod) => {
                let productPhysical = 0;
                let productReserved = 0;
                let productAvailable = 0;

                const variants = prod.variants.map((v) => {
                    const inv = v.inventories[0];
                    const physical = inv?.physicalQty ?? 0;
                    const reserved = inv?.reservedQty ?? 0;
                    const threshold = inv?.threshold ?? 5;
                    const available = Math.max(0, physical - reserved);

                    productPhysical += physical;
                    productReserved += reserved;
                    productAvailable += available;

                    return {
                        id: v.id,
                        inventoryId: inv?.id ?? null,
                        sku: v.variantSku,
                        size: v.size,
                        color: v.color,
                        colorHex: v.colorHex,
                        physicalStock: physical,
                        reservedStock: reserved,
                        availableStock: available,
                        threshold,
                        isLowStock: available > 0 && available <= threshold,
                        isOutOfStock: available <= 0,
                        updatedAt: inv?.updatedAt ?? prod.updatedAt,
                    };
                });

                // Status calculation
                const isOutOfStock = variants.length > 0 && variants.every((v) => v.isOutOfStock);
                const isLowStock = !isOutOfStock && variants.some((v) => v.isLowStock || v.isOutOfStock);

                return {
                    id: prod.id,
                    name: prod.name,
                    sku: prod.sku,
                    category: prod.category.name,
                    subcategory: prod.subcategory?.name ?? null,
                    shop: prod.shop,
                    sellingPrice: prod.sellingPrice,
                    mrp: prod.mrp,
                    mainImage: prod.images[0]?.url ?? null,
                    physicalStock: productPhysical,
                    reservedStock: productReserved,
                    availableStock: productAvailable,
                    totalVariants: variants.length,
                    isOutOfStock,
                    isLowStock,
                    variants,
                    updatedAt: prod.updatedAt,
                };
            });

            // If a specific stock status filter is selected, filter items accordingly
            let filteredItems = items;
            if (status === 'in_stock') {
                filteredItems = items.filter((i) => !i.isLowStock && !i.isOutOfStock && i.availableStock > 0);
            } else if (status === 'low_stock') {
                filteredItems = items.filter((i) => i.isLowStock);
            } else if (status === 'out_of_stock') {
                filteredItems = items.filter((i) => i.isOutOfStock);
            }

            return {
                items: filteredItems,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }

        // View === 'variant': flat list of variants
        const variantWhere: Prisma.ProductVariantWhereInput = {
            isActive: true,
            product: productWhere,
            ...(search
                ? {
                      OR: [
                          {variantSku: {contains: search, mode: 'insensitive'}},
                          {size: {contains: search, mode: 'insensitive'}},
                          {color: {contains: search, mode: 'insensitive'}},
                          {product: {name: {contains: search, mode: 'insensitive'}}},
                      ],
                  }
                : {}),
        };

        const [variants, total] = await Promise.all([
            prisma.productVariant.findMany({
                where: variantWhere,
                skip,
                take: limit,
                orderBy: {createdAt: 'desc'},
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            category: {select: {id: true, name: true}},
                            images: {where: {isMain: true}, take: 1, select: {url: true}},
                        },
                    },
                    inventories: {
                        where: targetBranchId ? {branchId: targetBranchId} : {},
                        include: {
                            branch: {select: {id: true, name: true, code: true}},
                        },
                    },
                },
            }),
            prisma.productVariant.count({where: variantWhere}),
        ]);

        const items = variants.map((v) => {
            const inv = v.inventories[0];
            const physical = inv?.physicalQty ?? 0;
            const reserved = inv?.reservedQty ?? 0;
            const threshold = inv?.threshold ?? 5;
            const available = Math.max(0, physical - reserved);

            return {
                id: inv?.id ?? `v_${v.id}`,
                variantId: v.id,
                branch: inv?.branch ?? null,
                product: {
                    id: v.product.id,
                    name: v.product.name,
                    sku: v.product.sku,
                    category: v.product.category.name,
                    image: v.product.images[0]?.url ?? null,
                },
                variant: {
                    id: v.id,
                    sku: v.variantSku,
                    size: v.size,
                    color: v.color,
                    colorHex: v.colorHex,
                },
                physicalStock: physical,
                reservedStock: reserved,
                availableStock: available,
                threshold,
                isLowStock: available > 0 && available <= threshold,
                isOutOfStock: available <= 0,
                updatedAt: inv?.updatedAt ?? v.createdAt,
            };
        });

        let filteredItems = items;
        if (status === 'in_stock') {
            filteredItems = items.filter((i) => !i.isLowStock && !i.isOutOfStock && i.availableStock > 0);
        } else if (status === 'low_stock') {
            filteredItems = items.filter((i) => i.isLowStock);
        } else if (status === 'out_of_stock') {
            filteredItems = items.filter((i) => i.isOutOfStock);
        }

        return {
            items: filteredItems,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    /**
     * Adjust physical stock with validation against negative stock,
     * recording audit logs, and keeping parent product stockQuantity in sync.
     */
    public adjustStock = async (scope: Scope, input: AdjustStockInput, performedById: string) => {
        const branchId = await this.resolveBranchId(scope, input.branchId, input.variantId);

        // Verify variant exists
        const variant = await prisma.productVariant.findUnique({
            where: {id: input.variantId},
            include: {
                product: {select: {id: true, name: true, sku: true, companyId: true}},
            },
        });

        if (!variant) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Product variant not found');
        }

        // Validate scope ownership
        if (scope.companyId && variant.product.companyId !== scope.companyId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Variant does not belong to your company');
        }

        // Validate quantity
        const qty = Number(input.quantity);
        if (isNaN(qty)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Quantity must be a valid number');
        }

        if (input.type === 'CORRECTION') {
            if (qty < 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Stock quantity cannot be negative');
            }
        } else {
            if (qty <= 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Adjustment quantity must be greater than 0');
            }
        }

        if (!input.reason?.trim()) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Reason is required for stock adjustment');
        }

        return prisma.$transaction(async (tx) => {
            const existing = await tx.inventory.findUnique({
                where: {branchId_variantId: {branchId, variantId: input.variantId}},
            });

            const prevPhysical = existing?.physicalQty ?? 0;
            let newPhysical = prevPhysical;

            if (input.type === 'INCREASE') {
                newPhysical = prevPhysical + qty;
            } else if (input.type === 'DECREASE') {
                if (qty > prevPhysical) {
                    throw new ApiError(
                        httpStatus.BAD_REQUEST,
                        `Cannot reduce stock by ${qty}. Only ${prevPhysical} units in stock.`,
                    );
                }
                newPhysical = prevPhysical - qty;
            } else if (input.type === 'CORRECTION') {
                newPhysical = qty;
            }

            // Upsert inventory
            const updatedInventory = await tx.inventory.upsert({
                where: {branchId_variantId: {branchId, variantId: input.variantId}},
                create: {
                    branchId,
                    variantId: input.variantId,
                    physicalQty: newPhysical,
                    reservedQty: existing?.reservedQty ?? 0,
                    threshold: existing?.threshold ?? 5,
                },
                update: {
                    physicalQty: newPhysical,
                },
            });

            const diff = newPhysical - prevPhysical;
            const movementType =
                input.type === 'INCREASE'
                    ? MovementType.ADJUSTMENT_INCREASE
                    : input.type === 'DECREASE'
                      ? MovementType.ADJUSTMENT_DECREASE
                      : diff >= 0
                        ? MovementType.ADJUSTMENT_INCREASE
                        : MovementType.ADJUSTMENT_DECREASE;

            // Record Movement History
            await tx.stockMovement.create({
                data: {
                    branchId,
                    variantId: input.variantId,
                    type: movementType,
                    quantity: Math.abs(diff),
                    prevPhysical,
                    newPhysical,
                    reason: input.reason.trim(),
                    reference: input.notes?.trim() || null,
                    performedById,
                },
            });

            // Record Stock Adjustment Audit
            await tx.stockAdjustment.create({
                data: {
                    branchId,
                    variantId: input.variantId,
                    type: input.type,
                    quantity: qty,
                    reason: input.reason.trim(),
                    notes: input.notes?.trim() || null,
                    createdById: performedById,
                },
            });

            // Sync parent Product total stockQuantity
            const totalStock = await tx.inventory.aggregate({
                where: {
                    branchId,
                    variant: {productId: variant.productId, isActive: true},
                },
                _sum: {physicalQty: true},
            });

            await tx.product.update({
                where: {id: variant.productId},
                data: {stockQuantity: totalStock._sum.physicalQty ?? 0},
            });

            return {
                ...updatedInventory,
                availableStock: Math.max(0, updatedInventory.physicalQty - updatedInventory.reservedQty),
                diff,
            };
        });
    };

    /**
     * Batch inward / outward stock adjustments for multiple variants at once.
     */
    public batchAdjust = async (scope: Scope, input: BatchAdjustInput, performedById: string) => {
        const {type, reason, reference, items} = input;

        // Filter valid items with quantity > 0
        const validItems = (items || []).filter((item) => Number(item.quantity) > 0);
        if (!validItems.length) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Please enter quantity greater than 0 for at least one item');
        }

        if (!reason?.trim()) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Reason is required for stock adjustment');
        }

        const variantIds = validItems.map((i) => i.variantId);
        const variants = await prisma.productVariant.findMany({
            where: {id: {in: variantIds}},
            include: {
                product: {select: {id: true, name: true, sku: true, companyId: true, shop: {select: {branchId: true}}}},
            },
        });

        if (variants.length !== validItems.length) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'One or more selected variants do not exist');
        }

        const branchId = await this.resolveBranchId(
            scope,
            input.branchId,
            variants[0]?.id,
        );

        return prisma.$transaction(async (tx) => {
            const affectedProductIds = new Set<string>();
            const movementType =
                type === 'INCREASE'
                    ? MovementType.ADJUSTMENT_INCREASE
                    : MovementType.ADJUSTMENT_DECREASE;

            for (const item of validItems) {
                const variant = variants.find((v) => v.id === item.variantId)!;
                affectedProductIds.add(variant.product.id);

                const existing = await tx.inventory.findUnique({
                    where: {branchId_variantId: {branchId, variantId: item.variantId}},
                });

                const prevPhysical = existing?.physicalQty ?? 0;
                let newPhysical: number;

                if (type === 'INCREASE') {
                    newPhysical = prevPhysical + item.quantity;
                } else {
                    if (item.quantity > prevPhysical) {
                        throw new ApiError(
                            httpStatus.BAD_REQUEST,
                            `Cannot outward ${item.quantity} for "${variant.product.name} (${variant.size}/${variant.color})". Only ${prevPhysical} currently available.`,
                        );
                    }
                    newPhysical = prevPhysical - item.quantity;
                }

                await tx.inventory.upsert({
                    where: {branchId_variantId: {branchId, variantId: item.variantId}},
                    create: {
                        branchId,
                        variantId: item.variantId,
                        physicalQty: newPhysical,
                        reservedQty: existing?.reservedQty ?? 0,
                        threshold: existing?.threshold ?? 5,
                    },
                    update: {
                        physicalQty: newPhysical,
                    },
                });

                await tx.stockMovement.create({
                    data: {
                        branchId,
                        variantId: item.variantId,
                        type: movementType,
                        quantity: item.quantity,
                        prevPhysical,
                        newPhysical,
                        reason: reason.trim(),
                        reference: reference?.trim() || null,
                        performedById,
                    },
                });

                await tx.stockAdjustment.create({
                    data: {
                        branchId,
                        variantId: item.variantId,
                        type,
                        quantity: item.quantity,
                        reason: reason.trim(),
                        notes: reference?.trim() || null,
                        createdById: performedById,
                    },
                });
            }

            // Sync total stockQuantity on each affected Product
            for (const productId of affectedProductIds) {
                const totalStock = await tx.inventory.aggregate({
                    where: {
                        branchId,
                        variant: {productId, isActive: true},
                    },
                    _sum: {physicalQty: true},
                });

                await tx.product.update({
                    where: {id: productId},
                    data: {stockQuantity: totalStock._sum.physicalQty ?? 0},
                });
            }

            return {
                adjustedCount: validItems.length,
                type,
                reason,
            };
        });
    };

    /**
     * Update low-stock threshold for a variant.
     */
    public updateThreshold = async (scope: Scope, input: UpdateThresholdInput) => {
        const branchId = await this.resolveBranchId(scope, input.branchId, input.variantId);
        const threshold = Number(input.threshold);

        if (isNaN(threshold) || threshold < 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Threshold must be a non-negative number');
        }

        const updated = await prisma.inventory.upsert({
            where: {branchId_variantId: {branchId, variantId: input.variantId}},
            create: {
                branchId,
                variantId: input.variantId,
                physicalQty: 0,
                reservedQty: 0,
                threshold,
            },
            update: {
                threshold,
            },
        });

        return updated;
    };

    /**
     * List stock movement history with full details and user information.
     */
    public movements = async (
        scope: Scope,
        params: {
            branchId?: string;
            productId?: string;
            variantId?: string;
            search?: string;
            action?: 'INWARD' | 'OUTWARD' | 'ALL' | string;
            type?: MovementType;
            page?: number;
            limit?: number;
        },
    ) => {
        const {page = 1, limit = 20, branchId, productId, variantId, search, action, type} = params;
        const targetBranchId = scope.branchId || branchId;
        const skip = (page - 1) * limit;

        const inwardTypes: MovementType[] = [
            'PURCHASE_IN',
            'ADJUSTMENT_INCREASE',
            'RETURN_RESTOCK',
            'TRANSFER_IN',
        ];
        const outwardTypes: MovementType[] = [
            'SALE_OUT',
            'ADJUSTMENT_DECREASE',
            'DAMAGE_WRITE_OFF',
            'TRANSFER_OUT',
        ];

        let typeFilter: Prisma.EnumMovementTypeFilter | MovementType | undefined = undefined;
        if (type) {
            typeFilter = type;
        } else if (action === 'INWARD') {
            typeFilter = {in: inwardTypes};
        } else if (action === 'OUTWARD') {
            typeFilter = {in: outwardTypes};
        }

        const where: Prisma.StockMovementWhereInput = {
            ...(targetBranchId ? {branchId: targetBranchId} : {}),
            ...(scope.companyId ? {branch: {companyId: scope.companyId}} : {}),
            ...(variantId ? {variantId} : {}),
            ...(productId ? {variant: {productId}} : {}),
            ...(typeFilter ? {type: typeFilter} : {}),
            ...(search
                ? {
                      OR: [
                          {reason: {contains: search, mode: 'insensitive'}},
                          {reference: {contains: search, mode: 'insensitive'}},
                          {variant: {variantSku: {contains: search, mode: 'insensitive'}}},
                          {variant: {product: {name: {contains: search, mode: 'insensitive'}}}},
                      ],
                  }
                : {}),
        };

        const [items, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
                skip,
                take: limit,
                include: {
                    branch: {select: {id: true, name: true, code: true}},
                    variant: {
                        select: {
                            id: true,
                            variantSku: true,
                            size: true,
                            color: true,
                            colorHex: true,
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    images: {where: {isMain: true}, take: 1, select: {url: true}},
                                },
                            },
                        },
                    },
                },
                orderBy: {createdAt: 'desc'},
            }),
            prisma.stockMovement.count({where}),
        ]);

        // Enrich with user names
        const userIds = [...new Set(items.map((m) => m.performedById).filter(Boolean))] as string[];
        const users = userIds.length
            ? await prisma.user.findMany({
                  where: {id: {in: userIds}},
                  select: {id: true, fullname: true, email: true},
              })
            : [];
        const userMap = new Map(users.map((u) => [u.id, u]));

        return {
            items: items.map((m) => ({
                id: m.id,
                branch: m.branch,
                product: m.variant.product,
                variant: {
                    id: m.variant.id,
                    sku: m.variant.variantSku,
                    size: m.variant.size,
                    color: m.variant.color,
                    colorHex: m.variant.colorHex,
                },
                type: m.type,
                quantity: m.quantity,
                prevPhysical: m.prevPhysical,
                newPhysical: m.newPhysical,
                reason: m.reason,
                reference: m.reference,
                createdAt: m.createdAt,
                performedBy: m.performedById ? userMap.get(m.performedById) ?? null : null,
            })),
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
