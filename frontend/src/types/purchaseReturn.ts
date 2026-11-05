export interface PurchaseBillReturnItem {
  id: string; // purchaseBillItemId
  productId?: string;
  variantId?: string;
  productName: string;
  size: string;
  hsn: string;
  boughtQty: number;
  inStockQty: number;
  returnQty: number;
  unitCost: number;
  taxRate: number;
  reason?: string;
}

export interface PurchaseBillForReturn {
  id: string;
  billNumber: string;
  supplierName: string;
  supplierPhone?: string;
  supplierInvoiceNo?: string;
  billDate: string;
  totalAmount: number;
  balanceDue: number;
  items: PurchaseBillReturnItem[];
}

export interface EarlierReturnSummary {
  id: string;
  returnNumber: string;
  supplierName: string;
  totalAmount: number;
  totalQuantity: number;
  returnDate: string;
  dateFormatted: string;
  subtitle: string;
  note?: string;
  status: string;
}

export interface CreatePurchaseReturnPayload {
  supplierName: string;
  purchaseBillId?: string;
  returnDate?: string;
  status: 'DRAFT' | 'CONFIRMED';
  sentVia?: string;
  takeStockFrom: 'DAMAGED_STOCK' | 'ACTIVE_STOCK';
  noteToSupplier?: string;
  settleAs: 'DEDUCT_FROM_PAYABLE' | 'BANK_REFUND' | 'SUPPLIER_CREDIT';
  items: Array<{
    purchaseBillItemId?: string;
    productId?: string;
    variantId?: string;
    productName: string;
    size?: string;
    hsn?: string;
    boughtQty: number;
    inStockQty: number;
    returnQty: number;
    unitCost: number;
    taxRate: number;
    reason?: string;
  }>;
}

