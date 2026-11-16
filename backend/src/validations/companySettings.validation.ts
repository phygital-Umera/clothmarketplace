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

/** Store-wide settings, super admin (P4-08b) */
const storeRulesSchema = z.object({
    deliveryFee: num('Delivery fee', 0, 10_000),
    freeDeliveryAbove: num('Free delivery above', 0, 1_000_000),
    expressFee: num('Express fee', 0, 10_000),
    deliveryDaysStd: num('Standard delivery days', 1, 60, true),
    deliveryDaysExpress: num('Express delivery days', 1, 30, true),
    limitedBadgeAt: num('"Only a few left" at', 0, 100, true),
    newProductDays: num('"New" for', 1, 365, true),
});

export default {companyRulesSchema, storeRulesSchema};
