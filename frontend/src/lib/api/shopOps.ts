import {api} from '@/utils/axios';
import {
  CounterSession,
  ExpensePayload,
  ShopDashboard,
} from '@/types/shopOps';

// Shop dashboard, the cash counter session and shop expenses.
// Returns are credit notes (see creditNote.ts).

type Res<T> = {statusCode: number; data: T; message: string};

export const getShopDashboard = (panel: string) =>
  (api.get(`/${panel}/dashboard`) as unknown as Promise<Res<ShopDashboard>>);

export const openCounter = (panel: string, openingCash: number) =>
  (api.post(`/${panel}/counter/open`, {openingCash}) as unknown as Promise<Res<CounterSession>>);

export const closeCounter = (panel: string, closingCash: number) =>
  (api.post(`/${panel}/counter/close`, {closingCash}) as unknown as Promise<Res<CounterSession>>);

export const createExpense = (panel: string, data: ExpensePayload) =>
  (api.post(`/${panel}/expenses`, data) as unknown as Promise<Res<unknown>>);

