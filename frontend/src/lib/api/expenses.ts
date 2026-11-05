import {api} from '@/utils/axios';
import {ExpensesResponse, CreateExpensePayload} from '@/types/expense';

interface Res<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export const getShopExpenses = (
  panel: string = 'shop-admin',
  params?: {
    month?: string;
    head?: string;
  }
) =>
  api
    .get<Res<ExpensesResponse>>(`/${panel}/expenses`, {params})
    .then((res: any) => res?.data ?? res);

export const getNextExpenseNumber = (panel: string = 'shop-admin') =>
  api
    .get<Res<{nextExpenseNumber: string}>>(`/${panel}/expenses/next-number`)
    .then((res: any) => res?.data?.nextExpenseNumber ?? res?.nextExpenseNumber ?? 'EX/26-27/0063');

export const createShopExpense = (
  panel: string = 'shop-admin',
  payload: CreateExpensePayload
) =>
  api
    .post<Res<{success: boolean; message: string; expense: any}>>(
      `/${panel}/expenses`,
      payload
    )
    .then((res: any) => res?.data ?? res);

