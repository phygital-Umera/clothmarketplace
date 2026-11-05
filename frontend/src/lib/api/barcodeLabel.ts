import {api} from '@/utils/axios';
import {
  BarcodeLabelRow,
  PrintJobPayload,
  PurchaseBillOption,
} from '@/types/barcodeLabel';

interface Res<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export const getPurchaseBillsForLabels = (panel: string = 'shop-admin') =>
  api
    .get<Res<{bills: PurchaseBillOption[]}>>(`/${panel}/barcode-labels/purchase-bills`)
    .then((res: any) => res?.data?.bills ?? res?.bills ?? []);

export const getBillItemsForLabels = (panel: string = 'shop-admin', billId: string) =>
  api
    .get<Res<{bill: any; items: BarcodeLabelRow[]; totalLabels: number}>>(
      `/${panel}/barcode-labels/bills/${billId}/items`
    )
    .then((res: any) => res?.data ?? res);

export const searchProductsForLabels = (panel: string = 'shop-admin', search?: string) =>
  api
    .get<Res<{items: BarcodeLabelRow[]}>>(`/${panel}/barcode-labels/products`, {
      params: search ? {search} : undefined,
    })
    .then((res: any) => res?.data?.items ?? res?.items ?? []);

export const getReprintBatches = (panel: string = 'shop-admin') =>
  api
    .get<Res<{batches: any[]}>>(`/${panel}/barcode-labels/reprint-batches`)
    .then((res: any) => res?.data?.batches ?? res?.batches ?? []);

export const recordPrintJob = (panel: string = 'shop-admin', payload: PrintJobPayload) =>
  api
    .post<Res<{success: boolean; jobId: string; totalLabels: number; message: string}>>(
      `/${panel}/barcode-labels/print`,
      payload
    )
    .then((res: any) => res?.data ?? res);

