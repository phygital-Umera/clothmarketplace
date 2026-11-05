import {api} from '@/utils/axios';
import {
  StockPeriod,
  StockTab,
  StockSummaryResponse,
  AdjustStockPayload,
  PhysicalStockCountPayload,
} from '@/types/stock';

interface Res<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export const getStockSummary = (
  panel: string = 'shop-admin',
  params?: {
    period?: StockPeriod;
    tab?: StockTab;
    search?: string;
  }
) =>
  api
    .get<Res<StockSummaryResponse>>(`/${panel}/stock/summary`, {params})
    .then((res: any) => res?.data ?? res);

export const adjustStock = (panel: string = 'shop-admin', payload: AdjustStockPayload) =>
  api
    .post<Res<{success: boolean; message: string; newQty: number}>>(`/${panel}/stock/adjust`, payload)
    .then((res: any) => res?.data ?? res);

export const recordPhysicalStockCount = (
  panel: string = 'shop-admin',
  payload: PhysicalStockCountPayload
) =>
  api
    .post<Res<{success: boolean; auditNumber: string; message: string}>>(
      `/${panel}/stock/physical-count`,
      payload
    )
    .then((res: any) => res?.data ?? res);

