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
  (api.get('/branch-admin/suppliers', {params}) as unknown as Promise<Res<{items: SupplierProfile[]}>>);

export const getSupplierSummary = () =>
  (api.get('/branch-admin/suppliers/summary') as unknown as Promise<Res<SupplierSummary>>);

export const recordSupplierPayment = (data: RecordPaymentPayload) =>
  (api.post('/branch-admin/suppliers/payment', data) as unknown as Promise<Res<{receiptNo: string; message: string}>>);

