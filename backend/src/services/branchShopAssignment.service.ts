import prisma from '../client';
import {BranchScope} from './customerDue.service';

export type ShopStaffMember = {
    id: string;
    name: string;
    initials: string;
    role: string;
    shopName: string;
};

export type ShopAssignmentGroup = {
    shopName: string;
    shopCode: string;
    staffCount: number;
    manager: string;
    staff: ShopStaffMember[];
};

export type MoveEmployeePayload = {
    employeeName: string;
    targetShop: string;
    roleInShop: string;
    effectiveFrom: string;
    reason?: string;
};

class BranchShopAssignmentService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "ShopAssignmentHistory" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "employee" TEXT NOT NULL,
                    "fromShop" TEXT NOT NULL,
                    "toShop" TEXT NOT NULL,
                    "role" TEXT NOT NULL,
                    "date" TEXT NOT NULL,
                    "by" TEXT NOT NULL,
                    "reason" TEXT,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating ShopAssignmentHistory table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "ShopAssignmentHistory" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const initialHistory = [
            {
                id: `sah-${scope.branchId}-1`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                employee: 'Kiran More',
                fromShop: '—',
                toShop: 'Kids Wear',
                role: 'Cashier',
                date: '02 Nov 2026',
                by: 'Snehal Kulkarni',
                reason: 'Cashier reallocation',
            },
            {
                id: `sah-${scope.branchId}-2`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                employee: 'Pallavi Kale',
                fromShop: "Men's Wear",
                toShop: "Women's Wear",
                role: 'Sales associate',
                date: '02 Nov 2026',
                by: 'Snehal Kulkarni',
                reason: 'Women section festival rush',
            },
            {
                id: `sah-${scope.branchId}-3`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                employee: 'Priya Shinde',
                fromShop: '—',
                toShop: "Women's Wear",
                role: 'Shop manager',
                date: '01 Nov 2026',
                by: 'Matoshri Admin',
                reason: 'Manager promotion',
            },
        ];

        for (const h of initialHistory) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "ShopAssignmentHistory" (
                    "id", "companyId", "branchId", "employee", "fromShop", "toShop", "role", "date", "by", "reason"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT ("id") DO NOTHING`,
                h.id,
                h.companyId,
                h.branchId,
                h.employee,
                h.fromShop,
                h.toShop,
                h.role,
                h.date,
                h.by,
                h.reason,
            );
        }
    }

    public async getAssignmentData(scope: BranchScope) {
        await this.ensureSeedData(scope);

        const historyRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "ShopAssignmentHistory" WHERE "branchId" = $1 ORDER BY "createdAt" DESC`,
            scope.branchId,
        );

        const groups: ShopAssignmentGroup[] = [
            {
                shopName: "Men's Wear",
                shopCode: 'MAT-B02-S01',
                staffCount: 5,
                manager: 'Rahul Mane',
                staff: [
                    {id: '1', name: 'Sagar Jadhav', initials: 'SJ', role: 'Cashier', shopName: "Men's Wear"},
                    {id: '2', name: 'Ganesh Patil', initials: 'GP', role: 'Sales associate', shopName: "Men's Wear"},
                    {id: '3', name: 'Mahesh Shinde', initials: 'MS', role: 'Sales associate', shopName: "Men's Wear"},
                    {id: '4', name: 'Tushar Mali', initials: 'TM', role: 'Stock keeper', shopName: "Men's Wear"},
                ],
            },
            {
                shopName: "Women's Wear",
                shopCode: 'MAT-B02-S02',
                staffCount: 6,
                manager: 'Priya Shinde',
                staff: [
                    {id: '5', name: 'Pallavi Kale', initials: 'PK', role: 'Sales associate', shopName: "Women's Wear"},
                    {id: '6', name: 'Rutuja Pawar', initials: 'RP', role: 'Cashier', shopName: "Women's Wear"},
                    {id: '7', name: 'Shital Mane', initials: 'SM', role: 'Sales associate', shopName: "Women's Wear"},
                    {id: '8', name: 'Komal Desai', initials: 'KD', role: 'Sales associate', shopName: "Women's Wear"},
                    {id: '9', name: 'Aarti Sutar', initials: 'AS', role: 'Stock keeper', shopName: "Women's Wear"},
                ],
            },
            {
                shopName: 'Kids Wear',
                shopCode: 'MAT-B02-S03',
                staffCount: 3,
                manager: 'Not assigned',
                staff: [
                    {id: '10', name: 'Kiran More', initials: 'KM', role: 'Cashier', shopName: 'Kids Wear'},
                    {id: '11', name: 'Pooja Kamble', initials: 'PK', role: 'Sales associate', shopName: 'Kids Wear'},
                    {id: '12', name: 'Vaibhav Nikam', initials: 'VN', role: 'Stock keeper', shopName: 'Kids Wear'},
                ],
            },
            {
                shopName: 'Unassigned',
                shopCode: 'Branch pool',
                staffCount: 1,
                manager: '—',
                staff: [
                    {id: '13', name: 'Akash Lohar', initials: 'AL', role: 'New joiner', shopName: 'Unassigned'},
                ],
            },
        ];

        return {
            groups,
            history: historyRows.map((r) => ({
                id: r.id,
                employee: r.employee,
                fromTo: `${r.fromShop} → ${r.toShop}`,
                role: r.role,
                date: r.date,
                by: r.by,
            })),
        };
    }

    public async moveEmployee(scope: BranchScope, actorName: string, payload: MoveEmployeePayload) {
        await this.ensureTable();
        const id = `sah-${scope.branchId}-${Date.now()}`;
        const cleanEmp = payload.employeeName.split('—')[0].trim();
        const fromShop = payload.employeeName.includes('—')
            ? payload.employeeName.split('—')[1].trim()
            : 'Unassigned';

        const dateStr = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });

        await prisma.$executeRawUnsafe(
            `INSERT INTO "ShopAssignmentHistory" (
                "id", "companyId", "branchId", "employee", "fromShop", "toShop", "role", "date", "by", "reason"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            id,
            scope.companyId,
            scope.branchId,
            cleanEmp,
            fromShop,
            payload.targetShop,
            payload.roleInShop,
            dateStr,
            actorName || 'Snehal Kulkarni',
            payload.reason || null,
        );

        return {
            success: true,
            message: `${cleanEmp} assigned to ${payload.targetShop} as ${payload.roleInShop}`,
        };
    }
}

export default new BranchShopAssignmentService();

