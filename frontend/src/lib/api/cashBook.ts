import {api} from '@/utils/axios';
import {
  BankDepositPayload,
  CashBookDay,
  CashEntryPayload,
  CloseDayPayload,
} from '@/types/cashBook';

type Res<T> = {statusCode: number; data: T; message: string};

export const getCashBook = (panel: string, date?: string) =>
  api.get(`/${panel}/cash-book`, {params: date ? {date} : {}}).then((res: any) => res as Res<CashBookDay>);

export const addCashEntry = (panel: string, data: CashEntryPayload) =>
  api.post(`/${panel}/cash-book/entries`, data).then((res: any) => res as Res<unknown>);

export const addShopBankDeposit = (panel: string, data: BankDepositPayload) =>
  api.post(`/${panel}/cash-book/bank-deposit`, data).then((res: any) => res as Res<unknown>);

export const closeCashDay = (panel: string, data: CloseDayPayload) =>
  api.post(`/${panel}/cash-book/close`, data).then((res: any) => res as Res<unknown>);
