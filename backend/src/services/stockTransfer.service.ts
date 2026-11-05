import httpStatus from 'http-status';
import {BillStatus, MovementType, Prisma, ShopStatus, StockSourceType} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {stockTransferValidation} from '@validations/index';
import accountService from './account.service';
import billService from './bill.service';
import inventoryService from './inventory.service';
import {BranchScope} from './customerDue.service';
import {ShopScope} from './shopProduct.service';

type Tx = Prisma.TransactionClient;
type CreateTransfer = z.infer<typeof stockTransferValidation.createTransferSchema>;
type ShopList = z.infer<typeof stockTransferValidation.shopListSchema>;
type BranchList = z.infer<typeof stockTransferValidation.branchListSchema>;
type Receive = z.infer<typeof stockTransferValidation.receiveSchema>;
type Decide = z.infer<typeof stockTransferValidation.decideSchema>;

const DAY = 24 * 60 * 60 * 1000;

const TRANSFER_INCLUDE = {
    items: {orderBy: {productName: 'asc'}},
    fromShop: {select: {id: true, name: true, code: true}},
    toShop: {select: {id: true, name: true, code: true}},
} satisfies Prisma.StockTransferInclude;

type TransferRow = Prisma.StockTransferGetPayload<{include: typeof TRANSFER_INCLUDE}>;

/** The same item in another shop: product name + size + colour (SKUs are unique per shop) */
const itemKey = (name: string, size: string, color: string) =>
    `${name.trim().toLowerCase()}|${size.trim().toLowerCase()}|${color.trim().toLowerCase()}`;

const VARIANT_SELECT = {
    id: true,
    variantSku: true,
    size: true,
    color: true,
    productId: true,
    product: {select: {id: true, name: true, shopId: true}},
} satisfies Prisma.ProductVariantSelect;

/**
 * Stock transfer between the shops of a branch. A shop requests stock (from
 * a named shop or any shop), the branch admin approves and picks the source,
 * the source shop dispatches (stock out) and the requesting shop counts what
 * arrived (stock in). Stock is per branch + variant, and every shop has its
 * own variants, so units move from the source shop's variant to the
 * requesting shop's matching variant.
 */
class StockTransferService {
    // ---------------------------------------------------------------- helpers

    private names = async (ids: Array<string | null | undefined>) => {
        const unique = [...new Set(ids.filter((v): v is string => !!v))];
        if (!unique.length) return new Map<string, string>();
        const users = await prisma.user.findMany({
            where: {id: {in: unique}},
            select: {id: true, fullname: true},
        });
        return new Map(users.map((u) => [u.id, u.fullname]));
    };

    private serialize = async (rows: TransferRow[]) => {
        const names = await this.names(
            rows.flatMap((t) => [t.requestedById, t.approvedById, t.dispatchedById, t.receivedById]),
        );
        return rows.map((t) => {
            const qtyOf = (i: TransferRow['items'][number]) =>
                i.receivedQty ?? i.dispatchedQty ?? i.approvedQty ?? i.requestedQty;
            return {
                id: t.id,
                transferNumber: t.transferNumber,
                status: t.status,
                reason: t.reason,
                note: t.note,
                neededBy: t.neededBy,
                createdAt: t.createdAt,
                fromShop: t.fromShop,
                toShop: t.toShop,
                requestedBy: names.get(t.requestedById) ?? null,
                approvedBy: t.approvedById ? (names.get(t.approvedById) ?? null) : null,
                approvedAt: t.approvedAt,
                rejectReason: t.rejectReason,
                dispatchedBy: t.dispatchedById ? (names.get(t.dispatchedById) ?? null) : null,
                dispatchedAt: t.dispatchedAt,
                receivedBy: t.receivedById ? (names.get(t.receivedById) ?? null) : null,
                receivedAt: t.receivedAt,
                receiveNote: t.receiveNote,
                units: t.items.reduce((s, i) => s + qtyOf(i), 0),
                requestedUnits: t.items.reduce((s, i) => s + i.requestedQty, 0),
                shortUnits: t.items.reduce(
                    (s, i) =>
                        s + (i.receivedQty !== null && i.dispatchedQty !== null ? i.dispatchedQty - i.receivedQty : 0),
                    0,
                ),
                items: t.items.map((i) => ({
                    id: i.id,
                    productName: i.productName,
                    variantSku: i.variantSku,
                    size: i.size,
                    color: i.color,
                    requestedQty: i.requestedQty,
                    approvedQty: i.approvedQty,
                    dispatchedQty: i.dispatchedQty,
                    receivedQty: i.receivedQty,
                    destVariantId: i.destVariantId,
                    sourceVariantId: i.sourceVariantId,
                })),
            };
        });
    };

