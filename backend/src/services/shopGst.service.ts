import httpStatus from 'http-status';
import {Prisma} from '@prisma/client';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {DEFAULT_GST_RULE, describeRule, GstRule, gstRuleOf} from '@utils/gst';

type Db = Prisma.TransactionClient | typeof prisma;

/** A shop's GST price rule and slabs (D-18) */
class ShopGstService {
    /** The shop's rule (defaults when it never set one) */
    public async ruleOf(shopId: string, db: Db = prisma): Promise<GstRule> {
        const shop = await db.shop.findUnique({where: {id: shopId}, select: {gstRule: true}});
        if (!shop) throw new ApiError(httpStatus.NOT_FOUND, 'Shop not found');
        return gstRuleOf(shop.gstRule);
    }

    /** Rules of several shops at once (store checkout, order lists), as a lookup */
    public async rulesOf(
        shopIds: (string | null | undefined)[],
        db: Db = prisma,
    ): Promise<(shopId: string | null | undefined) => GstRule> {
        const ids = [...new Set(shopIds.filter((id): id is string => Boolean(id)))];
        const shops = ids.length
            ? await db.shop.findMany({where: {id: {in: ids}}, select: {id: true, gstRule: true}})
            : [];
        const rules = new Map(shops.map((s) => [s.id, gstRuleOf(s.gstRule)]));
        return (shopId) => (shopId && rules.get(shopId)) || DEFAULT_GST_RULE;
    }

    public async get(shopId: string) {
        const rule = await this.ruleOf(shopId);
        return {...rule, summary: describeRule(rule)};
    }

    public async update(shopId: string, rule: GstRule) {
        const before = await this.ruleOf(shopId);
        if (!rule.slabs.includes(rule.rateUpTo) || !rule.slabs.includes(rule.rateAbove)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'The rule rates must be in the shop GST slabs',
            );
        }
        // Products with a fixed rate outside the new slabs would become unbillable
        const stranded = await prisma.product.findMany({
            where: {shopId, deletedAt: null, taxRate: {not: null, notIn: rule.slabs}},
            select: {name: true, taxRate: true},
            take: 3,
        });
        if (stranded.length) {
            const names = stranded.map((p) => `${p.name} (${p.taxRate}%)`).join(', ');
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Some products use a rate you removed: ${names}. Change them first, or keep that slab.`,
            );
        }
        const clean = gstRuleOf(rule);
        await prisma.shop.update({where: {id: shopId}, data: {gstRule: clean}});
        return {before, after: {...clean, summary: describeRule(clean)}};
    }

    /** A product's fixed rate must be one of its shop's slabs; null (follow the rule) is always fine */
    public async assertRateAllowed(
        shopId: string | null | undefined,
        rate: number | null | undefined,
        db: Db = prisma,
    ) {
        if (rate === null || rate === undefined || !shopId) return;
        const rule = await this.ruleOf(shopId, db);
        if (!rule.slabs.includes(rate)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `GST ${rate}% is not one of this shop's slabs (${rule.slabs.map((s) => `${s}%`).join(', ')})`,
            );
        }
    }
}

export default new ShopGstService();
