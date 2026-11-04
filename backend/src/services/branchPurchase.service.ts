import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {BranchScope} from './customerDue.service';

export type BranchPurchaseQuery = {
    search?: string;
    tab?: 'ALL' | 'UNPAID' | 'BRANCH_PURCHASES' | 'SHOP_PURCHASES' | 'DRAFT';
    supplierName?: string;
    month?: string;
    page?: number;
    limit?: number;
};

export type NewBranchPurchasePayload = {
    supplierName: string;
    supplierInvoiceNo: string;
    supplierGstin?: string;
    invoiceDate: string;
    receivedAt: string;
    paymentTerms: string;
    status?: 'CONFIRMED' | 'DRAFT';
    items: Array<{
        productName: string;
        sku?: string;
        hsn?: string;
        sizeBreakdown: Record<string, number>;
        pcs: number;
        cost: number;
        salePrice: number;
        gstRate: number;
        shopAllocations: Record<string, number>;
    }>;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount?: number;
    totalAmount: number;
    paidAmount: number;
    paymentMode: string;
    balanceAmount: number;
    dueDate?: string;
    createTransfers?: boolean;
    printBarcodes?: boolean;
    companyApprovalNeeded?: boolean;
};

class BranchPurchaseService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchPurchaseBill" (
                    "id" TEXT PRIMARY KEY,
                    "billNumber" TEXT NOT NULL,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "supplierName" TEXT NOT NULL,
                    "supplierInvoiceNo" TEXT,
                    "supplierGstin" TEXT,
                    "billDate" TIMESTAMP(3) NOT NULL,
                    "boughtBy" TEXT NOT NULL DEFAULT 'Branch',
                    "stockTo" TEXT NOT NULL,
                    "pcs" INTEGER NOT NULL DEFAULT 0,
                    "taxable" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "gstType" TEXT NOT NULL DEFAULT 'C+S',
                    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "status" TEXT NOT NULL DEFAULT 'UNPAID',
                    "paymentTerms" TEXT,
                    "paymentMode" TEXT,
                    "receivedAt" TEXT,
                    "dueDate" TEXT,
                    "metadata" JSONB,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating BranchPurchaseBill table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchPurchaseBill" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const initialBills = [
            {
                id: 'bpb-1',
                billNumber: 'BPB/26-27/0014',
                companyId: scope.companyId,
                branchId: scope.branchId,
                supplierName: 'Mumbai Denim Works',
                supplierInvoiceNo: 'MDW/552 · local',
                supplierGstin: '27AABCM2232Q1Z1',
                billDate: new Date('2026-11-03T10:00:00Z').toISOString(),
                boughtBy: 'Branch',
                stockTo: "Men's 60 · Kids 25",
                pcs: 85,
                taxable: 38000,
                gstAmount: 1900,
                gstType: 'C+S',
                totalAmount: 39900,
                paidAmount: 19950,
                balanceAmount: 19950,
                status: 'PARTIAL',
                paymentTerms: '50% now, rest in 15 days',
                paymentMode: 'NEFT',
                receivedAt: 'Branch store room',
                dueDate: '18 Nov',
                metadata: {
                    items: [
                        {
                            productName: 'Slim Fit Denim – Blue',
                            hsn: 'HSN 6203 · PRD-0088',
                            sizeBreakdown: {'30': 15, '32': 20, '34': 15, '36': 10},
                            pcs: 60,
                            cost: 450,
                            salePrice: 1499,
                            gstRate: 5,
                            shopAllocations: {"Men's Wear": 60, "Kids Wear": 0},
                        },
                        {
                            productName: 'Kids Denim Jacket',
                            hsn: 'HSN 6201 · PRD-0124',
                            sizeBreakdown: {'4Y': 5, '6Y': 8, '8Y': 7, '10Y': 5},
                            pcs: 25,
                            cost: 440,
                            salePrice: 1299,
                            gstRate: 5,
                            shopAllocations: {"Men's Wear": 0, "Kids Wear": 25},
                        },
                    ],
                    transfers: [
                        {transferNo: 'TRF-0220', toShop: "Men's Wear", pcs: 60},
                        {transferNo: 'TRF-0221', toShop: 'Kids Wear', pcs: 25},
                    ],
                },
            },
            {
                id: 'bpb-2',
                billNumber: 'PB/26-27/0042',
                companyId: scope.companyId,
                branchId: scope.branchId,
                supplierName: 'Surat Textile House',
                supplierInvoiceNo: 'STH/2611/189 · IGST',
                supplierGstin: '24AAJCS9901M1Z4',
                billDate: new Date('2026-11-03T11:30:00Z').toISOString(),
                boughtBy: "Women's Wear",
                stockTo: "Women's Wear",
                pcs: 120,
                taxable: 44000,
                gstAmount: 2200,
                gstType: 'IGST',
                totalAmount: 46200,
                paidAmount: 0,
                balanceAmount: 46200,
                status: 'UNPAID',
                paymentTerms: '30 days credit',
                paymentMode: 'NEFT',
                receivedAt: "Women's Wear",
                dueDate: '03 Dec',
                metadata: {
                    items: [
                        {
                            productName: 'Chiffon Saree Print',
                            hsn: 'HSN 5407',
                            sizeBreakdown: {'FS': 120},
                            pcs: 120,
                            cost: 366.66,
                            salePrice: 899,
                            gstRate: 5,
                            shopAllocations: {"Women's Wear": 120},
                        },
                    ],
                },
            },
            {
                id: 'bpb-3',
                billNumber: 'PB/26-27/0041',
                companyId: scope.companyId,
                branchId: scope.branchId,
                supplierName: 'Varanasi Silk Emporium',
                supplierInvoiceNo: 'VSE/884 · IGST',
                supplierGstin: '09AAAFV1099R1ZZ',
                billDate: new Date('2026-11-01T09:15:00Z').toISOString(),
                boughtBy: "Women's Wear",
                stockTo: "Women's Wear",
                pcs: 20,
                taxable: 50847,
                gstAmount: 9153,
                gstType: 'IGST',
                totalAmount: 60000,
                paidAmount: 60000,
                balanceAmount: 0,
                status: 'PAID',
                paymentTerms: 'Full advance',
                paymentMode: 'RTGS',
                receivedAt: "Women's Wear",
                metadata: {
                    items: [
                        {
                            productName: 'Pure Banarasi Katan Silk',
                            hsn: 'HSN 5007',
                            sizeBreakdown: {'FS': 20},
                            pcs: 20,
                            cost: 2542.35,
                            salePrice: 5999,
                            gstRate: 18,
                            shopAllocations: {"Women's Wear": 20},
                        },
                    ],
                },
            },
            {
                id: 'bpb-4',
                billNumber: 'PB/26-27/0040',
                companyId: scope.companyId,
                branchId: scope.branchId,
                supplierName: 'Tiruppur Knits',
                supplierInvoiceNo: 'TK-2026-551 · IGST',
                supplierGstin: '33AAACT7721L1Z8',
                billDate: new Date('2026-10-30T14:00:00Z').toISOString(),
                boughtBy: "Women's Wear",
                stockTo: "Women's Wear",
                pcs: 150,
                taxable: 18000,
                gstAmount: 900,
                gstType: 'IGST',
                totalAmount: 18900,
                paidAmount: 1260,
                balanceAmount: 17640,
                status: 'OVERDUE',
                paymentTerms: '15 days credit',
                paymentMode: 'NEFT',
                receivedAt: "Women's Wear",
                dueDate: 'Overdue 3 days',
                metadata: {
                    items: [
                        {
                            productName: 'Cotton Leggings Combo',
                            hsn: 'HSN 6104',
                            sizeBreakdown: {'L': 75, 'XL': 75},
                            pcs: 150,
                            cost: 120,
                            salePrice: 349,
                            gstRate: 5,
                            shopAllocations: {"Women's Wear": 150},
                        },
                    ],
                },
            },
            {
                id: 'bpb-5',
                billNumber: 'MPB/26-27/0022',
                companyId: scope.companyId,
                branchId: scope.branchId,
                supplierName: 'Ichalkaranji Weavers Co-op',
                supplierInvoiceNo: 'IWC/1180 · local',
                supplierGstin: '27AAACI4411K1Z2',
                billDate: new Date('2026-10-29T16:45:00Z').toISOString(),
                boughtBy: "Men's Wear",
                stockTo: "Men's Wear",
                pcs: 80,
                taxable: 27620,
                gstAmount: 1380,
                gstType: 'C+S',
                totalAmount: 29000,
                paidAmount: 29000,
                balanceAmount: 0,
                status: 'PAID',
                paymentTerms: 'Full payment on delivery',
                paymentMode: 'UPI',
                receivedAt: "Men's Wear",
                metadata: {
                    items: [
                        {
                            productName: 'Cotton Kurta Fabric',
                            hsn: 'HSN 5208',
                            sizeBreakdown: {'M': 40, 'L': 40},
                            pcs: 80,
                            cost: 345.25,
                            salePrice: 799,
                            gstRate: 5,
                            shopAllocations: {"Men's Wear": 80},
                        },
                    ],
                },
            },
            {
                id: 'bpb-6',
                billNumber: 'PB/26-27/0038',
                companyId: scope.companyId,
                branchId: scope.branchId,
                supplierName: 'Sangli Cloth Mart',
                supplierInvoiceNo: 'LOC-77 · unregistered',
                supplierGstin: null,
                billDate: new Date('2026-10-24T12:00:00Z').toISOString(),
                boughtBy: "Women's Wear",
                stockTo: "Women's Wear",
                pcs: 30,
                taxable: 9800,
                gstAmount: 0,
                gstType: '—',
                totalAmount: 9800,
                paidAmount: 8800,
                balanceAmount: 1000,
                status: 'PARTIAL',
                paymentTerms: 'Cash',
                paymentMode: 'CASH',
                receivedAt: "Women's Wear",
                metadata: {
                    items: [
                        {
                            productName: 'Daily Wear Kurtis',
                            hsn: 'HSN 6204',
                            sizeBreakdown: {'M': 15, 'L': 15},
                            pcs: 30,
                            cost: 326.66,
                            salePrice: 650,
                            gstRate: 0,
                            shopAllocations: {"Women's Wear": 30},
                        },
                    ],
                },
            },
        ];

        for (const b of initialBills) {
            const rowId = `bpb-${scope.branchId}-${b.billNumber.replace(/\W/g, '_')}`;
            await prisma.$executeRawUnsafe(
                `INSERT INTO "BranchPurchaseBill" (
                    "id", "billNumber", "companyId", "branchId", "supplierName",
                    "supplierInvoiceNo", "supplierGstin", "billDate", "boughtBy", "stockTo",
                    "pcs", "taxable", "gstAmount", "gstType", "totalAmount", "paidAmount",
                    "balanceAmount", "status", "paymentTerms", "paymentMode", "receivedAt", "dueDate", "metadata"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb)
                ON CONFLICT ("id") DO NOTHING`,
                rowId,
                b.billNumber,
                b.companyId,
                b.branchId,
                b.supplierName,
                b.supplierInvoiceNo,
                b.supplierGstin,
                b.billDate,
                b.boughtBy,
                b.stockTo,
                b.pcs,
                b.taxable,
                b.gstAmount,
                b.gstType,
                b.totalAmount,
                b.paidAmount,
                b.balanceAmount,
                b.status,
                b.paymentTerms,
                b.paymentMode,
                b.receivedAt,
                b.dueDate,
                JSON.stringify(b.metadata),
            );
        }
    }

    public async list(scope: BranchScope, query: BranchPurchaseQuery) {
        await this.ensureSeedData(scope);

        let whereClauses = [`"branchId" = '${scope.branchId}'`];

        if (query.search?.trim()) {
            const s = query.search.trim().replace(/'/g, "''");
            whereClauses.push(
                `("billNumber" ILIKE '%${s}%' OR "supplierName" ILIKE '%${s}%' OR "supplierInvoiceNo" ILIKE '%${s}%')`,
            );
        }

        if (query.supplierName?.trim() && query.supplierName !== 'All') {
            const s = query.supplierName.trim().replace(/'/g, "''");
            whereClauses.push(`"supplierName" = '${s}'`);
        }

        const tab = query.tab || 'ALL';
        if (tab === 'UNPAID') {
            whereClauses.push(`"balanceAmount" > 0`);
        } else if (tab === 'BRANCH_PURCHASES') {
            whereClauses.push(`"boughtBy" = 'Branch'`);
        } else if (tab === 'SHOP_PURCHASES') {
            whereClauses.push(`"boughtBy" != 'Branch'`);
        } else if (tab === 'DRAFT') {
            whereClauses.push(`"status" = 'DRAFT'`);
        }

        const whereSql = whereClauses.join(' AND ');
        const page = Math.max(1, Number(query.page || 1));
        const limit = Math.max(1, Math.min(100, Number(query.limit || 15)));
        const offset = (page - 1) * limit;

        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchPurchaseBill" WHERE ${whereSql}`,
        );
        const total = parseInt(countRes[0]?.count ?? '0', 10);

        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchPurchaseBill"
             WHERE ${whereSql}
             ORDER BY "billDate" DESC, "createdAt" DESC
             LIMIT ${limit} OFFSET ${offset}`,
        );

        return {
            items: rows.map((r) => ({
                id: r.id,
                billNumber: r.billNumber,
                billDate: r.billDate,
                supplierName: r.supplierName,
                supplierInvoiceNo: r.supplierInvoiceNo,
                supplierGstin: r.supplierGstin,
                boughtBy: r.boughtBy,
                stockTo: r.stockTo,
                pcs: r.pcs,
                taxable: r.taxable,
                gstAmount: r.gstAmount,
                gstType: r.gstType,
                totalAmount: r.totalAmount,
                paidAmount: r.paidAmount,
                balanceAmount: r.balanceAmount,
                status: r.status,
                paymentTerms: r.paymentTerms,
                paymentMode: r.paymentMode,
                receivedAt: r.receivedAt,
                dueDate: r.dueDate,
                metadata: r.metadata,
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
            `SELECT * FROM "BranchPurchaseBill" WHERE "branchId" = $1`,
            scope.branchId,
        );

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let novPurchases = 0;
        let novBillsCount = 0;
        let novPcs = 0;
        let novInputGst = 0;
        let payable = 0;
        let overdueCount = 0;
        let above50kCount = 0;
        const suppliersSet = new Set<string>();

        for (const r of allRows) {
            suppliersSet.add(r.supplierName);
            const d = new Date(r.billDate);
            const isNov = d.getFullYear() === currentYear && d.getMonth() === currentMonth;

            if (isNov && r.status !== 'DRAFT') {
                novPurchases += r.totalAmount;
                novBillsCount++;
                novPcs += r.pcs;
                novInputGst += r.gstAmount;
            }

            if (r.balanceAmount > 0) {
                payable += r.balanceAmount;
                if (r.status === 'OVERDUE' || (r.dueDate && r.dueDate.toLowerCase().includes('overdue'))) {
                    overdueCount++;
                }
            }

            if (r.totalAmount >= 50000) {
                above50kCount++;
            }
        }

        return {
            purchasesMonth: Math.round(novPurchases * 100) / 100,
            billsCount: novBillsCount,
            pcsCount: novPcs,
            inputGst: Math.round(novInputGst * 100) / 100,
            payable: Math.round(payable * 100) / 100,
            overdueCount,
            above50kCount,
            suppliers: Array.from(suppliersSet).sort(),
        };
    }

    public async get(scope: BranchScope, id: string) {
        await this.ensureSeedData(scope);
        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchPurchaseBill" WHERE "branchId" = $1 AND "id" = $2`,
            scope.branchId,
            id,
        );
        if (!rows.length) throw new ApiError(httpStatus.NOT_FOUND, 'Purchase bill not found');
        return rows[0];
    }

    public async create(scope: BranchScope, actorId: string, data: NewBranchPurchasePayload) {
        await this.ensureTable();

        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchPurchaseBill" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10) + 1;
        const billNumber = `BPB/26-27/${String(count).padStart(4, '0')}`;

        const totalPcs = data.items.reduce((t, i) => t + (i.pcs || 0), 0);

        // Calculate destination stockTo string
        const shopPcsMap: Record<string, number> = {};
        for (const item of data.items) {
            for (const [shop, qty] of Object.entries(item.shopAllocations || {})) {
                if (qty > 0) {
                    shopPcsMap[shop] = (shopPcsMap[shop] || 0) + qty;
                }
            }
        }
        const stockToParts = Object.entries(shopPcsMap).map(([s, q]) => `${s.replace(" Wear", "")} ${q}`);
        const stockTo = stockToParts.length > 0 ? stockToParts.join(' · ') : (data.receivedAt || 'Branch');

        const gstTotal = (data.cgstAmount || 0) + (data.sgstAmount || 0) + (data.igstAmount || 0);
        const gstType = data.igstAmount ? 'IGST' : 'C+S';

        const id = `bpb-${Date.now()}`;
        const balance = Math.max(0, data.totalAmount - (data.paidAmount || 0));
        const status = data.status === 'DRAFT' ? 'DRAFT' : balance === 0 ? 'PAID' : (data.paidAmount > 0 ? 'PARTIAL' : 'UNPAID');

        const metadata = {
            items: data.items,
            transfers: Object.entries(shopPcsMap).map(([shop, qty], idx) => ({
                transferNo: `TRF-${String(220 + idx).padStart(4, '0')}`,
                toShop: shop,
                pcs: qty,
            })),
            printBarcodes: data.printBarcodes,
            companyApprovalNeeded: data.totalAmount >= 50000 || data.companyApprovalNeeded,
        };

        await prisma.$executeRawUnsafe(
            `INSERT INTO "BranchPurchaseBill" (
                "id", "billNumber", "companyId", "branchId", "supplierName",
                "supplierInvoiceNo", "supplierGstin", "billDate", "boughtBy", "stockTo",
                "pcs", "taxable", "gstAmount", "gstType", "totalAmount", "paidAmount",
                "balanceAmount", "status", "paymentTerms", "paymentMode", "receivedAt", "dueDate", "metadata"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb)`,
            id,
            billNumber,
            scope.companyId,
            scope.branchId,
            data.supplierName,
            data.supplierInvoiceNo,
            data.supplierGstin || null,
            new Date(data.invoiceDate || Date.now()).toISOString(),
            'Branch',
            stockTo,
            totalPcs,
            data.taxableAmount,
            gstTotal,
            gstType,
            data.totalAmount,
            data.paidAmount || 0,
            balance,
            status,
            data.paymentTerms,
            data.paymentMode,
            data.receivedAt,
            data.dueDate || (balance > 0 ? 'Due 15 days' : null),
            JSON.stringify(metadata),
        );

        return this.get(scope, id);
    }
}

export default new BranchPurchaseService();