    private branchShops = (branchId: string, companyId: string) =>
        prisma.shop.findMany({
            where: {branchId, companyId, deletedAt: null, status: ShopStatus.ACTIVE},
            select: {id: true, name: true, code: true},
            orderBy: {name: 'asc'},
        });

    private assertShopInBranch = async (shopId: string, branchId: string, companyId: string) => {
        const shop = await prisma.shop.findFirst({
            where: {id: shopId, branchId, companyId, deletedAt: null, status: ShopStatus.ACTIVE},
            select: {id: true, name: true, code: true},
        });
        if (!shop) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Select an active shop of this branch', [
                {field: 'fromShopId', message: 'Select an active shop of this branch'},
            ]);
        }
        return shop;
    };

    /** Available (physical - reserved) per variant in the branch */
    private available = async (branchId: string, variantIds: string[]) => {
        if (!variantIds.length) return new Map<string, {available: number; threshold: number}>();
        const rows = await prisma.inventory.findMany({
            where: {branchId, variantId: {in: variantIds}},
            select: {variantId: true, physicalQty: true, reservedQty: true, threshold: true},
        });
        return new Map(
            rows.map((r) => [
                r.variantId,
                {available: Math.max(0, r.physicalQty - r.reservedQty), threshold: r.threshold},
            ]),
        );
    };

    /** Variants of the given shops matching the items (name + size + colour) */
    private matchingVariants = async (
        shopIds: string[],
        items: Array<{name: string; size: string; color: string}>,
    ) => {
        if (!shopIds.length || !items.length) return [];
        return prisma.productVariant.findMany({
            where: {
                isActive: true,
                product: {shopId: {in: shopIds}, deletedAt: null},
                OR: items.map((i) => ({
                    size: {equals: i.size, mode: 'insensitive' as const},
                    color: {equals: i.color, mode: 'insensitive' as const},
                    product: {name: {equals: i.name.trim(), mode: 'insensitive' as const}},
                })),
            },
            select: VARIANT_SELECT,
        });
    };

    private nextNumber = (tx: Tx, branchId: string) =>
        accountService.nextCode(tx, 'TRF-', 4, async (prefix) =>
            (
                await tx.stockTransfer.findMany({
                    where: {branchId, transferNumber: {startsWith: prefix}},
                    select: {transferNumber: true},
                })
            ).map((t) => t.transferNumber),
        );

    // ------------------------------------------------------------- shop side

    /** Other active shops of my branch (the "Request from" list) */
    public shops = async (scope: ShopScope) => {
        const shop = await billService.shopContext(scope);
        const shops = await this.branchShops(shop.branchId, shop.companyId);
        return shops.filter((s) => s.id !== shop.id);
    };

    /**
     * Items to request: my low-stock variants (no search) or a search over my
     * variants and over other shops' items I do not carry. For each: what I
     * have, what I sold in 30 days and the best stock elsewhere in the branch.
     */
    public variants = async (scope: ShopScope, search?: string) => {
        const shop = await billService.shopContext(scope);
        const others = (await this.branchShops(shop.branchId, shop.companyId)).filter(
            (s) => s.id !== shop.id,
        );
        const shopName = new Map(others.map((s) => [s.id, s.name]));
        const searchWhere: Prisma.ProductVariantWhereInput = search
            ? {
                  OR: [
                      {variantSku: {contains: search, mode: 'insensitive'}},
                      {product: {name: {contains: search, mode: 'insensitive'}}},
                      {product: {sku: {contains: search, mode: 'insensitive'}}},
                  ],
              }
            : {};

        let mine = await prisma.productVariant.findMany({
            where: {
                isActive: true,
                product: {shopId: shop.id, deletedAt: null},
                ...searchWhere,
            },
            select: VARIANT_SELECT,
            orderBy: [{product: {name: 'asc'}}, {size: 'asc'}],
            take: search ? 30 : 500,
        });
        const stock = await this.available(
            shop.branchId,
            mine.map((v) => v.id),
        );
        const stockOf = (id: string) => stock.get(id) ?? {available: 0, threshold: 5};
        if (!search) {
            mine = mine.filter((v) => stockOf(v.id).available <= stockOf(v.id).threshold).slice(0, 50);
        }

        // Items in other shops: matches for mine, plus (when searching) ones I lack
        const otherIds = others.map((s) => s.id);
        const [matches, foreign] = await Promise.all([
            this.matchingVariants(
                otherIds,
                mine.map((v) => ({name: v.product.name, size: v.size, color: v.color})),
            ),
            search && otherIds.length
                ? prisma.productVariant.findMany({
                      where: {
                          isActive: true,
                          product: {shopId: {in: otherIds}, deletedAt: null},
                          ...searchWhere,
                      },
                      select: VARIANT_SELECT,
                      take: 30,
                  })
                : Promise.resolve([]),
        ]);
        const otherStock = await this.available(shop.branchId, [
            ...matches.map((v) => v.id),
            ...foreign.map((v) => v.id),
        ]);

        const since = new Date(Date.now() - 30 * DAY);
        const sold = await prisma.salesBillItem.groupBy({
            by: ['variantId'],
            where: {
                variantId: {in: mine.map((v) => v.id)},
                bill: {shopId: shop.id, status: BillStatus.CONFIRMED, deletedAt: null, billDate: {gte: since}},
            },
            _sum: {quantity: true},
        });
        const soldOf = new Map(sold.map((s) => [s.variantId, s._sum.quantity ?? 0]));

        // Best other shop per item key
        const best = new Map<string, {shopId: string; shopName: string; qty: number; variantId: string}>();
        for (const v of [...matches, ...foreign]) {
            const key = itemKey(v.product.name, v.size, v.color);
            const qty = otherStock.get(v.id)?.available ?? 0;
            const cur = best.get(key);
            if (qty > 0 && (!cur || qty > cur.qty)) {
                best.set(key, {
                    shopId: v.product.shopId!,
                    shopName: shopName.get(v.product.shopId!) ?? '',
                    qty,
                    variantId: v.id,
                });
            }
        }

        const mineKeys = new Set(mine.map((v) => itemKey(v.product.name, v.size, v.color)));
        const row = (v: (typeof mine)[number], own: boolean) => {
            const s = own ? stockOf(v.id) : {available: 0, threshold: 5};
            const qtySold = own ? (soldOf.get(v.id) ?? 0) : 0;
            return {
                variantId: v.id,
                own,
                ownerShopId: v.product.shopId,
                productName: v.product.name,
                variantSku: v.variantSku,
                size: v.size,
                color: v.color,
                have: s.available,
                threshold: s.threshold,
                sold30: qtySold,
                elsewhere: best.get(itemKey(v.product.name, v.size, v.color)) ?? null,
                // Enough for ~30 days of sales, at least back to the threshold
                suggestedQty: Math.max(1, Math.max(qtySold, s.threshold * 2) - s.available),
            };
        };
        const foreignRows = foreign
            .filter((v) => !mineKeys.has(itemKey(v.product.name, v.size, v.color)))
            .map((v) => row(v, false));
        return [...mine.map((v) => row(v, true)), ...foreignRows];
    };

    public create = async (scope: ShopScope, actorId: string, data: CreateTransfer) => {
        const shop = await billService.shopContext(scope);
        let fromShopId = data.fromShopId;
        if (fromShopId) {
            if (fromShopId === shop.id) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot request stock from your own shop', [
                    {field: 'fromShopId', message: 'Choose another shop'},
                ]);
            }
            await this.assertShopInBranch(fromShopId, shop.branchId, shop.companyId);
        }

        const variants = await prisma.productVariant.findMany({
            where: {
                id: {in: data.items.map((i) => i.variantId)},
                isActive: true,
                product: {deletedAt: null, companyId: shop.companyId, shop: {branchId: shop.branchId}},
            },
            select: VARIANT_SELECT,
        });
        const byId = new Map(variants.map((v) => [v.id, v]));
        const foreignShops = new Set<string>();
        for (const item of data.items) {
            const v = byId.get(item.variantId);
            if (!v) throw new ApiError(httpStatus.BAD_REQUEST, 'An item in the request was not found in this branch');
            if (v.product.shopId !== shop.id) foreignShops.add(v.product.shopId!);
        }
        // Items I do not carry come from the shop that has them
        if (foreignShops.size) {
            const [owner] = [...foreignShops];
            if (foreignShops.size > 1 || (fromShopId && fromShopId !== owner)) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    "Items your shop does not carry must all be requested from the shop that has them",
                    [{field: 'fromShopId', message: 'Choose the shop that has these items'}],
                );
            }
            fromShopId = owner;
        }

        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) =>
                    tx.stockTransfer.create({
                        data: {
                            transferNumber: await this.nextNumber(tx, shop.branchId),
                            companyId: shop.companyId,
                            branchId: shop.branchId,
                            fromShopId,
                            toShopId: shop.id,
                            reason: data.reason,
                            note: data.note,
                            neededBy: data.neededBy,
                            requestedById: actorId,
                            items: {
                                create: data.items.map((i) => {
                                    const v = byId.get(i.variantId)!;
                                    const own = v.product.shopId === shop.id;
                                    return {
                                        destVariantId: own ? v.id : null,
                                        sourceVariantId: own ? null : v.id,
                                        productName: v.product.name,
                                        variantSku: v.variantSku,
                                        size: v.size,
                                        color: v.color,
                                        requestedQty: i.qty,
                                    };
                                }),
                            },
                        },
                        select: {id: true},
                    }),
                ),
            'transferNumber',
        );
        return this.getShop(scope, created.id);
    };

    public listShop = async (scope: ShopScope, query: ShopList) => {
        const shop = await billService.shopContext(scope);
        const search: Prisma.StockTransferWhereInput = query.search
            ? {
                  OR: [
                      {transferNumber: {contains: query.search, mode: 'insensitive'}},
                      {items: {some: {productName: {contains: query.search, mode: 'insensitive'}}}},
                  ],
              }
            : {};
        const tabWhere: Prisma.StockTransferWhereInput =
            query.tab === 'DISPATCH'
                ? {fromShopId: shop.id, status: 'APPROVED'}
                : query.tab === 'HISTORY'
                  ? {OR: [{toShopId: shop.id}, {fromShopId: shop.id}]}
                  : {toShopId: shop.id};
        const [rows, toDispatch, incoming, pending] = await Promise.all([
            prisma.stockTransfer.findMany({
                where: {AND: [tabWhere, search]},
                include: TRANSFER_INCLUDE,
                orderBy: {createdAt: 'desc'},
                take: query.tab === 'HISTORY' ? 200 : 50,
            }),
            prisma.stockTransfer.count({where: {fromShopId: shop.id, status: 'APPROVED'}}),
            prisma.stockTransfer.count({where: {toShopId: shop.id, status: 'DISPATCHED'}}),
            prisma.stockTransfer.count({where: {toShopId: shop.id, status: 'REQUESTED'}}),
        ]);
        return {
            shopId: shop.id,
            items: await this.serialize(rows),
            counts: {toDispatch, incoming, pending},
        };
    };

    public getShop = async (scope: ShopScope, id: string) => {
        const shop = await billService.shopContext(scope);
        const row = await prisma.stockTransfer.findFirst({
            where: {id, OR: [{toShopId: shop.id}, {fromShopId: shop.id}]},
            include: TRANSFER_INCLUDE,
        });
        if (!row) throw new ApiError(httpStatus.NOT_FOUND, 'Transfer not found');
        return (await this.serialize([row]))[0];
    };

    /** Source shop packs the approved items: stock leaves its variants */
    public dispatch = async (scope: ShopScope, actorId: string, id: string) => {
        const shop = await billService.shopContext(scope);
        const transfer = await prisma.stockTransfer.findFirst({
            where: {id, fromShopId: shop.id},
            include: {items: true, toShop: {select: {name: true}}},
        });
        if (!transfer) throw new ApiError(httpStatus.NOT_FOUND, 'Transfer not found');
        if (transfer.status !== 'APPROVED') {
            throw new ApiError(httpStatus.CONFLICT, `This transfer is ${transfer.status.toLowerCase()}, not ready to dispatch`);
        }
        const lines = transfer.items.filter((i) => (i.approvedQty ?? 0) > 0 && i.sourceVariantId);
        const sources = await prisma.productVariant.findMany({
            where: {id: {in: lines.map((i) => i.sourceVariantId!)}},
            select: {id: true, productId: true},
        });
        const productOf = new Map(sources.map((v) => [v.id, v.productId]));

        await prisma.$transaction(async (tx) => {
            const {count} = await tx.stockTransfer.updateMany({
                where: {id, status: 'APPROVED'},
                data: {status: 'DISPATCHED', dispatchedById: actorId, dispatchedAt: new Date()},
            });
            if (!count) throw new ApiError(httpStatus.CONFLICT, 'This transfer was already dispatched');
            await inventoryService.applyStockChanges(tx, {
                branchId: transfer.branchId,
                changes: lines.map((i) => ({
                    variantId: i.sourceVariantId!,
                    productId: productOf.get(i.sourceVariantId!)!,
                    delta: -(i.approvedQty ?? 0),
                    type: MovementType.TRANSFER_OUT,
                })),
                reason: `Transfer ${transfer.transferNumber} to ${transfer.toShop.name}`,
                reference: transfer.transferNumber,
                sourceType: StockSourceType.TRANSFER,
                sourceId: transfer.id,
                performedById: actorId,
            });
            for (const i of transfer.items) {
                await tx.stockTransferItem.update({
                    where: {id: i.id},
                    data: {dispatchedQty: i.approvedQty ?? 0},
                });
            }
        });
        return this.getShop(scope, id);
    };

    /**
     * Copy a product + variant of another shop into this shop (for items the
     * shop did not carry). Reuses a product with the same name when present.
     */
    private cloneIntoShop = async (
        tx: Tx,
        sourceVariantId: string,
        toShop: {id: string; code: string},
        actorId: string,
    ) => {
        const src = await tx.productVariant.findUniqueOrThrow({
            where: {id: sourceVariantId},
            include: {
                product: {include: {sizes: true, colors: true, images: {orderBy: {order: 'asc'}}}},
            },
        });
        const p = src.product;
        let product = await tx.product.findFirst({
            where: {shopId: toShop.id, deletedAt: null, name: {equals: p.name, mode: 'insensitive'}},
            select: {id: true, sku: true},
        });
        if (product) {
            const existing = await tx.productVariant.findFirst({
                where: {
                    productId: product.id,
                    size: {equals: src.size, mode: 'insensitive'},
                    color: {equals: src.color, mode: 'insensitive'},
                },
                select: {id: true, productId: true},
            });
            if (existing) {
                if (!(await tx.productVariant.findUnique({where: {id: existing.id}}))?.isActive) {
                    await tx.productVariant.update({where: {id: existing.id}, data: {isActive: true}});
                }
                return existing;
            }
        } else {
            const unique = async (base: string) =>
                (await tx.product.findUnique({where: {sku: base}}))
                    ? `${base}-${Date.now().toString(36).toUpperCase()}`
                    : base;
            const {
                id: _id,
                sku,
                slug: _slug,
                shopId: _shop,
                stockQuantity: _stock,
                createdAt: _c,
                updatedAt: _u,
                deletedAt: _d,
                createdById: _by,
                sizes,
                colors,
                images,
                ...fields
            } = p;
            product = await tx.product.create({
                data: {
                    ...fields,
                    sku: await unique(`${sku}-${toShop.code}`),
                    shopId: toShop.id,
                    stockQuantity: 0,
                    createdById: actorId,
                    sizes: {create: sizes.map((s) => ({sizeId: s.sizeId}))},
                    colors: {create: colors.map((c) => ({colorId: c.colorId}))},
                    images: {
                        create: images.map((i) => ({
                            url: i.url,
                            altText: i.altText,
                            order: i.order,
                            isMain: i.isMain,
                            isAiGenerated: i.isAiGenerated,
                        })),
                    },
                },
                select: {id: true, sku: true},
            });
        }
        const suffix = src.variantSku.split('-').slice(-2).join('-');
        let variantSku = `${product.sku}-${suffix}`;
        if (await tx.productVariant.findUnique({where: {variantSku}})) {
            variantSku = `${variantSku}-${Date.now().toString(36).toUpperCase()}`;
        }
        return tx.productVariant.create({
            data: {
                productId: product.id,
                variantSku,
                size: src.size,
                color: src.color,
                colorHex: src.colorHex,
                image: src.image,
                mrp: src.mrp,
                sellingPrice: src.sellingPrice,
            },
            select: {id: true, productId: true},
        });
    };

    /** Requesting shop counts what arrived: stock enters its variants */
    public receive = async (scope: ShopScope, actorId: string, id: string, data: Receive) => {
        const shop = await billService.shopContext(scope);
        const transfer = await prisma.stockTransfer.findFirst({
            where: {id, toShopId: shop.id},
            include: {items: true, fromShop: {select: {name: true}}},
        });
        if (!transfer) throw new ApiError(httpStatus.NOT_FOUND, 'Transfer not found');
        if (transfer.status !== 'DISPATCHED') {
            throw new ApiError(
                httpStatus.CONFLICT,
                transfer.status === 'RECEIVED' || transfer.status === 'SHORT'
                    ? 'This transfer was already received'
                    : 'This transfer has not been dispatched yet',
            );
        }
        const counted = new Map(data.items.map((i) => [i.itemId, i.receivedQty]));
        for (const i of transfer.items) {
            const qty = counted.get(i.id);
            if (qty === undefined) {
                throw new ApiError(httpStatus.BAD_REQUEST, `Count ${i.productName} (${i.size} / ${i.color})`);
            }
            if (qty > (i.dispatchedQty ?? 0)) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `${i.productName} (${i.size} / ${i.color}): received ${qty} is more than the ${i.dispatchedQty ?? 0} sent`,
                );
            }
        }
        const shopRow = await prisma.shop.findUniqueOrThrow({
            where: {id: shop.id},
            select: {id: true, code: true},
        });

        await prisma.$transaction(async (tx) => {
            const short = transfer.items.some((i) => (counted.get(i.id) ?? 0) < (i.dispatchedQty ?? 0));
            const {count} = await tx.stockTransfer.updateMany({
                where: {id, status: 'DISPATCHED'},
                data: {
                    status: short ? 'SHORT' : 'RECEIVED',
                    receivedById: actorId,
                    receivedAt: new Date(),
                    receiveNote: data.note,
                },
            });
            if (!count) throw new ApiError(httpStatus.CONFLICT, 'This transfer was already received');

            const changes = [];
            for (const i of transfer.items) {
                const qty = counted.get(i.id) ?? 0;
                let dest = i.destVariantId
                    ? await tx.productVariant.findUnique({
                          where: {id: i.destVariantId},
                          select: {id: true, productId: true},
                      })
                    : null;
                if (!dest && qty > 0 && i.sourceVariantId) {
                    dest = await this.cloneIntoShop(tx, i.sourceVariantId, shopRow, actorId);
                }
                await tx.stockTransferItem.update({
                    where: {id: i.id},
                    data: {receivedQty: qty, ...(dest ? {destVariantId: dest.id} : {})},
                });
                if (dest && qty > 0) {
                    changes.push({
                        variantId: dest.id,
                        productId: dest.productId,
                        delta: qty,
                        type: MovementType.TRANSFER_IN,
                    });
                }
            }
            await inventoryService.applyStockChanges(tx, {
                branchId: transfer.branchId,
                changes,
                reason: `Transfer ${transfer.transferNumber} from ${transfer.fromShop?.name ?? 'branch'}`,
                reference: transfer.transferNumber,
                sourceType: StockSourceType.TRANSFER,
                sourceId: transfer.id,
                performedById: actorId,
            });
        });
        return this.getShop(scope, id);
    };

    // ----------------------------------------------------------- branch side

    public listBranch = async (scope: BranchScope, query: BranchList) => {
        const statusOf: Record<string, string[]> = {
            TO_APPROVE: ['REQUESTED'],
            TO_DISPATCH: ['APPROVED'],
            IN_TRANSIT: ['DISPATCHED'],
            DONE: ['RECEIVED', 'SHORT', 'REJECTED'],
        };
        const where: Prisma.StockTransferWhereInput = {
            companyId: scope.companyId,
            branchId: scope.branchId,
            ...(query.tab && statusOf[query.tab] ? {status: {in: statusOf[query.tab]}} : {}),
            ...(query.search
                ? {
                      OR: [
                          {transferNumber: {contains: query.search, mode: 'insensitive'}},
                          {toShop: {name: {contains: query.search, mode: 'insensitive'}}},
                          {fromShop: {name: {contains: query.search, mode: 'insensitive'}}},
                          {items: {some: {productName: {contains: query.search, mode: 'insensitive'}}}},
                      ],
                  }
                : {}),
        };
        const rows = await prisma.stockTransfer.findMany({
            where,
            include: TRANSFER_INCLUDE,
            orderBy: {createdAt: 'desc'},
            take: 200,
        });
        return {items: await this.serialize(rows)};
    };

    public summary = async (scope: BranchScope) => {
        const base = {companyId: scope.companyId, branchId: scope.branchId};
        const [toApprove, toDispatch, inTransit, discrepancies] = await Promise.all([
            prisma.stockTransfer.count({where: {...base, status: 'REQUESTED'}}),
            prisma.stockTransfer.count({where: {...base, status: 'APPROVED'}}),
            prisma.stockTransfer.count({where: {...base, status: 'DISPATCHED'}}),
            prisma.stockTransfer.count({where: {...base, status: 'SHORT'}}),
        ]);
        return {toApprove, toDispatch, inTransit, discrepancies};
    };

    public getBranch = async (scope: BranchScope, id: string) => {
        const row = await prisma.stockTransfer.findFirst({
            where: {id, companyId: scope.companyId, branchId: scope.branchId},
            include: TRANSFER_INCLUDE,
        });
        if (!row) throw new ApiError(httpStatus.NOT_FOUND, 'Transfer not found');
        return (await this.serialize([row]))[0];
    };

    /** Branch shops (with what they hold of each requested item) for approving */
    public sourceOptions = async (scope: BranchScope, id: string) => {
        const transfer = await this.getBranch(scope, id);
        const shops = (await this.branchShops(scope.branchId, scope.companyId)).filter(
            (s) => s.id !== transfer.toShop.id,
        );
        const matches = await this.matchingVariants(
            shops.map((s) => s.id),
            transfer.items.map((i) => ({name: i.productName, size: i.size, color: i.color})),
        );
        const stock = await this.available(scope.branchId, matches.map((v) => v.id));
        return shops.map((s) => ({
            ...s,
            items: transfer.items.map((i) => {
                const v =
                    matches.find((m) => m.id === i.sourceVariantId && m.product.shopId === s.id) ??
                    matches.find(
                        (m) =>
                            m.product.shopId === s.id &&
                            itemKey(m.product.name, m.size, m.color) ===
                                itemKey(i.productName, i.size, i.color),
                    );
                return {itemId: i.id, variantId: v?.id ?? null, available: v ? (stock.get(v.id)?.available ?? 0) : 0};
            }),
        }));
    };

    /** Approve (choose the source shop and quantities) or reject a request */
    public decide = async (scope: BranchScope, actorId: string, id: string, data: Decide) => {
        const transfer = await prisma.stockTransfer.findFirst({
            where: {id, companyId: scope.companyId, branchId: scope.branchId},
            include: {items: true},
        });
        if (!transfer) throw new ApiError(httpStatus.NOT_FOUND, 'Transfer not found');
        if (transfer.status !== 'REQUESTED') {
            throw new ApiError(httpStatus.CONFLICT, 'This request has already been decided');
        }

        if (data.decision === 'REJECT') {
            await prisma.stockTransfer.update({
                where: {id},
                data: {status: 'REJECTED', rejectReason: data.reason, approvedById: actorId, approvedAt: new Date()},
            });
            return this.getBranch(scope, id);
        }

        const fromShopId = data.fromShopId ?? transfer.fromShopId;
        if (!fromShopId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Choose the shop that will send the stock', [
                {field: 'fromShopId', message: 'Choose a shop'},
            ]);
        }
        if (fromShopId === transfer.toShopId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'A shop cannot send stock to itself');
        }
        const fromShop = await this.assertShopInBranch(fromShopId, scope.branchId, scope.companyId);
        const options = (await this.sourceOptions(scope, id)).find((s) => s.id === fromShopId);
        const approved = new Map((data.items ?? []).map((i) => [i.itemId, i.approvedQty]));

        const updates = transfer.items.map((i) => {
            const opt = options?.items.find((o) => o.itemId === i.id);
            const qty = approved.get(i.id) ?? i.requestedQty;
            if (qty > 0 && !opt?.variantId) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `${fromShop.name} does not stock ${i.productName} (${i.size} / ${i.color})`,
                );
            }
            if (qty > (opt?.available ?? 0)) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `${fromShop.name} has only ${opt?.available ?? 0} of ${i.productName} (${i.size} / ${i.color})`,
                );
            }
            return {id: i.id, approvedQty: qty, sourceVariantId: opt?.variantId ?? null};
        });
        if (!updates.some((u) => u.approvedQty > 0)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Approve at least one unit, or reject the request');
        }

        await prisma.$transaction(async (tx) => {
            const {count} = await tx.stockTransfer.updateMany({
                where: {id, status: 'REQUESTED'},
                data: {status: 'APPROVED', fromShopId, approvedById: actorId, approvedAt: new Date()},
            });
            if (!count) throw new ApiError(httpStatus.CONFLICT, 'This request has already been decided');
            for (const u of updates) {
                await tx.stockTransferItem.update({
                    where: {id: u.id},
                    data: {approvedQty: u.approvedQty, sourceVariantId: u.sourceVariantId},
                });
            }
        });
        return this.getBranch(scope, id);
    };
}

export default new StockTransferService();
