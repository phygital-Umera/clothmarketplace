import {Prisma} from '@prisma/client';
import prisma from '../client';

type Db = Prisma.TransactionClient | typeof prisma;

/** The rules a company runs by (P4-08). Owners change them on Company Profile → Settings */
export type CompanyRules = {
    refundApprovalLimit: number;
    discountApprovalPct: number;
    lowStockDefault: number;
    defaultCreditDays: number;
    minMarginPct: number;
};

/** Used until a company saves its own (the values that were fixed in code before) */
export const DEFAULT_RULES: CompanyRules = {
    refundApprovalLimit: 2000,
    discountApprovalPct: 10,
    lowStockDefault: 5,
    defaultCreditDays: 15,
    minMarginPct: 25,
};

// Settings are read on many requests; changes show within a few seconds on every server
const TTL_MS = 30_000;
const cache = new Map<string, {at: number; rules: CompanyRules}>();

class CompanySettingsService {
    public async get(companyId: string, db: Db = prisma): Promise<CompanyRules> {
        const hit = cache.get(companyId);
        if (hit && Date.now() - hit.at < TTL_MS) return hit.rules;
        const row = await db.companySettings.findUnique({where: {companyId}});
        const rules: CompanyRules = row
            ? {
                  refundApprovalLimit: row.refundApprovalLimit,
                  discountApprovalPct: row.discountApprovalPct,
                  lowStockDefault: row.lowStockDefault,
                  defaultCreditDays: row.defaultCreditDays,
                  minMarginPct: row.minMarginPct,
              }
            : DEFAULT_RULES;
        cache.set(companyId, {at: Date.now(), rules});
        return rules;
    }

    public async update(companyId: string, data: CompanyRules) {
        const before = await this.get(companyId);
        await prisma.companySettings.upsert({
            where: {companyId},
            create: {companyId, ...data},
            update: data,
        });
        cache.delete(companyId);
        return {before, after: await this.get(companyId)};
    }
}

export default new CompanySettingsService();
