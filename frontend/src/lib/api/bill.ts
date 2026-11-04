import {api} from '@/utils/axios';
import {
  Bill,
  BillKind,
  BillListParams,
  BillPayload,
  RecordPaymentPayload,
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
  api
    .get<Res<{items: Bill[]; pagination: any}>>(base(panel, kind), {params})
    .then((res: any) => res);

export const getBill = (panel: string, kind: BillKind, id: string) =>
  api.get<Res<Bill>>(`${base(panel, kind)}/${id}`).then((res: any) => res);

export const createBill = (panel: string, kind: BillKind, data: BillPayload) =>
  api.post<Res<Bill>>(base(panel, kind), data).then((res: any) => res);

export const updateBill = (
  panel: string,
  kind: BillKind,
  id: string,
  data: BillPayload,
) =>
  api
    .patch<Res<Bill>>(`${base(panel, kind)}/${id}`, data)
    .then((res: any) => res);

export const confirmBill = (panel: string, kind: BillKind, id: string) =>
  api
    .post<Res<Bill>>(`${base(panel, kind)}/${id}/confirm`)
    .then((res: any) => res);

export const cancelBill = (
  panel: string,
  kind: BillKind,
  id: string,
  reason: string,
) =>
  api
    .post<Res<Bill>>(`${base(panel, kind)}/${id}/cancel`, {reason})
    .then((res: any) => res);

export const deleteBill = (panel: string, kind: BillKind, id: string) =>
  api.delete(`${base(panel, kind)}/${id}`).then((res: any) => res);

/** Due collected from a customer (sales) or a payment to the supplier (purchase) */
export const recordBillPayment = (
  panel: string,
  kind: BillKind,
  id: string,
  data: RecordPaymentPayload,
) =>
  api
    .post<Res<Bill>>(`${base(panel, kind)}/${id}/payments`, data)
    .then((res: any) => res);
