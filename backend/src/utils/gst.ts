/*
 * GST rate rules (D-18). Each shop has one price rule and a list of allowed
 * slabs. A product either has a fixed rate, or (taxRate null) follows the
 * shop's rule: the rate depends on the taxable value of one piece.
 *
 *   taxable value per piece <= threshold  -> rateUpTo   (e.g. 5% up to ₹2,500)
 *   taxable value per piece  > threshold  -> rateAbove  (e.g. 18%)
 *
 * A threshold of 0 means one flat rate (rateUpTo) for every price.
 * Each shop confirms its numbers with its own CA.
 */

export type GstRule = {
    /** Taxable value of one piece (after discount, before GST) up to which rateUpTo applies */
    threshold: number;
    rateUpTo: number;
    rateAbove: number;
    /** Rates a product, bill line or supplier line may use in this shop */
    slabs: number[];
};

/** Every GST rate in use in India; shops pick their slabs from these */
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40] as const;

export const DEFAULT_GST_RULE: GstRule = {
    threshold: 2500,
    rateUpTo: 5,
    rateAbove: 18,
    slabs: [0, 5, 12, 18],
};

const isRate = (v: unknown): v is number =>
    typeof v === 'number' && (GST_RATES as readonly number[]).includes(v);

/** The shop's rule from its JSON column; anything missing or invalid falls back to the default */
export const gstRuleOf = (json: unknown): GstRule => {
    const r = (json && typeof json === 'object' ? json : {}) as Partial<GstRule>;
    const slabs = Array.isArray(r.slabs)
        ? [...new Set(r.slabs.filter(isRate))].sort((a, b) => a - b)
        : [];
    return {
        threshold:
            typeof r.threshold === 'number' && r.threshold >= 0
                ? r.threshold
                : DEFAULT_GST_RULE.threshold,
        rateUpTo: isRate(r.rateUpTo) ? r.rateUpTo : DEFAULT_GST_RULE.rateUpTo,
        rateAbove: isRate(r.rateAbove) ? r.rateAbove : DEFAULT_GST_RULE.rateAbove,
        slabs: slabs.length ? slabs : DEFAULT_GST_RULE.slabs,
    };
};

/**
 * GST rate of one piece.
 * @param fixedRate the product's own rate; null/undefined = follow the rule
 * @param pieceValue what one piece sells for after discounts
 * @param inclusive true when pieceValue already contains GST (tag prices, the store)
 */
export const rateFor = (
    rule: GstRule,
    fixedRate: number | null | undefined,
    pieceValue: number,
    inclusive = true,
): number => {
    if (fixedRate !== null && fixedRate !== undefined) return fixedRate;
    if (rule.threshold <= 0) return rule.rateUpTo;
    // The rule is on the taxable value: take the lower rate out first and compare
    const taxable = inclusive ? pieceValue / (1 + rule.rateUpTo / 100) : pieceValue;
    return taxable <= rule.threshold + 1e-9 ? rule.rateUpTo : rule.rateAbove;
};

/** Short text of a rule, e.g. "5% up to ₹2,500 a piece, 18% above" */
export const describeRule = (rule: GstRule) =>
    rule.threshold <= 0
        ? `${rule.rateUpTo}% on every piece`
        : `${rule.rateUpTo}% up to ₹${rule.threshold.toLocaleString('en-IN')} a piece, ${rule.rateAbove}% above`;
