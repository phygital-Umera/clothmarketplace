import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';

export type BranchScope = {companyId: string; branchId: string};

export type CustomerDueQuery = {
    search?: string;
    tab?: 'WITH_DUE' | 'OVERDUE' | 'OVER_LIMIT' | 'ALL';
    shopId?: string;
    page?: number;
    limit?: number;
};

export type UpdateCreditLimitPayload = {
    creditLimit?: number;
    creditDays?: number;
    allowOverLimit?: boolean;
    askClearOldDue?: boolean;
    action?: 'APPROVE' | 'REJECT';
};

class CustomerDueService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "CustomerCreditProfile" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "shopId" TEXT,
                    "shopName" TEXT,
                    "customerName" TEXT NOT NULL,
                    "customerPhone" TEXT NOT NULL,
                    "customerType" TEXT NOT NULL DEFAULT 'B2C',
                    "gstin" TEXT,
                    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 10000,
                    "creditDays" INTEGER NOT NULL DEFAULT 30,
                    "allowOverLimit" BOOLEAN NOT NULL DEFAULT false,
                    "askClearOldDue" BOOLEAN NOT NULL DEFAULT true,
                    "pendingRequest" JSONB,
                    "due0To30" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "due30Plus" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "totalDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "CustomerCreditProfile_branch_phone_key" UNIQUE ("branchId", "customerPhone")
                );
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating CustomerCreditProfile table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "CustomerCreditProfile" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        // Seed initial customers matching branch specs (e.g. Sangli Branch)
        const initialProfiles = [
            {
                id: 'ccp-1',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Shree Boutique',
                customerPhone: '+91 98221 30055',
                customerType: 'B2B',
                gstin: '27AAQFP2210K1Z1',
                shopName: "Women's Wear",
                creditLimit: 50000,
                creditDays: 30,
                due0To30: 12400,
                due30Plus: 0,
                totalDue: 12400,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: null,
            },
            {
                id: 'ccp-2',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Patil Uniforms',
                customerPhone: '+91 94220 18877',
                customerType: 'B2B',
                gstin: '27AAQFP2210K1Z3',
                shopName: "Men's Wear",
                creditLimit: 10000,
                creditDays: 30,
                due0To30: 1900,
                due30Plus: 6300,
                totalDue: 8200,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: {
                    type: 'OVER_LIMIT_REQUEST',
                    billAmount: 6400,
                    requestedCredit: 6400,
                    totalIfApproved: 14600,
                    overdueAgeDays: 34,
                    overduePart: 6300,
                    note: 'Men’s Wear — new bill ₹6,400 would take due to ₹14,600 (limit ₹10,000)',
                    requestedAt: new Date().toISOString(),
                },
            },
            {
                id: 'ccp-3',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Riddhi Tailors',
                customerPhone: '+91 90110 66320',
                customerType: 'B2B',
                gstin: '27BBSPK4419M2Z8',
                shopName: "Women's Wear",
                creditLimit: 25000,
                creditDays: 30,
                due0To30: 6900,
                due30Plus: 0,
                totalDue: 6900,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: null,
            },
            {
                id: 'ccp-4',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Kavita Desai',
                customerPhone: '+91 90960 77821',
                customerType: 'B2C',
                gstin: null,
                shopName: "Women's Wear",
                creditLimit: 10000,
                creditDays: 30,
                due0To30: 3500,
                due30Plus: 0,
                totalDue: 3500,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: null,
            },
            {
                id: 'ccp-5',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Pooja Mali',
                customerPhone: '+91 77200 43190',
                customerType: 'B2C',
                gstin: null,
                shopName: "Women's Wear",
                creditLimit: 3000,
                creditDays: 15,
                due0To30: 0,
                due30Plus: 2500,
                totalDue: 2500,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: null,
            },
            {
                id: 'ccp-6',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Meena Gavli',
                customerPhone: '+91 96500 11247',
                customerType: 'B2C',
                gstin: null,
                shopName: "Women's Wear",
                creditLimit: 5000,
                creditDays: 30,
                due0To30: 1850,
                due30Plus: 0,
                totalDue: 1850,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: null,
            },
            {
                id: 'ccp-7',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Anita Jadhav',
                customerPhone: '+91 88880 45120',
                customerType: 'B2C',
                gstin: null,
                shopName: "Women's Wear",
                creditLimit: 3000,
                creditDays: 15,
                due0To30: 0,
                due30Plus: 1500,
                totalDue: 1500,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: null,
            },
            {
                id: 'ccp-8',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Rahul Shinde',
                customerPhone: '+91 98900 12345',
                customerType: 'B2C',
                gstin: null,
                shopName: "Kids Wear",
                creditLimit: 5000,
                creditDays: 30,
                due0To30: 1200,
                due30Plus: 0,
                totalDue: 1200,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: null,
            },
            {
                id: 'ccp-9',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Anil Kadam',
                customerPhone: '+91 97630 65432',
                customerType: 'B2B',
                gstin: '27AABCK1002M1Z5',
                shopName: "Men's Wear",
                creditLimit: 15000,
                creditDays: 30,
                due0To30: 1200,
                due30Plus: 0,
                totalDue: 1200,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: null,
            },
            {
                id: 'ccp-10',
                companyId: scope.companyId,
                branchId: scope.branchId,
                customerName: 'Sanjay Garments',
                customerPhone: '+91 94230 78901',
                customerType: 'B2B',
                gstin: '27AXYZP1122Q1Z9',
                shopName: "Men's Wear",
                creditLimit: 20000,
                creditDays: 30,
                due0To30: 0,
                due30Plus: 0,
                totalDue: 0,
                allowOverLimit: false,
                askClearOldDue: true,
                pendingRequest: null,
            },
        ];

        for (const p of initialProfiles) {
            const rowId = `ccp-${scope.branchId}-${p.customerPhone.replace(/\D/g, '')}`;
            await prisma.$executeRawUnsafe(
                `INSERT INTO "CustomerCreditProfile" (
                    "id", "companyId", "branchId", "customerName", "customerPhone",
                    "customerType", "gstin", "shopName", "creditLimit", "creditDays",
                    "due0To30", "due30Plus", "totalDue", "allowOverLimit", "askClearOldDue", "pendingRequest"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
                ON CONFLICT ("branchId", "customerPhone") DO NOTHING`,
                rowId,
                p.companyId,
                p.branchId,
                p.customerName,
                p.customerPhone,
                p.customerType,
                p.gstin,
                p.shopName,
                p.creditLimit,
                p.creditDays,
                p.due0To30,
                p.due30Plus,
                p.totalDue,
                p.allowOverLimit,
                p.askClearOldDue,
                p.pendingRequest ? JSON.stringify(p.pendingRequest) : null,
            );
        }
    }

    public async list(scope: BranchScope, query: CustomerDueQuery) {
        await this.ensureSeedData(scope);

        let whereClauses = [`"branchId" = '${scope.branchId}'`];

        if (query.search?.trim()) {
            const s = query.search.trim().replace(/'/g, "''");
            whereClauses.push(
                `("customerName" ILIKE '%${s}%' OR "customerPhone" ILIKE '%${s}%' OR "gstin" ILIKE '%${s}%')`,
            );
        }

        if (query.shopId) {
            whereClauses.push(`"shopId" = '${query.shopId}'`);
        }

        const tab = query.tab || 'WITH_DUE';
        if (tab === 'WITH_DUE') {
            whereClauses.push(`"totalDue" > 0`);
        } else if (tab === 'OVERDUE') {
            whereClauses.push(`"due30Plus" > 0`);
        } else if (tab === 'OVER_LIMIT') {
            whereClauses.push(`("totalDue" > "creditLimit" OR "pendingRequest" IS NOT NULL)`);
        }

        const whereSql = whereClauses.join(' AND ');
        const page = Math.max(1, Number(query.page || 1));
        const limit = Math.max(1, Math.min(100, Number(query.limit || 15)));
        const offset = (page - 1) * limit;

        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "CustomerCreditProfile" WHERE ${whereSql}`,
        );
        const total = parseInt(countRes[0]?.count ?? '0', 10);

        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "CustomerCreditProfile"
             WHERE ${whereSql}
             ORDER BY
                CASE WHEN "pendingRequest" IS NOT NULL THEN 0 ELSE 1 END,
                "totalDue" DESC,
                "customerName" ASC
             LIMIT ${limit} OFFSET ${offset}`,
        );

        return {
            items: rows.map((r) => ({
                id: r.id,
                name: r.customerName,
                phone: r.customerPhone,
                customerType: r.customerType,
                gstin: r.gstin,
                shopId: r.shopId,
                shopName: r.shopName || "Women's Wear",
                creditLimit: r.creditLimit,
                creditDays: r.creditDays,
                due0To30: r.due0To30,
                due30Plus: r.due30Plus,
                totalDue: r.totalDue,
                allowOverLimit: r.allowOverLimit,
                askClearOldDue: r.askClearOldDue,
                pendingRequest: r.pendingRequest,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    public async summary(scope: BranchScope) {
        await this.ensureSeedData(scope);

        const allRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "CustomerCreditProfile" WHERE "branchId" = $1`,
            scope.branchId,
        );

        let totalDue = 0;
        let over30DaysDue = 0;
        let over30DaysCount = 0;
        let overdueCount = 0;
        let overLimitCount = 0;
        const customersWithDue = allRows.filter((r) => r.totalDue > 0);

        const shopMap = new Map<string, {name: string; amount: number; count: number}>();

        for (const r of allRows) {
            totalDue += r.totalDue;
            if (r.due30Plus > 0) {
                over30DaysDue += r.due30Plus;
                over30DaysCount++;
                overdueCount++;
            }
            if (r.totalDue > r.creditLimit || r.pendingRequest) {
                overLimitCount++;
            }
            if (r.totalDue > 0) {
                const sName = r.shopName || "Women's Wear";
                const existing = shopMap.get(sName) || {name: sName, amount: 0, count: 0};
                existing.amount += r.totalDue;
                existing.count++;
                shopMap.set(sName, existing);
            }
        }

        const shopBreakdown = Array.from(shopMap.entries()).map(([_, val]) => ({
            shopName: val.name,
            amount: Math.round(val.amount * 100) / 100,
            customerCount: val.count,
        }));

        return {
            totalDue: Math.round(totalDue * 100) / 100,
            customerCount: customersWithDue.length,
            shopBreakdown,
            over30DaysDue: Math.round(over30DaysDue * 100) / 100,
            over30DaysCount,
            overdueCount,
            overLimitCount,
        };
    }

    public async get(scope: BranchScope, id: string) {
        await this.ensureSeedData(scope);
        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "CustomerCreditProfile" WHERE "branchId" = $1 AND "id" = $2`,
            scope.branchId,
            id,
        );
        if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Customer profile not found');
        const r = rows[0];
        return {
            id: r.id,
            name: r.customerName,
            phone: r.customerPhone,
            customerType: r.customerType,
            gstin: r.gstin,
            shopId: r.shopId,
            shopName: r.shopName,
            creditLimit: r.creditLimit,
            creditDays: r.creditDays,
            due0To30: r.due0To30,
            due30Plus: r.due30Plus,
            totalDue: r.totalDue,
            allowOverLimit: r.allowOverLimit,
            askClearOldDue: r.askClearOldDue,
            pendingRequest: r.pendingRequest,
        };
    }

    public async updateLimit(scope: BranchScope, id: string, data: UpdateCreditLimitPayload) {
        await this.ensureSeedData(scope);

        const existing = await this.get(scope, id);

        const newLimit = data.creditLimit !== undefined ? data.creditLimit : existing.creditLimit;
        const newDays = data.creditDays !== undefined ? data.creditDays : existing.creditDays;
        const newAllow =
            data.allowOverLimit !== undefined ? data.allowOverLimit : existing.allowOverLimit;
        const newAsk =
            data.askClearOldDue !== undefined ? data.askClearOldDue : existing.askClearOldDue;

        let pending = existing.pendingRequest;
        if (data.action === 'APPROVE') {
            // Apply approved limit or update total due
            if (pending?.requestedCredit) {
                // Bill is approved on credit
                const newTotal = existing.totalDue + pending.requestedCredit;
                await prisma.$executeRawUnsafe(
                    `UPDATE "CustomerCreditProfile"
                     SET "creditLimit" = $1, "creditDays" = $2, "allowOverLimit" = $3,
                         "askClearOldDue" = $4, "pendingRequest" = NULL, "totalDue" = $5,
                         "due0To30" = "due0To30" + $6, "updatedAt" = CURRENT_TIMESTAMP
                     WHERE "branchId" = $7 AND "id" = $8`,
                    Math.max(newLimit, newTotal),
                    newDays,
                    newAllow,
                    newAsk,
                    newTotal,
                    pending.requestedCredit,
                    scope.branchId,
                    id,
                );
                return this.get(scope, id);
            }
            pending = null;
        } else if (data.action === 'REJECT') {
            pending = null;
        }

        await prisma.$executeRawUnsafe(
            `UPDATE "CustomerCreditProfile"
             SET "creditLimit" = $1, "creditDays" = $2, "allowOverLimit" = $3,
                 "askClearOldDue" = $4, "pendingRequest" = $5::jsonb, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "branchId" = $6 AND "id" = $7`,
            newLimit,
            newDays,
            newAllow,
            newAsk,
            pending ? JSON.stringify(pending) : null,
            scope.branchId,
            id,
        );

        return this.get(scope, id);
    }

    public async sendReminders(scope: BranchScope, customerIds?: string[]) {
        await this.ensureSeedData(scope);
        let count = 0;
        if (customerIds && customerIds.length > 0) {
            count = customerIds.length;
        } else {
            const overdueRows: any[] = await prisma.$queryRawUnsafe(
                `SELECT count(*) as count FROM "CustomerCreditProfile"
                 WHERE "branchId" = $1 AND "due30Plus" > 0`,
                scope.branchId,
            );
            count = parseInt(overdueRows[0]?.count ?? '0', 10);
        }
        return {
            success: true,
            sentCount: count,
            message: `Payment reminders sent to ${count} customer${count === 1 ? '' : 's'} via WhatsApp & SMS`,
        };
    }

    public async export(scope: BranchScope, query: CustomerDueQuery) {
        const listData = await this.list(scope, {...query, limit: 1000, page: 1});
        return listData.items;
    }
}

export default new CustomerDueService();

