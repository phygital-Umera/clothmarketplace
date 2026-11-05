import {api} from '@/utils/axios';
import {
  AdjustmentVariantOption,
  StockAdjustmentHistoryRow,
  CreateStockAdjustmentPayload,
} from '@/types/stockAdjustment';

interface Res<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export const getNextAdjustmentNumber = (panel: string = 'shop-admin') =>
  api
    .get<Res<{adjustmentNumber: string}>>(`/${panel}/stock-adjustments/next-number`)
    .then((res: any) => res?.data?.adjustmentNumber ?? res?.adjustmentNumber ?? 'ADJ-0046');

export const getAdjustmentVariants = (panel: string = 'shop-admin', search?: string) =>
  api
    .get<Res<{variants: AdjustmentVariantOption[]}>>(`/${panel}/stock-adjustments/variants`, {
      params: search ? {search} : undefined,
    })
    .then((res: any) => res?.data?.variants ?? res?.variants ?? []);

export const getAdjustmentHistory = (
  panel: string = 'shop-admin',
  params?: {
    type?: string;
    search?: string;
  }
) =>
  api
    .get<Res<{history: StockAdjustmentHistoryRow[]}>>(`/${panel}/stock-adjustments`, {params})
    .then((res: any) => res?.data?.history ?? res?.history ?? []);

export const createStockAdjustment = (
  panel: string = 'shop-admin',
  payload: CreateStockAdjustmentPayload
) =>
  api
    .post<Res<{success: boolean; message: string; adjustmentNumber: string}>>(
      `/${panel}/stock-adjustments`,
      payload
    )
    .then((res: any) => res?.data ?? res);

