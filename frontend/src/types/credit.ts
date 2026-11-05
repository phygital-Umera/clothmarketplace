export interface AgingRange {
  amount: number;
  count: number;
}

export interface CreditMetrics {
  totalDue: number;
  totalCustomers: number;
  aging: {
    range0To15: AgingRange;
    range16To30: AgingRange;
    rangeOver30: AgingRange;
  };
  collectedThisMonth: {
    amount: number;
    paymentsCount: number;
  };
}

export interface CreditCustomerSummary {
  id: string;
  name: string;
  mobile: string;
  customerType: string;
  businessName: string | null;
  creditLimit: number;
  creditDays: number;
  balanceDue: number;
  billsCount: number;
  oldestBillDate: string | null;
  daysOld: number;
  isOverdue: boolean;
  displayAge: string;
}

export interface StatementTransaction {
  id: string;
  date: string;
  type: 'SALE' | 'PAYMENT';
  particulars: string;
  ref: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

export interface CustomerStatement {
  customer: {
    id: string;
    name: string;
    mobile: string;
    customerType: string;
    businessName: string | null;
    creditLimit: number;
    creditDays: number;
    balanceDue: number;
  };
  statementPeriod: {
    from: string;
    to: string;
  };
  openingBalance: number;
  closingBalance: number;
  transactions: StatementTransaction[];
}

export interface ReceivePaymentPayload {
  amount: number;
  mode: string;
  date: string;
  note?: string;
}

export interface WhatsAppReminder {
  customerId: string;
  name: string;
  mobile: string;
  balanceDue: number;
  whatsappUrl: string;
  message: string;
}

