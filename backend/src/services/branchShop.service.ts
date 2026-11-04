import prisma from '../client';
import {BranchScope} from './customerDue.service';

export type BranchShopCard = {
    id: string;
    name: string;
    code: string;
    locationDesc: string;
    status: 'ACTIVE' | 'PENDING' | 'CLOSED';
    manager: string;
    staffCount: number;
    stockUnits: number;
    salesMtd: number;
    nextBillNo: string;
};

export type AddShopPayload = {
    name: string;
    code: string;
    shopType: string;
    floorSection?: string;
    phone?: string;
    invoicePrefix: string;
    posBillingEnabled?: boolean;
    allowCreditSales?: boolean;
};

class BranchShopService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchShopOverview" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "name" TEXT NOT NULL,
                    "code" TEXT NOT NULL,
                    "locationDesc" TEXT NOT NULL,
                    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
                    "manager" TEXT NOT NULL DEFAULT 'Not assigned',
                    "staffCount" INTEGER NOT NULL DEFAULT 0,
                    "stockUnits" INTEGER NOT NULL DEFAULT 0,
                    "salesMtd" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "nextBillNo" TEXT NOT NULL,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "BranchShopOverview_branch_code_key" UNIQUE ("branchId", "code")
                )
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating BranchShopOverview table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchShopOverview" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const initialShops = [
            {
                id: `bso-${scope.branchId}-1`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: "Men's Wear",
                code: 'MAT-B02-S01',
                locationDesc: "Men's wear · Ground floor",
                status: 'ACTIVE',
                manager: 'Rahul Mane',
                staffCount: 5,
                stockUnits: 1240,
                salesMtd: 82300,
                nextBillNo: 'MW/26-27/00190',
            },
            {
                id: `bso-${scope.branchId}-2`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: "Women's Wear",
                code: 'MAT-B02-S02',
                locationDesc: "Women's wear · First floor",
                status: 'ACTIVE',
                manager: 'Priya Shinde',
                staffCount: 6,
                stockUnits: 1560,
                salesMtd: 93150,
                nextBillNo: 'WW/26-27/00236',
            },
            {
                id: `bso-${scope.branchId}-3`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Kids Wear',
                code: 'MAT-B02-S03',
                locationDesc: 'Kids wear · First floor, rear',
                status: 'ACTIVE',
                manager: 'Not assigned',
                staffCount: 3,
                stockUnits: 620,
                salesMtd: 21300,
                nextBillNo: 'KW/26-27/00078',
            },
        ];

        for (const s of initialShops) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "BranchShopOverview" (
                    "id", "companyId", "branchId", "name", "code", "locationDesc",
                    "status", "manager", "staffCount", "stockUnits", "salesMtd", "nextBillNo"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT ("branchId", "code") DO NOTHING`,
                s.id,
                s.companyId,
                s.branchId,
                s.name,
                s.code,
                s.locationDesc,
                s.status,
                s.manager,
                s.staffCount,
                s.stockUnits,
                s.salesMtd,
                s.nextBillNo,
            );
        }
    }

    public async getShops(scope: BranchScope) {
        await this.ensureSeedData(scope);

        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchShopOverview" WHERE "branchId" = $1 ORDER BY "code" ASC`,
            scope.branchId,
        );

        return {
            branchName: 'Sangli Branch',
            branchCode: 'MAT-B02',
            shopsCount: rows.length,
            shops: rows.map((r) => ({
                id: r.id,
                name: r.name,
                code: r.code,
                locationDesc: r.locationDesc,
                status: r.status,
                manager: r.manager,
                staffCount: r.staffCount,
                stockUnits: r.stockUnits,
                salesMtd: r.salesMtd,
                nextBillNo: r.nextBillNo,
            })),
        };
    }

    public async addShop(scope: BranchScope, payload: AddShopPayload) {
        await this.ensureTable();
        const id = `bso-${scope.branchId}-${Date.now()}`;
        const locDesc = `${payload.name} · ${payload.floorSection || 'Section pending'}`;
        const nextBill = `${payload.invoicePrefix || 'SH/'}00001`;

        await prisma.$executeRawUnsafe(
            `INSERT INTO "BranchShopOverview" (
                "id", "companyId", "branchId", "name", "code", "locationDesc",
                "status", "manager", "staffCount", "stockUnits", "salesMtd", "nextBillNo"
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', 'Not assigned', 0, 0, 0, $7)
            ON CONFLICT ("branchId", "code") DO UPDATE SET "name" = EXCLUDED."name"`,
            id,
            scope.companyId,
            scope.branchId,
            payload.name,
            payload.code,
            locDesc,
            nextBill,
        );

        return {success: true, message: `Shop ${payload.name} submitted for Company Admin activation`};
    }
}

export default new BranchShopService();

