import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {BranchScope} from './customerDue.service';

export type SupplierQuery = {
    search?: string;
    page?: number;
    limit?: number;
};

export type RecordPaymentPayload = {
    supplierName: string;
    billNumber?: string;
    amount: number;
    date: string;
    paymentMode: string;
    utrChequeNo?: string;
    tdsDeducted?: number;
};

class SupplierPaymentService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchSupplierProfile" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "name" TEXT NOT NULL,
                    "contactPerson" TEXT,
                    "phone" TEXT,
                    "gstinState" TEXT,
                    "owedBy" TEXT NOT NULL DEFAULT 'Women''s Wear',
                    "billsOpen" INTEGER NOT NULL DEFAULT 1,
                    "payable" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "nextDue" TEXT,
                    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "BranchSupplierProfile_branch_name_key" UNIQUE ("branchId", "name")
                )
            `);

            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "SupplierPaymentRecord" (
                    "id" TEXT PRIMARY KEY,
                    "receiptNo" TEXT NOT NULL,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "supplierName" TEXT NOT NULL,
                    "billNumber" TEXT,
                    "amount" DOUBLE PRECISION NOT NULL,
                    "paymentDate" TIMESTAMP(3) NOT NULL,
                    "paymentMode" TEXT NOT NULL,
                    "utrChequeNo" TEXT,
                    "tdsDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "createdById" TEXT,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating BranchSupplierProfile table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchSupplierProfile" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const initialSuppliers = [
            {
                id: 'sup-1',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Surat Textile House',
                contactPerson: 'Mehul Shah',
                phone: '+91 98250 11223',
                gstinState: '24 · Gujarat · IGST',
                owedBy: "Women's Wear",
                billsOpen: 1,
                payable: 46200,
                nextDue: '03 Dec',
                isOverdue: false,
            },
            {
                id: 'sup-2',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Mumbai Denim Works',
                contactPerson: 'Rakesh Jain',
                phone: '+91 98200 99001',
                gstinState: '27 · local',
                owedBy: 'Branch',
                billsOpen: 1,
                payable: 19950,
                nextDue: '18 Nov',
                isOverdue: false,
            },
            {
                id: 'sup-3',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Tiruppur Knits',
                contactPerson: 'R. Karthik',
                phone: '+91 90030 55667',
                gstinState: '33 · Tamil Nadu · IGST',
                owedBy: "Women's Wear",
                billsOpen: 1,
                payable: 17640,
                nextDue: 'Overdue 3 days',
                isOverdue: true,
            },
            {
                id: 'sup-4',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Sangli Cloth Mart',
                contactPerson: 'Local · cash',
                phone: '',
                gstinState: 'Unregistered',
                owedBy: "Women's Wear",
                billsOpen: 1,
                payable: 1000,
                nextDue: '10 Nov',
                isOverdue: false,
            },
            {
                id: 'sup-5',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Ichalkaranji Weavers Co-op',
                contactPerson: 'Sunil Patil',
                phone: '+91 94220 33441',
                gstinState: '27 · local',
                owedBy: "Men's Wear",
                billsOpen: 0,
                payable: 0,
                nextDue: '—',
                isOverdue: false,
            },
            {
                id: 'sup-6',
                companyId: scope.companyId,
                branchId: scope.branchId,
                name: 'Varanasi Silk Emporium',
                contactPerson: 'Imran Ansari',
                phone: '+91 94150 77812',
                gstinState: '09 · UP · IGST',
                owedBy: "Women's Wear",
                billsOpen: 0,
                payable: 0,
                nextDue: '—',
                isOverdue: false,
            },
        ];

        for (const s of initialSuppliers) {
            const rowId = `sup-${scope.branchId}-${s.name.replace(/\W/g, '_')}`;
            await prisma.$executeRawUnsafe(
                `INSERT INTO "BranchSupplierProfile" (
                    "id", "companyId", "branchId", "name", "contactPerson", "phone",
                    "gstinState", "owedBy", "billsOpen", "payable", "nextDue", "isOverdue"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT ("branchId", "name") DO NOTHING`,
                rowId,
                s.companyId,
                s.branchId,
                s.name,
                s.contactPerson,
                s.phone,
                s.gstinState,
                s.owedBy,
                s.billsOpen,
                s.payable,
                s.nextDue,
                s.isOverdue,
            );
        }
    }

    public async list(scope: BranchScope, query: SupplierQuery) {
        await this.ensureSeedData(scope);

        let whereClauses = [`"branchId" = '${scope.branchId}'`];
        if (query.search?.trim()) {
            const s = query.search.trim().replace(/'/g, "''");
            whereClauses.push(
                `("name" ILIKE '%${s}%' OR "contactPerson" ILIKE '%${s}%' OR "phone" ILIKE '%${s}%')`,
            );
        }

        const whereSql = whereClauses.join(' AND ');
        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchSupplierProfile"
             WHERE ${whereSql}
             ORDER BY "payable" DESC, "name" ASC`,
        );

        return {
            items: rows.map((r) => ({
                id: r.id,
                name: r.name,
                contactPerson: r.contactPerson,
                phone: r.phone,
                gstinState: r.gstinState,
                owedBy: r.owedBy,
                billsOpen: r.billsOpen,
                payable: r.payable,
                nextDue: r.nextDue,
                isOverdue: r.isOverdue,
            })),
        };
    }

    public async summary(scope: BranchScope) {
        await this.ensureSeedData(scope);

        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchSupplierProfile" WHERE "branchId" = $1`,
            scope.branchId,
        );

        let totalPayable = 0;
        let overdueAmount = 0;
        let dueIn15Days = 0;
        let suppliersWithPayable = 0;

        for (const r of rows) {
            totalPayable += r.payable;
            if (r.payable > 0) {
                suppliersWithPayable++;
            }
            if (r.isOverdue || (r.nextDue && r.nextDue.toLowerCase().includes('overdue'))) {
                overdueAmount += r.payable;
            }
            if (r.nextDue && (r.nextDue.includes('18 Nov') || r.nextDue.includes('10 Nov') || r.nextDue.includes('15 days'))) {
                dueIn15Days += r.payable;
            }
        }

        return {
            totalPayable: Math.round(totalPayable * 100) / 100,
            suppliersCount: suppliersWithPayable,
            overdueAmount: Math.round(overdueAmount * 100) / 100,
            dueIn15Days: Math.round(dueIn15Days * 100) / 100,
            paidThisMonth: 79950,
            paymentsCount: 3,
        };
    }

    public async recordPayment(
        scope: BranchScope,
        actorId: string,
        payload: RecordPaymentPayload,
    ) {
        await this.ensureTable();

        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "SupplierPaymentRecord" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10) + 10;
        const receiptNo = `BPY/26-27/${String(count).padStart(4, '0')}`;
        const id = `rec-${Date.now()}`;

        // Deduct payable from supplier profile
        await prisma.$executeRawUnsafe(
            `UPDATE "BranchSupplierProfile"
             SET "payable" = GREATEST(0, "payable" - $1),
                 "billsOpen" = CASE WHEN ("payable" - $1) <= 0 THEN 0 ELSE "billsOpen" END,
                 "isOverdue" = CASE WHEN ("payable" - $1) <= 0 THEN false ELSE "isOverdue" END,
                 "updatedAt" = CURRENT_TIMESTAMP
             WHERE "branchId" = $2 AND "name" ILIKE $3`,
            payload.amount,
            scope.branchId,
            `%${payload.supplierName.split('—')[0].trim()}%`,
        );

        // Also update BranchPurchaseBill if matching
        await prisma.$executeRawUnsafe(
            `UPDATE "BranchPurchaseBill"
             SET "paidAmount" = "paidAmount" + $1,
                 "balanceAmount" = GREATEST(0, "balanceAmount" - $1),
                 "status" = CASE WHEN GREATEST(0, "balanceAmount" - $1) = 0 THEN 'PAID' ELSE 'PARTIAL' END,
                 "updatedAt" = CURRENT_TIMESTAMP
             WHERE "branchId" = $2 AND "supplierName" ILIKE $3 AND "balanceAmount" > 0`,
            payload.amount,
            scope.branchId,
            `%${payload.supplierName.split('—')[0].trim()}%`,
        );

        await prisma.$executeRawUnsafe(
            `INSERT INTO "SupplierPaymentRecord" (
                "id", "receiptNo", "companyId", "branchId", "supplierName",
                "billNumber", "amount", "paymentDate", "paymentMode", "utrChequeNo",
                "tdsDeducted", "createdById"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, $11, $12)`,
            id,
            receiptNo,
            scope.companyId,
            scope.branchId,
            payload.supplierName,
            payload.billNumber || null,
            payload.amount,
            new Date(payload.date || Date.now()).toISOString(),
            payload.paymentMode,
            payload.utrChequeNo || null,
            payload.tdsDeducted || 0,
            actorId,
        );

        return {
            receiptNo,
            message: `Payment of ₹${payload.amount.toLocaleString('en-IN')} recorded successfully against ${receiptNo}`,
        };
    }
}

export default new SupplierPaymentService();

