export type BranchPurchaseItem = {
  productName: string;
  sku?: string;
  size: string;
  color: string;
  pcs: number;
  cost: number;
  gstRate: number;
  total: number;
};

export type BranchPurchaseStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE' | 'DRAFT' | 'CANCELLED';

export type BranchPurchaseBill = {
  id: string;
  billNumber: string;
  billDate: string;
  supplierName: string;
  supplierInvoiceNo: string;
  boughtBy: string;
  /** The shop the stock went into */
  stockTo: string;
  pcs: number;
  taxable: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string | null;
  status: BranchPurchaseStatus;
  items: BranchPurchaseItem[];
};

export type BranchPurchaseSummary = {
  purchasesMonth: number;
  billsCount: number;
  pcsCount: number;
  inputGst: number;
  payable: number;
  overdueCount: number;
  suppliers: string[];
  shops: {id: string; name: string}[];
};

export type BranchPurchaseQuery = {
  search?: string;
  tab?: 'ALL' | 'UNPAID' | 'DRAFT';
  supplierName?: string;
  shopId?: string;
  /** YYYY-MM */
  month?: string;
  page?: number;
  limit?: number;
};
