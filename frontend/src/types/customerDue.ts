export type CustomerDue = {
  id: string;
  name: string;
  phone: string;
  customerType: 'B2B' | 'B2C';
  gstin: string | null;
  shopId: string;
  shopName: string;
  creditLimit: number;
  creditDays: number;
  /** Due on bills up to 30 days old */
  due0To30: number;
  /** Due on older bills, plus any opening due */
  due30Plus: number;
  totalDue: number;
  isOverdue: boolean;
  isOverLimit: boolean;
  createdAt: string;
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
  creditLimit: number;
  creditDays: number;
};

export type DueReminder = {
  id: string;
  name: string;
  phone: string;
  amount: number;
  /** wa.me link with the message filled in */
  link: string;
};
