import {api} from '@/utils/axios';
import {
  CreateTransferPayload,
  ShopRef,
  ShopTransferList,
  SourceOption,
  StockTransfer,
  TransferDecision,
  TransferSummary,
  TransferVariant,
} from '@/types/stockTransfer';

type Res<T> = {statusCode: number; data: T; message: string};

// ---- Shop: request, dispatch, receive ----

export const getTransferShops = (panel: string) =>
  api.get(`/${panel}/transfers/shops`).then((res: any) => res as Res<ShopRef[]>);

export const getTransferVariants = (panel: string, search?: string) =>
  api.get(`/${panel}/transfers/variants`, {
      params: search ? {search} : {},
    }).then((res: any) => res as Res<TransferVariant[]>);

export const getShopTransfers = (panel: string, tab: 'MINE' | 'DISPATCH' | 'HISTORY', search?: string) =>
  api.get(`/${panel}/transfers`, {params: {tab, ...(search ? {search} : {})}}).then((res: any) => res as Res<ShopTransferList>);

export const createTransferRequest = (panel: string, data: CreateTransferPayload) =>
  api.post(`/${panel}/transfers`, data).then((res: any) => res as Res<StockTransfer>);

export const dispatchTransfer = (panel: string, id: string) =>
  api.post(`/${panel}/transfers/${id}/dispatch`).then((res: any) => res as Res<StockTransfer>);

export const receiveTransfer = (
  panel: string,
  id: string,
  data: {items: Array<{itemId: string; receivedQty: number}>; note?: string},
) =>
  api.post(`/${panel}/transfers/${id}/receive`, data).then((res: any) => res as Res<StockTransfer>);

// ---- Branch admin: approve / reject, overview ----

export type Paging = {page: number; limit: number; total: number; totalPages: number};

export const getStockTransfers = (params?: {search?: string; tab?: string; page?: number}) =>
  api.get('/branch-admin/transfers', {params}).then((res: any) => res as Res<{items: StockTransfer[]; pagination?: Paging}>);

export const getStockTransferSummary = () =>
  api.get('/branch-admin/transfers/summary').then((res: any) => res as Res<TransferSummary>);

// The owner (company admin in shop mode) can also approve, through /shop-admin
export const getTransferSources = (id: string, panel = 'branch-admin') =>
  api.get(`/${panel}/transfers/${id}/sources`).then((res: any) => res as Res<SourceOption[]>);

export const decideTransfer = (id: string, data: TransferDecision, panel = 'branch-admin') =>
  api.post(`/${panel}/transfers/${id}/decision`, data).then((res: any) => res as Res<StockTransfer>);
