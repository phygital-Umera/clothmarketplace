import {api} from '@/utils/axios';

export type DayCloseShop = {
  id: string;
  sessionId: string | null;
  shopId: string;
  shopName: string;
  closedBy: string;
  opening: number;
  cashSales: number;
  duesCollected: number;
  cashOut: number;
  expected: number;
  counted: number;
  diff: number;
  depositAmount: number;
  keptFloat: number;
  status: 'ACCEPTED' | 'NEEDS_REVIEW' | 'OPEN' | 'NOT_OPENED';
  reason?: string | null;
  action?: string | null;
  note?: string | null;
};

export type DayCloseData = {
  date: string;
  summary: {
    cashSales: number;
    countersCount: number;
    shopsCount: number;
    counted: number;
    openingFloats: number;
    difference: number;
    differenceShop: string;
    toBank: number;
    deposited: number;
    depositStatus: string;
  };
  shops: DayCloseShop[];
  totals: {
    opening: number;
    cashSales: number;
    duesCollected: number;
    cashOut: number;
    expected: number;
    counted: number;
    diff: number;
  };
  deposits: Array<{id: string; amount: number; bank: string; reference: string | null; createdAt: string}>;
  reviewItem: DayCloseShop | null;
};

type Res<T> = {statusCode: number; data: T; message: string};

export const getDayCloseData = (date: string) =>
  api.get('/branch-admin/day-close', {params: {date}}).then((res: any) => res as Res<DayCloseData>);

export const resolveDayCloseDifference = (data: {
  sessionId: string;
  reason: string;
  action: string;
  note?: string;
}) =>
  api.post('/branch-admin/day-close/resolve-difference', data).then((res: any) => res as Res<{success: boolean; message: string}>);

export const recordBankDeposit = (data: {
  amount: number;
  bank: string;
  depositSlipUtr?: string;
  slipUrl?: string;
  date: string;
}) =>
  api.post('/branch-admin/day-close/bank-deposit', data).then((res: any) => res as Res<{success: boolean; message: string}>);
