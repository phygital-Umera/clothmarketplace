import {api} from '@/utils/axios';
import {
  CreateSupplierPayload,
  RecordSupplierPaymentPayload,
  SupplierLedgerResponse,
  SupplierProfile,
} from '@/types/supplier';

interface Res<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export const getSuppliers = (panel: string = 'shop-admin', search?: string) =>
  api
    .get<Res<{items: SupplierProfile[]; totalPayable: number; suppliersCount: number}>>(
      `/${panel}/suppliers`,
      { params: search ? { search } : undefined }
    )
    .then((res: any) => res?.data ?? res);

export const getSupplierLedger = (panel: string = 'shop-admin', supplierId: string) =>
  api
    .get<Res<SupplierLedgerResponse>>(`/${panel}/suppliers/${supplierId}/ledger`)
    .then((res: any) => res?.data ?? res);

export const getNextReceipt = (panel: string = 'shop-admin') =>
  api
    .get<{receiptNumber: string; success: boolean}>(`/${panel}/suppliers/next-receipt`)
    .then((res: any) => res?.receiptNumber ?? res?.data?.receiptNumber ?? 'PY/26-27/0019');

export const createSupplier = (panel: string = 'shop-admin', payload: CreateSupplierPayload) =>
  api
    .post<Res<SupplierProfile>>(`/${panel}/suppliers`, payload)
    .then((res: any) => res?.data ?? res);

export const recordSupplierPayment = (
  panel: string = 'shop-admin',
  payload: RecordSupplierPaymentPayload,
) =>
  api
    .post<Res<{success: boolean; receiptNumber: string; amount: number; newBalance: number; message: string}>>(
      `/${panel}/suppliers/payment`,
      payload
    )
    .then((res: any) => res?.data ?? res);

