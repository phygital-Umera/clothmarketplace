export interface ExpenseMetrics {
  thisMonth: number;
  thisMonthSub: string;
  paidInCash: number;
  cashEntriesCount: number;
  cashEntriesSub: string;
  today: number;
  todayEntriesCount: number;
  todayEntriesSub: string;
}

export interface ExpenseItem {
  id: string;
  expenseNumber: string;
  date: string;
  rawDate: string;
  head: string;
  description: string;
  loggedBy: string;
  paidBy: string;
  amount: number;
  gstAmount: number;
  photoUrl: string | null;
}

export interface ExpensesResponse {
  metrics: ExpenseMetrics;
  nextExpenseNumber: string;
  expenses: ExpenseItem[];
  total: number;
}

export interface CreateExpensePayload {
  date?: string;
  amount: number;
  head: string;
  description: string;
  paidBy: string;
  gstAmount?: number;
  photoUrl?: string | null;
}

