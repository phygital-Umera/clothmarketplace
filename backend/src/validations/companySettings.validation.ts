import {z} from 'zod';

const num = (label: string, min: number, max: number, int = false) => {
    let rule = z.coerce
        .number({invalid_type_error: `Enter a valid ${label}`})
        .min(min, `${label} must be at least ${min}`)
        .max(max, `${label} can be at most ${max}`);
    if (int) rule = rule.int(`${label} must be a whole number`);
    return rule;
};

/** Company Profile → Settings (P4-08) */
const companyRulesSchema = z.object({
    refundApprovalLimit: num('Refund approval limit', 0, 1_000_000),
    discountApprovalPct: num('Discount needing approval', 0, 100),
    lowStockDefault: num('Low-stock level', 0, 10_000, true),
    defaultCreditDays: num('Default credit days', 0, 365, true),
    minMarginPct: num('Minimum margin', 0, 100),
});

export default {companyRulesSchema};
