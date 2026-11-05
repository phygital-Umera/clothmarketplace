import {api} from '@/utils/axios';
import {
  CreatePurchaseReturnPayload,
  EarlierReturnSummary,
  PurchaseBillForReturn,
} from '@/types/purchaseReturn';

interface Res<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export const getNextDebitNoteNumber = (panel: string = 'shop-admin') =>
  api
    .get<{nextNumber: string; success: boolean}>(`/${panel}/purchase-returns/next-number`)
    .then((res: any) => res?.nextNumber ?? res?.data?.nextNumber ?? 'DN/26-27/0006');

export const getReturnSuppliers = (panel: string = 'shop-admin') =>
  api
    .get<Res<Array<{name: string; phone?: string}>>>(`/${panel}/purchase-returns/suppliers`)
    .then((res: any) => res?.data ?? res);

export const getBillsBySupplier = (panel: string = 'shop-admin', supplierName?: string) =>
  api
    .get<Res<PurchaseBillForReturn[]>>(`/${panel}/purchase-returns/bills`, {
      params: supplierName ? {supplierName} : undefined,
    })
    .then((res: any) => res?.data ?? res);

export const getEarlierReturns = (panel: string = 'shop-admin') =>
  api
    .get<Res<EarlierReturnSummary[]>>(`/${panel}/purchase-returns/earlier`)
    .then((res: any) => res?.data ?? res);

export const createPurchaseReturn = (
  panel: string = 'shop-admin',
  payload: CreatePurchaseReturnPayload,
) =>
  api
    .post<Res<any>>(`/${panel}/purchase-returns`, payload)
    .then((res: any) => res?.data ?? res);

export const getPurchaseReturn = (panel: string = 'shop-admin', id: string) =>
  api
    .get<Res<any>>(`/${panel}/purchase-returns/${id}`)
    .then((res: any) => res?.data ?? res);

