import prisma from '../client';
import {BranchScope} from './customerDue.service';

export type PnlRow = {
    line: string;
    mens: number;
    womens: number;
    kids: number;
    branch: number;
    total: number;
    isNegative?: boolean;
};

class BranchReportsService {
    public async getPnl(scope: BranchScope, fromDate = '2026-11-01', toDate = '2026-11-03') {
        const rows: PnlRow[] = [
            {
                line: 'Net sales (ex GST)',
                mens: 76380,
                womens: 88940,
                kids: 20290,
                branch: 0,
                total: 185610,
            },
            {
                line: 'Cost of goods sold',
                mens: -47800,
                womens: -52160,
                kids: -12690,
                branch: 0,
                total: -112650,
                isNegative: true,
            },
            {
                line: 'Gross profit',
                mens: 30580,
                womens: 34780,
                kids: 7600,
                branch: 0,
                total: 72960,
            },
            {
                line: 'Expenses',
                mens: -31650,
                womens: -36950,
                kids: -19000,
                branch: -8800,
                total: -96400,
                isNegative: true,
            },
            {
                line: 'Net profit',
                mens: -1070,
                womens: -2170,
                kids: -11400,
                branch: -8800,
                total: -23440,
                isNegative: true,
            },
        ];

        const margins = [
            {shop: "Men's Wear", margin: 38.0},
            {shop: "Women's Wear", margin: 40.0},
            {shop: 'Kids Wear', margin: 37.5},
        ];

        return {
            period: '1-3 Nov 2026',
            rows,
            margins,
            note: 'Rent and October salaries are booked on 1 Nov, so early-month net profit is negative. Full-month view evens out.',
        };
    }
}

export default new BranchReportsService();

