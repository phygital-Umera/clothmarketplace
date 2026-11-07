import {PaymentMethod} from './bill';

export type RefundMode = PaymentMethod | 'STORE_CREDIT' | 'ADJUST_DUE' | 'EXCHANGE';

export const EXPENSE_CATEGORIES = [
  'Tea / Snacks',
  'Transport',
  'Salary Advance',
  'Utilities',
  'Repairs',
  'Other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface CounterSession {
  id: string;
  openedAt: string;
  openingCash: number;
  closedAt?: string | null;
  closingCash?: number | null;
}

type DueBill = {id: string; billNumber: string; balanceDue: number};

/** GET /shop-admin/dashboard */
export interface ShopDashboard {
  generatedAt: string;
  /** Orders from the online store for this shop */
  onlineOrders?: {
    toConfirm: number;
    toPack: number;
    toShip: number;
    onTheWay: number;
    delivered: number;
    cancelRequests: number;
    returnRequests: number;
    ordersToday: number;
    salesToday: number;
    waiting: {
      id: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      paymentMethod: string;
      paymentStatus: string;
      createdAt: string;
      customer: string;
      items: number;
    }[];
  };
  shop: {name: string; code: string; gstin: string | null; branchName: string};
  counter: {id: string; openedAt: string; openingCash: number} | null;
  staff: {in: number; total: number};
  kpis: {
    salesToday: number;
    billsToday: number;
    returnsToday: number;
    salesLastWeekSameDay: number;
    /** null when there were no sales on the same weekday last week */
    changePct: number | null;
    /** null while the counter is closed */
    cash: {
      inDrawer: number;
      openingCash: number;
      cashSales: number;
      cashRefunds: number;
      cashExpenses: number;
      supplierPayments: number;
    } | null;
    grossProfit: number;
    marginPct: number | null;
    /** Items sold today that were never purchased (cost unknown, counted at 0) */
    costMissingItems: number;
    salesThisMonth: number;
    monthStart: string;
    customerDues: number;
    customersWithDues: number;
    customersOverdue: number;
    supplierPayable: number;
    supplierBillsOverdue: number;
    stockValue: number;
    stockPieces: number;
    lowStock: number;
    outOfStock: number;
  };
  todaysBills: Array<{
    kind: 'BILL' | 'RETURN';
    id: string;
    number: string;
    at: string;
    customer: string;
    paidBy: string[];
    amount: number;
    status: 'PAID' | 'PART_CREDIT' | 'CREDIT' | 'RETURN';
    salesBillId?: string;
  }>;
  paymentMix: Array<{mode: string; label: string; amount: number}>;
  duesToCollect: Array<{
    name: string;
    phone: string | null;
    outstanding: number;
    since: string;
    dueDate: string | null;
    overdueDays: number;
    lastPayment: {paidAt: string; amount: number} | null;
    bills: DueBill[];
  }>;
  lowStock: Array<{
    variantId: string;
    productName: string;
    variantSku: string;
    size: string;
    color: string;
    colorHex: string | null;
    available: number;
    threshold: number;
    status: 'OUT_OF_STOCK' | 'LOW_STOCK';
  }>;
  supplierPayments: Array<{
    name: string;
    phone: string | null;
    outstanding: number;
    dueDate: string | null;
    overdueDays: number;
    bills: DueBill[];
  }>;
}

export interface ExchangeItemPayload {
  variantId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface SalesReturnPayload {
  salesBillId: string;
  refundMode: RefundMode;
  reason?: string;
  items: {salesBillItemId: string; quantity: number}[];
  exchangeItems?: ExchangeItemPayload[];
}

export interface ExpensePayload {
  category: ExpenseCategory;
  amount: number;
  mode: PaymentMethod;
  notes?: string;
}
