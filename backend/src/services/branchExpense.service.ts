import prisma from '../client';
import {BranchScope} from './customerDue.service';

export type ExpenseHeadRow = {
    head: string;
    mens: number;
    womens: number;
    kids: number;
    branch: number;
    total: number;
};

export type AddExpensePayload = {
    date: string;
    amount: number;
    head: string;
    chargeTo: string;
    paidFrom: string;
    billUrl?: string;
};

class BranchExpenseService {
    private tableEnsured = false;

    private async ensureTable() {
        if (this.tableEnsured) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BranchExpense" (
                    "id" TEXT PRIMARY KEY,
                    "companyId" TEXT NOT NULL,
                    "branchId" TEXT NOT NULL,
                    "date" TEXT NOT NULL,
                    "amount" DOUBLE PRECISION NOT NULL,
                    "head" TEXT NOT NULL,
                    "chargeTo" TEXT NOT NULL,
                    "paidFrom" TEXT NOT NULL,
                    "billUrl" TEXT,
                    "mensAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "womensAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "kidsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "branchAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            this.tableEnsured = true;
        } catch (e) {
            console.error('Error creating BranchExpense table:', e);
        }
    }

    private async ensureSeedData(scope: BranchScope) {
        await this.ensureTable();
        const countRes: any = await prisma.$queryRawUnsafe(
            `SELECT count(*) as count FROM "BranchExpense" WHERE "branchId" = $1`,
            scope.branchId,
        );
        const count = parseInt(countRes[0]?.count ?? '0', 10);
        if (count > 0) return;

        const initialExpenses = [
            {
                id: `exp-${scope.branchId}-rent`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                date: '2026-11-01',
                amount: 42000,
                head: 'Rent (shared by area)',
                chargeTo: 'Split by floor area (33/43/24)',
                paidFrom: 'Branch bank',
                mensAmount: 14000,
                womensAmount: 18000,
                kidsAmount: 10000,
                branchAmount: 0,
            },
            {
                id: `exp-${scope.branchId}-salaries`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                date: '2026-11-01',
                amount: 47500,
                head: 'Salaries',
                chargeTo: 'Direct to shops + branch manager',
                paidFrom: 'Branch bank',
                mensAmount: 15700,
                womensAmount: 15800,
                kidsAmount: 8000,
                branchAmount: 8000,
            },
            {
                id: `exp-${scope.branchId}-elec`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                date: '2026-11-02',
                amount: 3000,
                head: 'Electricity',
                chargeTo: 'Split by meter usage',
                paidFrom: 'Branch bank',
                mensAmount: 1100,
                womensAmount: 1200,
                kidsAmount: 700,
                branchAmount: 0,
            },
            {
                id: `exp-${scope.branchId}-tea`,
                companyId: scope.companyId,
                branchId: scope.branchId,
                date: '2026-11-03',
                amount: 3900,
                head: 'Packing, porter, tea',
                chargeTo: 'Direct to counters',
                paidFrom: 'Petty cash drawer',
                mensAmount: 850,
                womensAmount: 1950,
                kidsAmount: 300,
                branchAmount: 800,
            },
        ];

        for (const e of initialExpenses) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "BranchExpense" (
                    "id", "companyId", "branchId", "date", "amount", "head",
                    "chargeTo", "paidFrom", "mensAmount", "womensAmount", "kidsAmount", "branchAmount"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT ("id") DO NOTHING`,
                e.id,
                e.companyId,
                e.branchId,
                e.date,
                e.amount,
                e.head,
                e.chargeTo,
                e.paidFrom,
                e.mensAmount,
                e.womensAmount,
                e.kidsAmount,
                e.branchAmount,
            );
        }
    }

    public async getExpenses(scope: BranchScope) {
        await this.ensureSeedData(scope);

        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "BranchExpense" WHERE "branchId" = $1 ORDER BY "createdAt" ASC`,
            scope.branchId,
        );

        let thisMonth = 0;
        let salaries = 0;
        let rent = 0;
        let other = 0;

        const tableRows: ExpenseHeadRow[] = rows.map((r) => {
            const amt = Number(r.amount);
            thisMonth += amt;
            if (r.head.toLowerCase().includes('salary')) {
                salaries += amt;
            } else if (r.head.toLowerCase().includes('rent')) {
                rent += amt;
            } else {
                other += amt;
            }

            return {
                head: r.head,
                mens: Number(r.mensAmount),
                womens: Number(r.womensAmount),
                kids: Number(r.kidsAmount),
                branch: Number(r.branchAmount),
                total: amt,
            };
        });

        // Calculate columns total
        const totalRow = {
            head: 'Total',
            mens: tableRows.reduce((a, b) => a + b.mens, 0),
            womens: tableRows.reduce((a, b) => a + b.womens, 0),
            kids: tableRows.reduce((a, b) => a + b.kids, 0),
            branch: tableRows.reduce((a, b) => a + b.branch, 0),
            total: thisMonth,
        };

        return {
            summary: {
                thisMonth,
                thisMonthSub: 'Branch + 3 shops',
                salaries,
                salariesSub: '14 staff (Oct)',
                rent,
                rentSub: 'Building, 3 floors',
                other,
                otherSub: 'Power, porter, packing',
            },
            rows: tableRows,
            totalRow,
        };
    }

    public async addExpense(scope: BranchScope, payload: AddExpensePayload) {
        await this.ensureTable();
        const id = `exp-${scope.branchId}-${Date.now()}`;
        const amt = Number(payload.amount);

        // Split amount according to chargeTo option
        let mens = 0;
        let womens = 0;
        let kids = 0;
        let branch = 0;

        if (payload.chargeTo.includes('floor area') || payload.chargeTo.includes('33/43/24')) {
            mens = Math.round(amt * 0.33);
            womens = Math.round(amt * 0.43);
            kids = amt - mens - womens;
        } else if (payload.chargeTo.includes("Men's")) {
            mens = amt;
        } else if (payload.chargeTo.includes("Women's")) {
            womens = amt;
        } else if (payload.chargeTo.includes('Kids')) {
            kids = amt;
        } else if (payload.chargeTo.includes('Branch')) {
            branch = amt;
        } else {
            // equal split
            mens = Math.round(amt / 3);
            womens = Math.round(amt / 3);
            kids = amt - mens - womens;
        }

        await prisma.$executeRawUnsafe(
            `INSERT INTO "BranchExpense" (
                "id", "companyId", "branchId", "date", "amount", "head",
                "chargeTo", "paidFrom", "billUrl", "mensAmount", "womensAmount", "kidsAmount", "branchAmount"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            id,
            scope.companyId,
            scope.branchId,
            payload.date,
            amt,
            payload.head,
            payload.chargeTo,
            payload.paidFrom,
            payload.billUrl || null,
            mens,
            womens,
            kids,
            branch,
        );

        return {success: true, message: `Expense of ₹${amt.toLocaleString('en-IN')} added successfully`};
    }
}

export default new BranchExpenseService();

