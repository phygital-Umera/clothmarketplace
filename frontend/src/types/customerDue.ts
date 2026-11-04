export type CustomerDue = {
  id: string;
  name: string;
  phone: string;
  customerType: 'B2B' | 'B2C';
  gstin: string | null;
  shopId?: string;
  shopName: string;
  creditLimit: number;
  creditDays: number;
  due0To30: number;
  due30Plus: number;
  totalDue: number;
  allowOverLimit: boolean;
  askClearOldDue: boolean;
  pendingRequest: {
    type: string;
    billAmount: number;
    requestedCredit: number;
    totalIfApproved: number;
    overdueAgeDays?: number;
    overduePart?: number;
    note: string;
    requestedAt?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerDueSummary = {
  totalDue: number;
  customerCount: number;
  shopBreakdown: {shopName: string; amount: number; customerCount: number}[];
  over30DaysDue: number;
  over30DaysCount: number;
  overdueCount: number;
  overLimitCount: number;
};

export type CustomerDueListParams = {
  search?: string;
  tab?: 'WITH_DUE' | 'OVERDUE' | 'OVER_LIMIT' | 'ALL';
  shopId?: string;
  page?: number;
  limit?: number;
};

export type UpdateCreditLimitPayload = {
  creditLimit?: number;
  creditDays?: number;
  allowOverLimit?: boolean;
  askClearOldDue?: boolean;
  action?: 'APPROVE' | 'REJECT';
};

