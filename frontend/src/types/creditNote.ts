export type ReturnSettlement = 'REFUND' | 'EXCHANGE' | 'STORE_CREDIT';
export type CreditNoteStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type ReturnStockTo = 'RESTOCK' | 'DAMAGED';
export type ReturnReason =
  | 'DEFECTIVE'
  | 'SIZE'
  | 'COLOUR'
  | 'CHANGED_MIND'
  | 'OTHER';
export type RefundMode = 'CASH' | 'CARD' | 'UPI';
export type CreditNoteTab =
  | 'NEEDS_APPROVAL'
  | 'EXCHANGE'
  | 'STORE_CREDIT'
  | 'REFUNDED'
  | 'REJECTED';

export const REASON_LABEL: Record<ReturnReason, string> = {
  DEFECTIVE: 'Defective',
  SIZE: 'Size',
  COLOUR: 'Colour',
  CHANGED_MIND: 'Changed mind',
  OTHER: 'Other',
};

export const SETTLEMENT_LABEL: Record<ReturnSettlement, string> = {
  REFUND: 'Refund',
  EXCHANGE: 'Exchange',
  STORE_CREDIT: 'Store credit',
};

export const STOCK_TO_LABEL: Record<ReturnStockTo, string> = {
  RESTOCK: 'Back to shop stock',
  DAMAGED: 'Damaged → return to supplier',
};

export const REFUND_MODE_LABEL: Record<RefundMode, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
};

export interface CreditNoteItem {
  id: string;
  salesBillItemId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  productName: string | null;
  variantSku: string | null;
  size: string | null;
  color: string | null;
}

export interface CreditNote {
  id: string;
  noteNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  settlement: ReturnSettlement;
  refundMode: RefundMode | null;
  reason: ReturnReason;
  reasonNote: string | null;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: CreditNoteStatus;
  needsApproval: boolean;
  stockTo: ReturnStockTo | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  shop: {id: string; name: string; code: string};
  salesBill: {
    id: string;
    billNumber: string;
    billDate: string;
    paymentMethod: string;
  };
  createdBy: {id: string; fullname: string};
  decidedBy: {id: string; fullname: string} | null;
  items: CreditNoteItem[];
}

export interface CreditNoteListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  tab?: CreditNoteTab;
  shopId?: string;
}

export interface CreditNoteSummary {
  approvalLimit: number;
  month: {notes: number; value: number; exchanged: number; returnRate: number};
  storeCredit: {open: number; customers: number};
  approvals: {pending: number; cashPending: number};
  tabs: {
    all: number;
    needsApproval: number;
    exchange: number;
    storeCredit: number;
    refunded: number;
    rejected: number;
  };
}

/** A line of a sales bill with what can still be returned */
export interface ReturnableLine {
  id: string;
  productName: string | null;
  variantSku: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  totalPrice: number;
  taxRate: number;
  returned: number;
  returnable: number;
}

export interface ReturnableBill {
  id: string;
  billNumber: string;
  billDate: string;
  customerName: string | null;
  customerPhone: string | null;
  paymentMethod: string;
  totalAmount: number;
  items: ReturnableLine[];
}

export interface CreateCreditNotePayload {
  salesBillId: string;
  settlement: ReturnSettlement;
  refundMode?: RefundMode;
  reason: ReturnReason;
  reasonNote?: string;
  stockTo: ReturnStockTo;
  items: {salesBillItemId: string; quantity: number}[];
}

export interface DecideCreditNotePayload {
  action: 'APPROVE' | 'STORE_CREDIT' | 'REJECT';
  stockTo: ReturnStockTo;
  note?: string;
}
