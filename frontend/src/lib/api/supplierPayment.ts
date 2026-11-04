import {api} from '@/utils/axios';

export type SupplierProfile = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  gstinState: string;
  owedBy: string;
  billsOpen: number;
  payable: number;
  nextDue: string;
  isOverdue: boolean;
};

export type SupplierSummary = {
  totalPayable: number;
  suppliersCount: number;
  overdueAmount: number;
  dueIn15Days: number;
  paidThisMonth: number;
  paymentsCount: number;
};

export type RecordPaymentPayload = {
  supplierName: string;
  billNumber?: string;
  amount: number;
  date: string;
  paymentMode: string;
  utrChequeNo?: string;
  tdsDeducted?: number;
};

type Res<T> = {statusCode: number; data: T; message: string};

export const getSuppliers = (params?: {search?: string}) =>
  api
    .get<Res<{items: SupplierProfile[]}>>('/branch-admin/suppliers', {params})
    .then((res: any) => res);

export const getSupplierSummary = () =>
  api
    .get<Res<SupplierSummary>>('/branch-admin/suppliers/summary')
    .then((res: any) => res);

export const recordSupplierPayment = (data: RecordPaymentPayload) =>
  api
    .post<Res<{receiptNo: string; message: string}>>('/branch-admin/suppliers/payment', data)
    .then((res: any) => res);

