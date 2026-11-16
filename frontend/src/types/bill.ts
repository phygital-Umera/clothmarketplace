export type BillKind = 'purchase' | 'sales';
export type BillStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'CREDIT';
/** Paid in full, partly on credit, or fully on credit */
export type PaymentStatus = 'PAID' | 'PART_CREDIT' | 'CREDIT';
export type SalesBillType =
  | 'TAX_INVOICE_B2C'
  | 'TAX_INVOICE_B2B'
  | 'RETAIL_INVOICE';

export interface BillPayment {
  id: string;
  mode: PaymentMethod;
  amount: number;
  paidAt: string;
  note?: string | null;
  /** UPI transaction id / card last 4 */
  reference?: string | null;
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
  hsnCode?: string | null;
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

/** One GST rate of a bill, split by the server (P4-03) */
export interface GstRow {
  rate: number;
  taxable: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
}

/** GST of a sales bill as the server works it out: CGST + SGST, or IGST across states */
export interface TaxBreakup {
  interState: boolean;
  seller: {code: string | null; name: string | null};
  placeOfSupply: {code: string | null; name: string | null};
  rows: GstRow[];
  taxable: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
}

/** POST /sales-bills/preview: the server's GST per line, totals and breakup */
export interface SalesPreview {
  lines: {
    variantId: string;
    taxRate: number;
    hsnCode: string | null;
    totalPrice: number;
    taxable: number;
    tax: number;
  }[];
  totals: {
    subtotal: number;
    taxAmount: number;
    discount: number;
    roundOff: number;
    totalAmount: number;
  };
  taxBreakup: TaxBreakup;
}

export interface Bill {
  /** Sales: GST per rate, CGST/SGST or IGST (from the server) */
  taxBreakup?: TaxBreakup;
  /** Sales: true when unit prices include GST (tag price); older bills added GST on top */
  pricesIncludeTax?: boolean;
  /** Sales: total rounded to the rupee */
  roundOff?: number;
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
  /** An employee asked to delete this bill; the shop admin deletes or keeps it */
  deleteRequestedAt?: string | null;
  deleteRequestReason?: string | null;
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
  billType?: SalesBillType | null;
  customerGstin?: string | null;
  salesman?: {id: string; fullname: string} | null;
  paidAmount?: number;
  creditAmount?: number;
  editCount?: number;
  lastEditedAt?: string | null;
  shop?: {
    id: string;
    name: string;
    code: string;
    address?: string | null;
    phone?: string | null;
    gstin?: string | null;
  };
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
  /** Only bills an employee asked to delete */
  deleteRequested?: 'true';
}

/** Branch admin: sales bills of every shop in the branch */
export interface BranchSalesParams extends BillListParams {
  shopId?: string;
  paymentMethod?: PaymentMethod;
  flag?: 'EDITED' | 'ON_CREDIT';
}

export interface BranchSalesSummary {
  range: {from: string; to: string};
  /** The company's high-discount level (P4-08) */
  discountApprovalPct?: number;
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
  /** sales: split payment; omitted = whole bill in paymentMethod */
  payments?: {mode: PaymentMethod; amount: number; reference?: string}[];
  dueDate?: string;
  billType?: SalesBillType;
  /** required (valid GSTIN) for TAX_INVOICE_B2B */
  customerGstin?: string;
  salesmanId?: string;
  /** purchase: paid to the supplier now; omitted = paid in full */
  amountPaid?: number;
  paymentMode?: PaymentMethod;
}

export interface RecordPaymentPayload {
  mode: PaymentMethod;
  amount: number;
  note?: string;
}
