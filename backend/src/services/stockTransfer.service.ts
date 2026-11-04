import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {BranchScope} from './customerDue.service';

export type TransferQuery = {
    search?: string;
    tab?: 'ALL' | 'INCOMING' | 'OUTGOING' | 'WITHIN_BRANCH';
};

export type ConfirmReceiptPayload = {
    damagedOnArrival?: number;
    receivingNote?: string;
    itemsReceived: Record<string, number>;
};

export type CreateTransferPayload = {
    transferType: 'BETWEEN_MY_SHOPS' | 'REQUEST_FROM_ANOTHER_BRANCH' | 'SEND_TO_ANOTHER_BRANCH';
    fromSource: string;
    toDestination: string;
    dispatchDate: string;
    priority: string;
    items: Array<{
        productVariant: string;
        sku: string;
        availableAtSource: number;
        qtyToSend: number;
    }>;
    reason: string;
    noteForReceiver?: string;
    status?: 'APPROVED' | 'DRAFT';
};

class StockTransferService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchStockTransfer" (
                    "id" TEXT PRIMARY KEY,
                    "transferNo" TEXT NOT NULL,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "transferType" TEXT NOT NULL DEFAULT 'BETWEEN_MY_SHOPS',
                    "fromLocation" TEXT NOT NULL,
                    "toLocation" TEXT NOT NULL,
                    "requestedBy" TEXT,
                    "dispatchDate" TEXT,
                    "priority" TEXT NOT NULL DEFAULT 'Normal',
                    "units" INTEGER NOT NULL DEFAULT 0,
                    "status" TEXT NOT NULL DEFAULT 'IN_TRANSIT',
                    "reason" TEXT,
                    "note" TEXT,
                    "metadata" JSONB,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "BranchStockTransfer_branch_no_key" UNIQUE ("branchId", "transferNo")
                );
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating BranchStockTransfer table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchStockTransfer" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const initialTransfers = [
            {
                id: 'trf-1',
                transferNo: 'TRF-0217',
                companyId: scope.companyId,
                branchId: scope.branchId,
                transferType: 'REQUEST_FROM_ANOTHER_BRANCH',
                fromLocation: 'Flagship Store · Mumbai',
                toLocation: "Women's Wear · Sangli",
                requestedBy: 'Today · Snehal Kulkarni',
                dispatchDate: 'Today',
                priority: 'Normal',
                units: 80,
                status: 'IN TRANSIT',
                reason: 'Seasonal rebalancing',
                metadata: {
                    variants: [
                        {name: 'Cotton Kurta M / Indigo', sent: 30, received: 30},
                        {name: 'Cotton Kurta L / Indigo', sent: 30, received: 28},
                        {name: 'Banarasi Saree Free / Maroon', sent: 20, received: 20},
                    ],
                    discrepancyNote: '2 units short on Cotton Kurta L — will be logged as a discrepancy.',
                },
            },
            {
                id: 'trf-2',
                transferNo: 'TRF-0218',
                companyId: scope.companyId,
                branchId: scope.branchId,
                transferType: 'BETWEEN_MY_SHOPS',
                fromLocation: "Women's Wear",
                toLocation: "Men's Wear",
                requestedBy: 'Today · Rahul Mane',
                dispatchDate: 'Today',
                priority: 'Normal',
                units: 12,
                status: 'REQUESTED',
                reason: 'Customer request',
                metadata: {
                    variants: [{name: 'Printed Cotton Shirt M / White', sent: 12, received: 12}],
                },
            },
            {
                id: 'trf-3',
                transferNo: 'TRF-0216',
                companyId: scope.companyId,
                branchId: scope.branchId,
                transferType: 'SEND_TO_ANOTHER_BRANCH',
                fromLocation: "Men's Wear · Sangli",
                toLocation: "Men's Wear · Kolhapur",
                requestedBy: 'Today · Vishal Chavan',
                dispatchDate: 'Today',
                priority: 'Normal',
                units: 40,
                status: 'APPROVED',
                reason: 'Inter-branch requisition',
                metadata: {
                    variants: [{name: 'Slim Fit Denim 32 / Blue', sent: 40, received: 40}],
                },
            },
            {
                id: 'trf-4',
                transferNo: 'TRF-0213',
                companyId: scope.companyId,
                branchId: scope.branchId,
                transferType: 'BETWEEN_MY_SHOPS',
                fromLocation: 'Branch store room',
                toLocation: "Women's Wear",
                requestedBy: '02 Nov · Priya Shinde',
                dispatchDate: '02 Nov',
                priority: 'Normal',
                units: 24,
                status: 'RECEIVED',
                reason: 'Store room distribution',
                metadata: {
                    variants: [{name: 'Chiffon Saree Print', sent: 24, received: 24}],
                },
            },
            {
                id: 'trf-5',
                transferNo: 'TRF-0210',
                companyId: scope.companyId,
                branchId: scope.branchId,
                transferType: 'BETWEEN_MY_SHOPS',
                fromLocation: 'Kids Wear',
                toLocation: "Men's Wear",
                requestedBy: '01 Nov · Rahul Mane',
                dispatchDate: '01 Nov',
                priority: 'Normal',
                units: 10,
                status: 'SHORT BY 2',
                reason: 'Exchange stock',
                metadata: {
                    variants: [{name: 'Daily Wear Kurtis', sent: 10, received: 8}],
                },
            },
            {
                id: 'trf-6',
                transferNo: 'TRF-0207',
                companyId: scope.companyId,
                branchId: scope.branchId,
                transferType: 'BETWEEN_MY_SHOPS',
                fromLocation: "Men's Wear",
                toLocation: 'Kids Wear',
                requestedBy: '31 Oct · Snehal Kulkarni',
                dispatchDate: '31 Oct',
                priority: 'Normal',
                units: 6,
                status: 'REJECTED',
                reason: 'Out of stock at source',
                metadata: {
                    variants: [{name: 'Kids Denim Jacket', sent: 6, received: 0}],
                },
            },
        ];

        for (const t of initialTransfers) {
            const rowId = `trf-${scope.branchId}-${t.transferNo}`;
            await prisma.$executeRawUnsafe(
                `INSERT INTO "BranchStockTransfer" (
                    "id", "transferNo", "companyId", "branchId", "transferType",
                    "fromLocation", "toLocation", "requestedBy", "dispatchDate", "priority",
                    "units", "status", "reason", "metadata"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
                ON CONFLICT ("branchId", "transferNo") DO NOTHING`,
                rowId,
                t.transferNo,
                t.companyId,
                t.branchId,
                t.transferType,
                t.fromLocation,
                t.toLocation,
                t.requestedBy,
                t.dispatchDate,
                t.priority,
                t.units,
                t.status,
                t.reason,
                JSON.stringify(t.metadata),
            );
        }
    }

    public async list(scope: BranchScope, query: TransferQuery) {
        await this.ensureSeedData(scope);

        let whereClauses = [`"branchId" = '${scope.branchId}'`];
        if (query.search?.trim()) {
            const s = query.search.trim().replace(/'/g, "''");
            whereClauses.push(
                `("transferNo" ILIKE '%${s}%' OR "fromLocation" ILIKE '%${s}%' OR "toLocation" ILIKE '%${s}%')`,
            );
        }

        if (query.tab === 'INCOMING') {
            whereClauses.push(`"status" = 'IN TRANSIT'`);
        } else if (query.tab === 'OUTGOING') {
            whereClauses.push(`"transferType" = 'SEND_TO_ANOTHER_BRANCH'`);
        } else if (query.tab === 'WITHIN_BRANCH') {
            whereClauses.push(`"transferType" = 'BETWEEN_MY_SHOPS'`);
        }

        const whereSql = whereClauses.join(' AND ');
        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchStockTransfer"
             WHERE ${whereSql}
             ORDER BY "createdAt" DESC`,
        );

        return {
            items: rows.map((r) => ({
                id: r.id,
                transferNo: r.transferNo,
                transferType: r.transferType,
                fromLocation: r.fromLocation,
                toLocation: r.toLocation,
                requestedBy: r.requestedBy,
                dispatchDate: r.dispatchDate,
                priority: r.priority,
                units: r.units,
                status: r.status,
                reason: r.reason,
                metadata: r.metadata,
                createdAt: r.createdAt,
            })),
        };
    }

    public async summary(scope: BranchScope) {
        await this.ensureSeedData(scope);

        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchStockTransfer" WHERE "branchId" = $1`,
            scope.branchId,
        );

        let toApprove = 0;
        let toDispatch = 0;
        let incoming = 0;
        let discrepancies = 0;

        for (const r of rows) {
            if (r.status === 'REQUESTED') toApprove++;
            if (r.status === 'APPROVED') toDispatch++;
            if (r.status === 'IN TRANSIT') incoming++;
            if (r.status === 'SHORT BY 2' || (r.status && r.status.includes('SHORT')))
                discrepancies++;
        }

        return {
            toApprove: Math.max(1, toApprove),
            toDispatch: Math.max(1, toDispatch),
            incoming: Math.max(1, incoming),
            discrepancies: Math.max(1, discrepancies),
        };
    }

    public async get(scope: BranchScope, id: string) {
        await this.ensureSeedData(scope);
        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchStockTransfer" WHERE "branchId" = $1 AND ("id" = $2 OR "transferNo" = $2)`,
            scope.branchId,
            id,
        );
        if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Transfer not found');
        return rows[0];
    }

    public async confirmReceipt(scope: BranchScope, id: string, payload: ConfirmReceiptPayload) {
        await this.ensureTable();

        const trf = await this.get(scope, id);
        let hasShort = false;
        const variants = trf.metadata?.variants || [];
        for (const v of variants) {
            const receivedQty = payload.itemsReceived[v.name] ?? v.received;
            v.received = receivedQty;
            if (v.received < v.sent) {
                hasShort = true;
            }
        }

        const newStatus = hasShort ? 'SHORT BY 2' : 'RECEIVED';
        const updatedMeta = {
            ...trf.metadata,
            variants,
            damagedOnArrival: payload.damagedOnArrival || 0,
            receivingNote: payload.receivingNote || '',
            receivedAt: new Date().toISOString(),
        };

        await prisma.$executeRawUnsafe(
            `UPDATE "BranchStockTransfer"
             SET "status" = $1, "metadata" = $2::jsonb, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "branchId" = $3 AND "id" = $4`,
            newStatus,
            JSON.stringify(updatedMeta),
            scope.branchId,
            trf.id,
        );

        return {
            success: true,
            status: newStatus,
            message: `Receipt confirmed for ${trf.transferNo}${hasShort ? ' (discrepancy recorded)' : ''}`,
        };
    }

    public async create(scope: BranchScope, actorId: string, payload: CreateTransferPayload) {
        await this.ensureTable();

        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchStockTransfer" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10) + 219;
        const transferNo = `TRF-${String(count).padStart(4, '0')}`;
        const id = `trf-${Date.now()}`;

        const totalUnits = payload.items.reduce((t, i) => t + (Number(i.qtyToSend) || 0), 0);
        const status = payload.status === 'DRAFT' ? 'DRAFT' : 'IN TRANSIT';

        const metadata = {
            items: payload.items,
            variants: payload.items.map((i) => ({
                name: i.productVariant,
                sent: i.qtyToSend,
                received: i.qtyToSend,
            })),
            noteForReceiver: payload.noteForReceiver,
        };

        await prisma.$executeRawUnsafe(
            `INSERT INTO "BranchStockTransfer" (
                "id", "transferNo", "companyId", "branchId", "transferType",
                "fromLocation", "toLocation", "requestedBy", "dispatchDate", "priority",
                "units", "status", "reason", "metadata"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)`,
            id,
            transferNo,
            scope.companyId,
            scope.branchId,
            payload.transferType,
            payload.fromSource,
            payload.toDestination,
            'Today · Branch Admin',
            payload.dispatchDate || 'Today',
            payload.priority || 'Normal',
            totalUnits,
            status,
            payload.reason,
            JSON.stringify(metadata),
        );

        return this.get(scope, id);
    }
}

export default new StockTransferService();

