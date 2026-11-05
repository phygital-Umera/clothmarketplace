export type AdjustmentType = 'INCREASE' | 'DECREASE' | 'MARK_DAMAGED' | 'WRITE_OFF';

export interface AdjustmentVariantOption {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color?: string;
  sku: string;
  currentAvailable: number;
  damaged: number;
  label: string;
  subtext: string;
}

export interface StockAdjustmentHistoryRow {
  id: string;
  ref: string;
  date: string;
  variantName: string;
  variantSubtext: string;
  type: string;
  typeKey: AdjustmentType;
  qty: string;
  qtyRaw: number;
  reason: string;
  by: string;
  approvalStatus: 'AUTO' | 'APPROVED' | 'PENDING' | 'REJECTED';
  reference?: string;
  photoUrl?: string | null;
}

export interface CreateStockAdjustmentPayload {
  variantId: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  reference?: string;
  photoUrl?: string | null;
  notes?: string;
}

