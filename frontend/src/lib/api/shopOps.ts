import {api} from '@/utils/axios';
import {
  CounterSession,
  ExpensePayload,
  SalesReturnPayload,
  ShopDashboard,
} from '@/types/shopOps';

// Shop dashboard and counter operations: credit notes (sales returns), the
// cash counter session and shop expenses.

type Res<T> = {statusCode: number; data: T; message: string};

export const getShopDashboard = (panel: string) =>
  api.get<Res<ShopDashboard>>(`/${panel}/dashboard`).then((res: any) => res);

export const createSalesReturn = (panel: string, data: SalesReturnPayload) =>
  api
    .post<Res<unknown>>(`/${panel}/sales-returns`, data)
    .then((res: any) => res);

export const openCounter = (panel: string, openingCash: number) =>
  api
    .post<Res<CounterSession>>(`/${panel}/counter/open`, {openingCash})
    .then((res: any) => res);

export const closeCounter = (panel: string, closingCash: number) =>
  api
    .post<Res<CounterSession>>(`/${panel}/counter/close`, {closingCash})
    .then((res: any) => res);

export const createExpense = (panel: string, data: ExpensePayload) =>
  api.post<Res<unknown>>(`/${panel}/expenses`, data).then((res: any) => res);
