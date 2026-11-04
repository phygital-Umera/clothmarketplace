import prisma from '../client';
import {BranchScope} from './customerDue.service';

export type DayCloseShopRow = {
    id: string;
    shopName: string;
    closedBy: string;
    opening: number;
    cashSales: number;
    duesCollected: number;
    cashOut: number;
    expected: number;
    counted: number;
    diff: number;
    status: 'ACCEPTED' | 'NEEDS_REVIEW';
    reason?: string;
    action?: string;
    note?: string;
};

export type ResolveDiffPayload = {
    shopName: string;
    date: string;
    reason: string;
    action: string;
    note: string;
};

export type RecordDepositPayload = {
    amount: number;
    bank: string;
    depositSlipUtr?: string;
    slipUrl?: string;
    date: string;
};

class DayCloseService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchDayClose" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "closeDate" TEXT NOT NULL,
                    "shopName" TEXT NOT NULL,
                    "closedBy" TEXT NOT NULL,
                    "opening" DOUBLE PRECISION NOT NULL DEFAULT 1000,
                    "cashSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "duesCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "cashOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "expected" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "counted" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "diff" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
                    "reason" TEXT,
                    "action" TEXT,
                    "note" TEXT,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "BranchDayClose_date_shop_key" UNIQUE ("branchId", "closeDate", "shopName")
                )
            `);

            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchBankDeposit" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "depositDate" TEXT NOT NULL,
                    "amount" DOUBLE PRECISION NOT NULL,
                    "bank" TEXT NOT NULL,
                    "depositSlipUtr" TEXT,
                    "slipUrl" TEXT,
                    "createdById" TEXT,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating BranchDayClose table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope, dateStr: string) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchDayClose" WHERE "branchId" = $1 AND "closeDate" = $2`,
            scope.branchId,
            dateStr,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const initialRows = [
            {
                id: `dc-${dateStr}-1`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                closeDate: dateStr,
                shopName: "Men's Wear",
                closedBy: 'Sagar Jadhav · 9:12 PM',
                opening: 1000,
                cashSales: 4180,
                duesCollected: 500,
                cashOut: 600,
                expected: 5080,
                counted: 4880,
                diff: -200,
                status: 'NEEDS_REVIEW',
                reason: 'Change given wrongly',
                action: 'Write off as cash short',
                note: 'Sagar says ₹200 change given twice at 6 PM rush',
            },
            {
                id: `dc-${dateStr}-2`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                closeDate: dateStr,
                shopName: "Women's Wear",
                closedBy: 'Rutuja Pawar · 9:05 PM',
                opening: 1000,
                cashSales: 6150,
                duesCollected: 2000,
                cashOut: 900,
                expected: 8250,
                counted: 8250,
                diff: 0,
                status: 'ACCEPTED',
                reason: null,
                action: null,
                note: null,
            },
            {
                id: `dc-${dateStr}-3`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                closeDate: dateStr,
                shopName: 'Kids Wear',
                closedBy: 'Kiran More · 8:58 PM',
                opening: 1000,
                cashSales: 2010,
                duesCollected: 0,
                cashOut: 200,
                expected: 2810,
                counted: 2810,
                diff: 0,
                status: 'ACCEPTED',
                reason: null,
                action: null,
                note: null,
            },
        ];

        for (const r of initialRows) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "BranchDayClose" (
                    "id", "companyId", "branchId", "closeDate", "shopName",
                    "closedBy", "opening", "cashSales", "duesCollected", "cashOut",
                    "expected", "counted", "diff", "status", "reason", "action", "note"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT ("branchId", "closeDate", "shopName") DO NOTHING`,
                r.id,
                r.companyId,
                r.branchId,
                r.closeDate,
                r.shopName,
                r.closedBy,
                r.opening,
                r.cashSales,
                r.duesCollected,
                r.cashOut,
                r.expected,
                r.counted,
                r.diff,
                r.status,
                r.reason,
                r.action,
                r.note,
            );
        }
    }

    public async getDayClose(scope: BranchScope, dateStr = '2026-11-02') {
        await this.ensureSeedData(scope, dateStr);

        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchDayClose"
             WHERE "branchId" = $1 AND "closeDate" = $2
             ORDER BY "shopName" ASC`,
            scope.branchId,
            dateStr,
        );

        let totalOpening = 0;
        let totalCashSales = 0;
        let totalDuesCollected = 0;
        let totalCashOut = 0;
        let totalExpected = 0;
        let totalCounted = 0;
        let totalDiff = 0;
        let diffShop = '';

        const shops: DayCloseShopRow[] = rows.map((r) => {
            totalOpening += r.opening;
            totalCashSales += r.cashSales;
            totalDuesCollected += r.duesCollected;
            totalCashOut += r.cashOut;
            totalExpected += r.expected;
            totalCounted += r.counted;
            totalDiff += r.diff;
            if (r.diff !== 0) {
                diffShop = `${r.shopName} — explain`;
            }
            return {
                id: r.id,
                shopName: r.shopName,
                closedBy: r.closedBy,
                opening: r.opening,
                cashSales: r.cashSales,
                duesCollected: r.duesCollected,
                cashOut: r.cashOut,
                expected: r.expected,
                counted: r.counted,
                diff: r.diff,
                status: r.status,
                reason: r.reason,
                action: r.action,
                note: r.note,
            };
        });

        // Check if bank deposit already recorded
        const depositRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchBankDeposit" WHERE "branchId" = $1 AND "depositDate" = $2`,
            scope.branchId,
            dateStr,
        );
        const hasDeposit = depositRows.length > 0;
        const toBankAmount = totalCounted - totalOpening;

        return {
            date: dateStr,
            summary: {
                cashSales: totalCashSales,
                countersCount: shops.length,
                counted: totalCounted,
                openingFloats: totalOpening,
                difference: totalDiff,
                differenceShop: diffShop || 'Balanced',
                toBank: toBankAmount,
                depositStatus: hasDeposit ? 'Deposited' : 'Deposit slip pending',
            },
            shops,
            totals: {
                opening: totalOpening,
                cashSales: totalCashSales,
                duesCollected: totalDuesCollected,
                cashOut: totalCashOut,
                expected: totalExpected,
                counted: totalCounted,
                diff: totalDiff,
            },
            reviewItem: shops.find((s) => s.status === 'NEEDS_REVIEW') || null,
        };
    }

    public async resolveDifference(
        scope: BranchScope,
        actorId: string,
        payload: ResolveDiffPayload,
    ) {
        await this.ensureTable();
        await prisma.$executeRawUnsafe(
            `UPDATE "BranchDayClose"
             SET "status" = 'ACCEPTED', "reason" = $1, "action" = $2, "note" = $3, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "branchId" = $4 AND "closeDate" = $5 AND "shopName" = $6`,
            payload.reason,
            payload.action,
            payload.note,
            scope.branchId,
            payload.date,
            payload.shopName,
        );
        return {success: true, message: `Day close accepted for ${payload.shopName}`};
    }

    public async recordDeposit(
        scope: BranchScope,
        actorId: string,
        payload: RecordDepositPayload,
    ) {
        await this.ensureTable();
        const id = `dep-${Date.now()}`;
        await prisma.$executeRawUnsafe(
            `INSERT INTO "BranchBankDeposit" (
                "id", "companyId", "branchId", "depositDate", "amount",
                "bank", "depositSlipUtr", "slipUrl", "createdById"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            id,
            scope.companyId,
            scope.branchId,
            payload.date,
            payload.amount,
            payload.bank,
            payload.depositSlipUtr || null,
            payload.slipUrl || null,
            actorId,
        );
        return {
            success: true,
            message: `Bank deposit of ₹${payload.amount.toLocaleString('en-IN')} recorded successfully`,
        };
    }
}

export default new DayCloseService();

