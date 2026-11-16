import {api} from '@/utils/axios';
import {
  
  Bill,
 
  BillKind,
 
  BillListParams,
 
  BillPayload,
  BranchSalesParams,
  BranchSalesSummary,
  RecordPaymentPayload,
  SalesPreview,
} from '@/types/bill';

// Purchase bills add stock, sales bills deduct it; the backend posts the
// stock change automatically on save / edit / confirm / cancel / delete.

const base = (panel: string, kind: BillKind) => `/${panel}/${kind}-bills`;

type Res<T> = {statusCode: number; data: T; message: string};

export const getBills = (
  panel: string,
  kind: BillKind,
  params: BillListParams,
) =>
  (api.get(base(panel, kind), {params}) as unknown as Promise<Res<{items: Bill[]; pagination: any}>>);

export const getBill = (panel: string, kind: BillKind, id: string) =>
  (api.get(`${base(panel, kind)}/${id}`) as unknown as Promise<Res<Bill>>);

export const getBillByNumber = (
  panel: string,
  kind: BillKind,
  billNumber: string,
) =>
  (api.get(`${base(panel, kind)}/find`, {params: {billNumber}}) as unknown as Promise<Res<Bill>>);

/** What a sales bill being typed comes to: the server's GST per line, totals and breakup (P4-03) */
export type SalesPreviewPayload = {
  items: {variantId: string; quantity: number; unitPrice: number; discount: number}[];
  discount: number;
  billType?: string;
  customerGstin?: string;
};

export const previewSalesBill = (
  panel: string,
  data: SalesPreviewPayload,
  signal?: AbortSignal,
) =>
  (api.post(`/${panel}/sales-bills/preview`, data, {signal}) as unknown as Promise<
    Res<SalesPreview>
  >).then((r) => r.data);

export const createBill = (panel: string, kind: BillKind, data: BillPayload) =>
  (api.post(base(panel, kind), data) as unknown as Promise<Res<Bill>>);

export const updateBill = (
  panel: string,
  kind: BillKind,
  id: string,
  data: BillPayload,
) =>
  (api.patch(`${base(panel, kind)}/${id}`, data) as unknown as Promise<Res<Bill>>);

export const confirmBill = (panel: string, kind: BillKind, id: string) =>
  (api.post(`${base(panel, kind)}/${id}/confirm`) as unknown as Promise<Res<Bill>>);

export const cancelBill = (
  panel: string,
  kind: BillKind,
  id: string,
  reason: string,
) =>
  (api.post(`${base(panel, kind)}/${id}/cancel`, {reason}) as unknown as Promise<Res<Bill>>);

/** An employee's delete of a posted bill sends a request with the reason */
export const deleteBill = (
  panel: string,
  kind: BillKind,
  id: string,
  reason?: string,
) =>
  api.delete(`${base(panel, kind)}/${id}`, {
    data: reason ? {reason} : undefined,
  });

/** The shop admin turns down an employee's delete request */
export const keepBill = (panel: string, kind: BillKind, id: string) =>
  api.post(`${base(panel, kind)}/${id}/keep`);

/** Due collected from a customer (sales) or a payment to the supplier (purchase) */
export const recordBillPayment = (
  panel: string,
  kind: BillKind,
  id: string,
  data: RecordPaymentPayload,
) =>
  (api.post(`${base(panel, kind)}/${id}/payments`, data) as unknown as Promise<Res<Bill>>);

export interface CustomerSuggestion {
  name: string;
  phone: string;
  previousDue: number;
  /** 0 = no limit */
  creditLimit: number;
  creditDays: number;
  gstin: string | null;
  businessName: string | null;
}

// sales-bills/customers: plain /customers is also the shop customer list route
export const searchCustomers = (panel: string, q: string) =>
  api.get(`/${panel}/sales-bills/customers`, {
    params: {q},
  }) as unknown as Promise<Res<CustomerSuggestion[]>>;

// Branch admin: read-only view of every shop's sales bills
// (the axios response interceptor already unwraps `res.data`)
export const getBranchSalesSummary = (
  params: Pick<BranchSalesParams, 'shopId' | 'from' | 'to'>,
) =>
  api.get('/branch-admin/sales-bills/summary', {params}) as unknown as Promise<
    Res<BranchSalesSummary>
  >;

export const exportBranchSales = (params: BranchSalesParams) =>
  api.get('/branch-admin/sales-bills/export', {params}) as unknown as Promise<
    Res<Bill[]>
  >;
