import {api} from '@/utils/axios';

export type StockTransfer = {
  id: string;
  transferNo: string;
  transferType: string;
  fromLocation: string;
  toLocation: string;
  requestedBy: string;
  dispatchDate: string;
  priority: string;
  units: number;
  status: string;
  reason: string;
  metadata?: {
    variants?: Array<{name: string; sent: number; received: number}>;
    discrepancyNote?: string;
    damagedOnArrival?: number;
    receivingNote?: string;
  };
  createdAt: string;
};

export type StockTransferSummary = {
  toApprove: number;
  toDispatch: number;
  incoming: number;
  discrepancies: number;
};

type Res<T> = {statusCode: number; data: T; message: string};

export const getStockTransfers = (params?: {search?: string; tab?: string}) =>
  api
    .get<Res<{items: StockTransfer[]}>>('/branch-admin/transfers', {params})
    .then((res: any) => res);

export const getStockTransferSummary = () =>
  api
    .get<Res<StockTransferSummary>>('/branch-admin/transfers/summary')
    .then((res: any) => res);

export const confirmTransferReceipt = (
  id: string,
  data: {
    damagedOnArrival?: number;
    receivingNote?: string;
    itemsReceived: Record<string, number>;
  },
) =>
  api
    .post<Res<{success: boolean; status: string; message: string}>>(
      `/branch-admin/transfers/${id}/receive`,
      data,
    )
    .then((res: any) => res);

export const createStockTransfer = (data: {
  transferType: string;
  fromSource: string;
  toDestination: string;
  dispatchDate: string;
  priority: string;
  items: Array<{
    productVariant: string;
    sku: string;
    availableAtSource: number;
    qtyToSend: number;
  }>;
  reason: string;
  noteForReceiver?: string;
  status?: string;
}) =>
  api
    .post<Res<StockTransfer>>('/branch-admin/transfers', data)
    .then((res: any) => res);

