// Cash book & day close of the shop counter

export type CashRowKind =
  | 'OPENING'
  | 'SALE'
  | 'DUE'
  | 'REFUND'
  | 'EXPENSE'
  | 'PURCHASE'
  | 'SUPPLIER'
  | 'IN'
  | 'OUT'
  | 'BANK_DEPOSIT';

export type CashRow = {
  id: string;
  time: string;
  kind: CashRowKind;
  particulars: string;
  sub: string | null;
  ref: string | null;
  cashIn: number;
  cashOut: number;
  balance: number;
};

export type CashSession = {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  openedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  openingCash: number;
  closingCash: number | null;
  denominations: Record<string, number> | null;
  expectedCash: number | null;
  difference: number | null;
  differenceReason: string | null;
  depositAmount: number | null;
  keptFloat: number | null;
  reviewStatus: string | null;
};

export type CashBookDay = {
  date: string;
  isToday: boolean;
  session: CashSession | null;
  lastFloat: number | null;
  denominations: number[];
  rows: CashRow[];
  openingCash: number;
  cashIn: number;
  cashOut: number;
  expected: number;
  cashBills: number;
  outEntries: number;
  cashSales: number;
  duesCollected: number;
  cashExpenses: number;
};

export type CashEntryPayload = {
  type: 'IN' | 'OUT';
  amount: number;
  particulars: string;
  reference?: string;
};

export type BankDepositPayload = {
  amount: number;
  bankName: string;
  reference?: string;
};

export type CloseDayPayload = {
  denominations: Record<string, number>;
  depositAmount: number;
  keptFloat: number;
  differenceReason?: string;
};
