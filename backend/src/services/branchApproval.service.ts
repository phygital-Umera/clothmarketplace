import prisma from '../client';
import {BranchScope} from './customerDue.service';

export type ApprovalItem = {
    id: string;
    type: 'DISCOUNT' | 'CREDIT' | 'CANCEL_BILL' | 'WRITE_OFF' | 'REFUND';
    title: string;
    description: string;
    shopAndStaff: string;
    amountLabel: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    decisionNote?: string;
    decisionDate?: string;
};

class BranchApprovalService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchApprovalItem" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "type" TEXT NOT NULL,
                    "title" TEXT NOT NULL,
                    "description" TEXT NOT NULL,
                    "shopAndStaff" TEXT NOT NULL,
                    "amountLabel" TEXT NOT NULL,
                    "amount" DOUBLE PRECISION NOT NULL,
                    "status" TEXT NOT NULL DEFAULT 'PENDING',
                    "decisionNote" TEXT,
                    "decisionDate" TIMESTAMP(3),
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating BranchApprovalItem table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchApprovalItem" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const initialApprovals = [
            {
                id: `app-${scope.branchId}-1`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                type: 'DISCOUNT',
                title: '15% on bill WW/26-27/00236',
                description: 'Banarasi Silk Saree ₹4,999 — small mark on border. Cashier limit 5%.',
                shopAndStaff: "Women's Wear · Rutuja Pawar · 10 min ago",
                amountLabel: '₹750 off',
                amount: 750,
                status: 'PENDING',
            },
            {
                id: `app-${scope.branchId}-2`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                type: 'CREDIT',
                title: 'Patil Uniforms — bill on credit',
                description: 'Due ₹8,200 (₹6,300 is 34 days old). New bill ₹6,400 -> ₹14,600 vs limit ₹10,000',
                shopAndStaff: "Men's Wear · Rahul Mane · 25 min ago",
                amountLabel: '₹6,400',
                amount: 6400,
                status: 'PENDING',
            },
            {
                id: `app-${scope.branchId}-3`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                type: 'CANCEL_BILL',
                title: 'MW/26-27/00188',
                description: 'Wrong size billed; customer took a different item on MW/26-27/00189.',
                shopAndStaff: "Men's Wear · Sagar Jadhav · 1 h ago",
                amountLabel: '₹1,499',
                amount: 1499,
                status: 'PENDING',
            },
            {
                id: `app-${scope.branchId}-4`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                type: 'WRITE_OFF',
                title: '4 damaged pcs — ADJ-0019',
                description: 'Kids Party Frock 6Y x2, 8Y x2 — tears from display hooks. Photos attached.',
                shopAndStaff: 'Kids Wear · Kiran More · today',
                amountLabel: '₹1,120 cost',
                amount: 1120,
                status: 'PENDING',
            },
            {
                id: `app-${scope.branchId}-5`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                type: 'REFUND',
                title: 'CN/26-27/0011',
                description: 'Linen Blazer 40 — lining torn. Paid cash on 29 Oct.',
                shopAndStaff: "Men's Wear · Sagar Jadhav · today",
                amountLabel: '₹2,499',
                amount: 2499,
                status: 'PENDING',
            },
        ];

        for (const a of initialApprovals) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "BranchApprovalItem" (
                    "id", "companyId", "branchId", "type", "title", "description",
                    "shopAndStaff", "amountLabel", "amount", "status"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT ("id") DO NOTHING`,
                a.id,
                a.companyId,
                a.branchId,
                a.type,
                a.title,
                a.description,
                a.shopAndStaff,
                a.amountLabel,
                a.amount,
                a.status,
            );
        }
    }

    public async getApprovals(scope: BranchScope, tab?: string) {
        await this.ensureSeedData(scope);

        const allRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchApprovalItem" WHERE "branchId" = $1 ORDER BY "createdAt" ASC`,
            scope.branchId,
        );

        const pendingCount = allRows.filter((r) => r.status === 'PENDING').length;
        const discountCount = allRows.filter((r) => r.type === 'DISCOUNT' && r.status === 'PENDING').length;
        const creditCount = allRows.filter((r) => r.type === 'CREDIT' && r.status === 'PENDING').length;
        const cancelCount = allRows.filter((r) => r.type === 'CANCEL_BILL' && r.status === 'PENDING').length;
        const writeOffCount = allRows.filter((r) => r.type === 'WRITE_OFF' && r.status === 'PENDING').length;
        const refundCount = allRows.filter((r) => r.type === 'REFUND' && r.status === 'PENDING').length;
        const doneCount = allRows.filter((r) => r.status !== 'PENDING').length || 7;

        let filtered = allRows.filter((r) => r.status === 'PENDING');
        if (tab === 'DISCOUNT') filtered = allRows.filter((r) => r.type === 'DISCOUNT');
        else if (tab === 'CREDIT') filtered = allRows.filter((r) => r.type === 'CREDIT');
        else if (tab === 'CANCEL_BILL') filtered = allRows.filter((r) => r.type === 'CANCEL_BILL');
        else if (tab === 'WRITE_OFF') filtered = allRows.filter((r) => r.type === 'WRITE_OFF');
        else if (tab === 'REFUND') filtered = allRows.filter((r) => r.type === 'REFUND');
        else if (tab === 'DONE_TODAY') filtered = allRows.filter((r) => r.status !== 'PENDING');

        const limitsTable = [
            {action: 'Bill discount', cashierCan: 'Up to 5%', managerCan: 'Up to 10%', aboveThat: 'Branch Admin'},
            {action: 'Credit sale', cashierCan: 'Up to ₹2,000 within limit', managerCan: 'Within customer limit', aboveThat: 'Branch Admin'},
            {action: 'Cancel bill', cashierCan: '—', managerCan: 'Same day, before day close', aboveThat: 'Branch Admin'},
            {action: 'Cash refund', cashierCan: '—', managerCan: 'Up to ₹2,000', aboveThat: 'Branch Admin'},
            {action: 'Stock write-off', cashierCan: '—', managerCan: 'Up to 3 pcs', aboveThat: 'Branch Admin'},
            {action: 'Purchase bill', cashierCan: '—', managerCan: 'Up to ₹50,000', aboveThat: 'Company Admin'},
        ];

        return {
            counts: {
                pending: pendingCount,
                discount: discountCount,
                credit: creditCount,
                cancelBill: cancelCount,
                writeOff: writeOffCount,
                refund: refundCount,
                doneToday: doneCount,
            },
            items: filtered,
            limitsTable,
        };
    }

    public async decide(scope: BranchScope, id: string, decision: 'APPROVE' | 'REJECT', note?: string) {
        await this.ensureTable();
        const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        await prisma.$executeRawUnsafe(
            `UPDATE "BranchApprovalItem"
             SET "status" = $1, "decisionNote" = $2, "decisionDate" = CURRENT_TIMESTAMP
             WHERE "id" = $3 AND "branchId" = $4`,
            status,
            note || null,
            id,
            scope.branchId,
        );
        return {success: true, message: `Request has been ${status.toLowerCase()}`};
    }
}

export default new BranchApprovalService();

