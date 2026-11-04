import {api} from '@/utils/axios';

export type DayCloseShop = {
  id: string;
  shopName: string;
  closedBy: string;
  opening: number;
  cashSales: number;
  duesCollected: number;
  cashOut: number;
  expected: number;
  counted: number;
  diff: number;
  status: 'ACCEPTED' | 'NEEDS_REVIEW';
  reason?: string;
  action?: string;
  note?: string;
};

export type DayCloseData = {
  date: string;
  summary: {
    cashSales: number;
    countersCount: number;
    counted: number;
    openingFloats: number;
    difference: number;
    differenceShop: string;
    toBank: number;
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
  reviewItem: DayCloseShop | null;
};

type Res<T> = {statusCode: number; data: T; message: string};

export const getDayCloseData = (date = '2026-11-02') =>
  api
    .get<Res<DayCloseData>>('/branch-admin/day-close', {params: {date}})
    .then((res: any) => res);

export const resolveDayCloseDifference = (data: {
  shopName: string;
  date: string;
  reason: string;
  action: string;
  note: string;
}) =>
  api
    .post<Res<{success: boolean; message: string}>>(
      '/branch-admin/day-close/resolve-difference',
      data,
    )
    .then((res: any) => res);

export const recordBankDeposit = (data: {
  amount: number;
  bank: string;
  depositSlipUtr?: string;
  slipUrl?: string;
  date: string;
}) =>
  api
    .post<Res<{success: boolean; message: string}>>(
      '/branch-admin/day-close/bank-deposit',
      data,
    )
    .then((res: any) => res);

