export type BranchPurchaseItem = {
  productName: string;
  sku?: string;
  hsn?: string;
  sizeBreakdown: Record<string, number>;
  pcs: number;
  cost: number;
  salePrice: number;
  gstRate: number;
  shopAllocations: Record<string, number>;
};

export type BranchPurchaseBill = {
  id: string;
  billNumber: string;
  billDate: string;
  supplierName: string;
  supplierInvoiceNo: string;
  supplierGstin?: string;
  boughtBy: string;
  stockTo: string;
  pcs: number;
  taxable: number;
  gstAmount: number;
  gstType: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE' | 'DRAFT';
  paymentTerms?: string;
  paymentMode?: string;
  receivedAt?: string;
  dueDate?: string;
  metadata?: {
    items?: BranchPurchaseItem[];
    transfers?: Array<{transferNo: string; toShop: string; pcs: number}>;
    printBarcodes?: boolean;
    companyApprovalNeeded?: boolean;
  };
};

export type BranchPurchaseSummary = {
  purchasesMonth: number;
  billsCount: number;
  pcsCount: number;
  inputGst: number;
  payable: number;
  overdueCount: number;
  above50kCount: number;
  suppliers: string[];
};

export type BranchPurchaseQuery = {
  search?: string;
  tab?: 'ALL' | 'UNPAID' | 'BRANCH_PURCHASES' | 'SHOP_PURCHASES' | 'DRAFT';
  supplierName?: string;
  month?: string;
  page?: number;
  limit?: number;
};

export type NewBranchPurchasePayload = {
  supplierName: string;
  supplierInvoiceNo: string;
  supplierGstin?: string;
  invoiceDate: string;
  receivedAt: string;
  paymentTerms: string;
  status?: 'CONFIRMED' | 'DRAFT';
  items: BranchPurchaseItem[];
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount?: number;
  totalAmount: number;
  paidAmount: number;
  paymentMode: string;
  balanceAmount: number;
  dueDate?: string;
  createTransfers?: boolean;
  printBarcodes?: boolean;
  companyApprovalNeeded?: boolean;
};

