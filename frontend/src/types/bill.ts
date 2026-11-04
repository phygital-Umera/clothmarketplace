export type BillKind = 'purchase' | 'sales';
export type BillStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI';
/** Paid in full, partly on credit, or fully on credit */
export type PaymentStatus = 'PAID' | 'PART_CREDIT' | 'CREDIT';

export interface BillPayment {
  id: string;
  mode: PaymentMethod;
  amount: number;
  paidAt: string;
  note?: string | null;
  /** true = taken when the bill was saved; false = collected / paid later */
  atBilling: boolean;
}

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
  /** sales: quantities already returned on credit notes */
  returnItems?: {quantity: number}[];
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
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  dueDate?: string | null;
  payments?: BillPayment[];
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
  /** CREDIT when nothing was paid at billing */
  paymentMethod?: PaymentMethod | 'CREDIT';
  returns?: {
    id: string;
    returnNumber: string;
    totalAmount: number;
    returnDate: string;
  }[];
}

export interface BillListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: BillStatus;
  from?: string;
  to?: string;
  /** DUE = part credit or credit */
  paymentStatus?: PaymentStatus | 'DUE';
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
  /** sales: split payment; omitted = whole bill in paymentMethod */
  payments?: {mode: PaymentMethod; amount: number}[];
  dueDate?: string;
  /** purchase: paid to the supplier now; omitted = paid in full */
  amountPaid?: number;
  paymentMode?: PaymentMethod;
}

export interface RecordPaymentPayload {
  mode: PaymentMethod;
  amount: number;
  note?: string;
}
