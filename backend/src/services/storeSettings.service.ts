import prisma from '../client';

/** Store-wide settings (P4-08b): delivery fees and days, badges. The super admin changes them */
export type StoreRules = {
    deliveryFee: number;
    freeDeliveryAbove: number;
    expressFee: number;
    deliveryDaysStd: number;
    deliveryDaysExpress: number;
    limitedBadgeAt: number;
    newProductDays: number;
};

/** The values that were fixed in code before */
export const DEFAULT_STORE_RULES: StoreRules = {
    deliveryFee: 49,
    freeDeliveryAbove: 999,
    expressFee: 99,
    deliveryDaysStd: 4,
    deliveryDaysExpress: 1,
    limitedBadgeAt: 3,
    newProductDays: 30,
};

const ID = 'store';
const TTL_MS = 30_000;
let cache: {at: number; rules: StoreRules} | null = null;

class StoreSettingsService {
    public async get(): Promise<StoreRules> {
        if (cache && Date.now() - cache.at < TTL_MS) return cache.rules;
        const row = await prisma.storeSettings.findUnique({where: {id: ID}});
        const rules: StoreRules = row
            ? {
                  deliveryFee: row.deliveryFee,
                  freeDeliveryAbove: row.freeDeliveryAbove,
                  expressFee: row.expressFee,
                  deliveryDaysStd: row.deliveryDaysStd,
                  deliveryDaysExpress: row.deliveryDaysExpress,
                  limitedBadgeAt: row.limitedBadgeAt,
                  newProductDays: row.newProductDays,
              }
            : DEFAULT_STORE_RULES;
        cache = {at: Date.now(), rules};
        return rules;
    }

    public async update(data: StoreRules) {
        const before = await this.get();
        await prisma.storeSettings.upsert({where: {id: ID}, create: {id: ID, ...data}, update: data});
        cache = null;
        return {before, after: await this.get()};
    }
}

export default new StoreSettingsService();
