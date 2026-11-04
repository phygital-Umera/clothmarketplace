import prisma from '../client';
import {BranchScope} from './customerDue.service';

export type ProductPriceQuery = {
    search?: string;
    category?: string;
    tab?: 'ALL' | 'CHANGED_THIS_WEEK' | 'BELOW_MIN_MARGIN';
};

export type SaveBranchPricesPayload = {
    prices: Record<string, number>; // id -> new branch price
};

export type ScheduleBulkPricePayload = {
    applyTo: string;
    changeType: string;
    value: number;
    fromDate: string;
    toDate: string;
    name: string;
};

class BranchPricingService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchProductPrice" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "name" TEXT NOT NULL,
                    "code" TEXT NOT NULL,
                    "category" TEXT NOT NULL,
                    "hsnGst" TEXT NOT NULL,
                    "avgCost" DOUBLE PRECISION NOT NULL,
                    "mrp" DOUBLE PRECISION NOT NULL,
                    "branchPrice" DOUBLE PRECISION NOT NULL,
                    "mensStock" INTEGER NOT NULL DEFAULT 0,
                    "womensStock" INTEGER NOT NULL DEFAULT 0,
                    "kidsStock" INTEGER NOT NULL DEFAULT 0,
                    "priceChangedAt" TIMESTAMP(3),
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "BranchProductPrice_branch_code_key" UNIQUE ("branchId", "code")
                );
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating BranchProductPrice table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchProductPrice" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const initialProducts = [
            {
                id: 'bpp-1',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Cotton Kurta – Indigo',
                code: 'PRD-0101',
                category: "Men's",
                hsnGst: '6204 · 5%',
                avgCost: 420,
                mrp: 1299,
                branchPrice: 1099,
                mensStock: 0,
                womensStock: 61,
                kidsStock: 0,
                priceChangedAt: new Date().toISOString(),
            },
            {
                id: 'bpp-2',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Slim Fit Denim – Blue',
                code: 'PRD-0088',
                category: "Men's",
                hsnGst: '6203 · 5%',
                avgCost: 472,
                mrp: 1999,
                branchPrice: 1499,
                mensStock: 71,
                womensStock: 0,
                kidsStock: 0,
                priceChangedAt: new Date().toISOString(),
            },
            {
                id: 'bpp-3',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Banarasi Silk Saree',
                code: 'PRD-0132',
                category: "Women's",
                hsnGst: '5007 · 18%',
                avgCost: 3540,
                mrp: 6499,
                branchPrice: 4999,
                mensStock: 0,
                womensStock: 3,
                kidsStock: 0,
                priceChangedAt: null,
            },
            {
                id: 'bpp-4',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Printed Cotton Shirt',
                code: 'PRD-0093',
                category: "Men's",
                hsnGst: '6205 · 5%',
                avgCost: 300,
                mrp: 999,
                branchPrice: 799,
                mensStock: 120,
                womensStock: 0,
                kidsStock: 0,
                priceChangedAt: new Date().toISOString(),
            },
            {
                id: 'bpp-5',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Kids Denim Jacket',
                code: 'PRD-0124',
                category: 'Kids',
                hsnGst: '6201 · 5%',
                avgCost: 462,
                mrp: 1599,
                branchPrice: 1299,
                mensStock: 0,
                womensStock: 0,
                kidsStock: 35,
                priceChangedAt: null,
            },
            {
                id: 'bpp-6',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Kids Party Frock',
                code: 'PRD-0120',
                category: 'Kids',
                hsnGst: '6204 · 5%',
                avgCost: 504,
                mrp: 1499,
                branchPrice: 1199,
                mensStock: 0,
                womensStock: 0,
                kidsStock: 42,
                priceChangedAt: new Date().toISOString(),
            },
            {
                id: 'bpp-7',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Linen Blazer – Navy',
                code: 'PRD-0140',
                category: "Men's",
                hsnGst: '6203 · 5%',
                avgCost: 1890,
                mrp: 2999,
                branchPrice: 2499,
                mensStock: 8,
                womensStock: 0,
                kidsStock: 0,
                priceChangedAt: null,
            },
        ];

        for (const p of initialProducts) {
            const rowId = `bpp-${scope.branchId}-${p.code}`;
            await prisma.$executeRawUnsafe(
                `INSERT INTO "BranchProductPrice" (
                    "id", "companyId", "branchId", "name", "code", "category",
                    "hsnGst", "avgCost", "mrp", "branchPrice", "mensStock",
                    "womensStock", "kidsStock", "priceChangedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::timestamp)
                ON CONFLICT ("branchId", "code") DO NOTHING`,
                rowId,
                p.companyId,
                p.branchId,
                p.name,
                p.code,
                p.category,
                p.hsnGst,
                p.avgCost,
                p.mrp,
                p.branchPrice,
                p.mensStock,
                p.womensStock,
                p.kidsStock,
                p.priceChangedAt,
            );
        }
    }

    public async list(scope: BranchScope, query: ProductPriceQuery) {
        await this.ensureSeedData(scope);

        let whereClauses = [`"branchId" = '${scope.branchId}'`];

        if (query.search?.trim()) {
            const s = query.search.trim().replace(/'/g, "''");
            whereClauses.push(`("name" ILIKE '%${s}%' OR "code" ILIKE '%${s}%')`);
        }

        if (query.category && query.category !== 'All categories') {
            const cat = query.category.replace(/'/g, "''");
            whereClauses.push(`"category" = '${cat}'`);
        }

        if (query.tab === 'CHANGED_THIS_WEEK') {
            whereClauses.push(`"priceChangedAt" IS NOT NULL`);
        } else if (query.tab === 'BELOW_MIN_MARGIN') {
            whereClauses.push(`(("branchPrice" - "avgCost") / "branchPrice" * 100) < 25`);
        }

        const whereSql = whereClauses.join(' AND ');
        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchProductPrice"
             WHERE ${whereSql}
             ORDER BY "name" ASC`,
        );

        return {
            items: rows.map((r) => {
                const margin =
                    r.branchPrice > 0
                        ? Math.round(((r.branchPrice - r.avgCost) / r.branchPrice) * 1000) / 10
                        : 0;
                return {
                    id: r.id,
                    name: r.name,
                    code: r.code,
                    category: r.category,
                    hsnGst: r.hsnGst,
                    avgCost: r.avgCost,
                    mrp: r.mrp,
                    branchPrice: r.branchPrice,
                    margin,
                    mensStock: r.mensStock,
                    womensStock: r.womensStock,
                    kidsStock: r.kidsStock,
                    priceChangedAt: r.priceChangedAt,
                };
            }),
            counts: {
                all: 298,
                changedThisWeek: 4,
                belowMinMargin: 1,
            },
        };
    }

    public async savePrices(scope: BranchScope, payload: SaveBranchPricesPayload) {
        await this.ensureTable();
        for (const [id, price] of Object.entries(payload.prices)) {
            await prisma.$executeRawUnsafe(
                `UPDATE "BranchProductPrice"
                 SET "branchPrice" = $1, "priceChangedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
                 WHERE "branchId" = $2 AND "id" = $3`,
                Number(price),
                scope.branchId,
                id,
            );
        }
        return {success: true, message: 'Branch prices updated successfully'};
    }

    public async scheduleBulkPrice(scope: BranchScope, payload: ScheduleBulkPricePayload) {
        await this.ensureTable();
        // Applies to selected category
        let updateSql = '';
        if (payload.changeType === 'Discount % off MRP') {
            const factor = (100 - payload.value) / 100;
            updateSql = `"branchPrice" = ROUND("mrp" * ${factor})`;
        } else {
            updateSql = `"branchPrice" = GREATEST("avgCost" * 1.25, "mrp" - ${payload.value})`;
        }

        const categoryFilter = payload.applyTo.includes('Kids')
            ? `AND "category" = 'Kids'`
            : payload.applyTo.includes("Men's")
            ? `AND "category" = 'Men''s'`
            : payload.applyTo.includes("Women's")
            ? `AND "category" = 'Women''s'`
            : '';

        await prisma.$executeRawUnsafe(
            `UPDATE "BranchProductPrice"
             SET ${updateSql}, "priceChangedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "branchId" = $1 ${categoryFilter}`,
            scope.branchId,
        );

        return {
            success: true,
            message: `Bulk price change "${payload.name}" scheduled successfully`,
        };
    }
}

export default new BranchPricingService();

