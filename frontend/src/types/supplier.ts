export type SupplierProfile = {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  paymentTerms: string;
  openingBalance: number;
  payable: number;
  isOverdue: boolean;
  nextDue: string;
  createdAt?: string;
};

export type SupplierLedgerEntry = {
  id: string;
  date: string;
  rawDate: string;
  particulars: string;
  ref: string;
  credit: number | null;
  debit: number | null;
  balance: number;
};

export type OpenBillOption = {
  id: string;
  billNumber: string;
  balanceDue: number;
  totalAmount: number;
  label: string;
};

export type SupplierLedgerResponse = {
  supplier: SupplierProfile;
  ledger: SupplierLedgerEntry[];
  openBills: OpenBillOption[];
  nextReceiptNumber: string;
  statementPeriod: string;
};

export type CreateSupplierPayload = {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  city?: string;
  state?: string;
  address?: string;
  paymentTerms?: string;
  openingBalance?: number;
};

export type RecordSupplierPaymentPayload = {
  supplierId: string;
  supplierName?: string;
  billId?: string;
  billNumber?: string;
  amount: number;
  paymentMode: string;
  paidFrom?: string;
  paymentDate?: string;
  utrChequeNo?: string;
  tdsDeducted?: number;
  notes?: string;
};

