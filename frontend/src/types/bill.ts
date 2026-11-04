export type BillKind = 'purchase' | 'sales';
export type BillStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'CREDIT';

export interface BillItemVariant {
  id: string;
  variantSku: string;
  size: string;
  color: string;
  colorHex?: string | null;
  product: {id: string; name: string; sku: string; images: {url: string}[]};
}

export interface BillItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  taxRate: number;
  // purchase
  unitCost?: number;
  totalCost?: number;
  // sales
  unitPrice?: number;
  discount?: number;
  totalPrice?: number;
  variant?: BillItemVariant;
}

export interface Bill {
  id: string;
  billNumber: string;
  billDate: string;
  status: BillStatus;
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  notes?: string | null;
  version: number;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  createdBy?: {id: string; fullname: string};
  items?: BillItem[];
  _count?: {items: number};
  // purchase
  supplierName?: string;
  supplierInvoiceNo?: string | null;
  supplierPhone?: string | null;
  // sales
  customerName?: string | null;
  customerPhone?: string | null;
  paymentMethod?: PaymentMethod;
  /** Received at billing; creditAmount is still owed */
  paidAmount?: number;
  creditAmount?: number;
  /** Edits made after the bill was confirmed */
  editCount?: number;
  lastEditedAt?: string | null;
  shop?: {id: string; name: string; code: string};
}

export interface BillListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: BillStatus;
  from?: string;
  to?: string;
}

/** Branch admin: sales bills of every shop in the branch */
export interface BranchSalesParams extends BillListParams {
  shopId?: string;
  paymentMethod?: PaymentMethod;
  flag?: 'EDITED' | 'ON_CREDIT';
}

export interface BranchSalesSummary {
  range: {from: string; to: string};
  kpis: {
    bills: number;
    creditBills: number;
    cancelled: number;
    netSales: number;
    taxAmount: number;
    discount: number;
    discountPct: number;
    onCredit: number;
    edited: number;
  };
  shopCounts: {shopId: string; name: string; bills: number}[];
  cashiers: {
    id: string;
    name: string;
    shop: string;
    bills: number;
    sales: number;
    discount: number;
    edits: number;
    cancels: number;
  }[];
  watch: {
    highDiscount: number;
    edited: number;
    cancelled: number;
    noMobile: number;
  };
}

export interface BillLinePayload {
  variantId: string;
  quantity: number;
  taxRate: number;
  unitCost?: number;
  unitPrice?: number;
  discount?: number;
}

export interface BillPayload {
  billDate?: string;
  discount: number;
  notes?: string;
  items: BillLinePayload[];
  /** create only: DRAFT keeps stock untouched until confirmed */
  status?: 'DRAFT' | 'CONFIRMED';
  /** update only: the version that was loaded (optimistic lock) */
  version?: number;
  supplierName?: string;
  supplierInvoiceNo?: string;
  supplierPhone?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: PaymentMethod;
  paidAmount?: number;
}
