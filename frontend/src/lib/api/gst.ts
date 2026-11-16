import {api} from '@/utils/axios';

/** A shop's GST price rule and allowed slabs (D-18) */
export interface GstRule {
  /** Taxable value of one piece up to which rateUpTo applies; 0 = one flat rate */
  threshold: number;
  rateUpTo: number;
  rateAbove: number;
  slabs: number[];
}

export interface GstRuleView extends GstRule {
  /** e.g. "5% up to ₹2,500 a piece, 18% above" */
  summary: string;
}

/** Every GST rate in use; a shop picks its slabs from these */
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40] as const;

/** Product forms: "AUTO" = follow the shop's rule (taxRate null) */
export const AUTO_RATE = 'AUTO';

interface Res<T> {
  data: T;
  message: string;
}

// The axios interceptor returns the body ({data, message}); employees are sent to /employee
export const getGstRule = () =>
  (api.get('/shop-admin/gst-rule') as unknown as Promise<Res<GstRuleView>>).then(
    (r) => r.data,
  );

export const updateGstRule = (rule: GstRule) =>
  (api.patch('/shop-admin/gst-rule', rule) as unknown as Promise<Res<GstRuleView>>).then(
    (r) => r.data,
  );

/** Label of a product's rate: a fixed rate, or the shop's rule */
export const rateLabel = (taxRate: number | null | undefined, rule?: GstRuleView) =>
  taxRate === null || taxRate === undefined
    ? `Auto${rule ? ` (${rule.summary})` : ' (shop rule)'}`
    : `${taxRate}%`;
