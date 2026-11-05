export type StockTab = 'STOCK_SUMMARY' | 'LOW_OUT' | 'DAMAGED' | 'SLOW_MOVING';

export type StockPeriod = 'today' | 'this-week' | 'this-month' | 'last-30-days' | 'all-time';

export interface StockMetricSellable {
  pcs: number;
  pcsFormatted: string;
  itemSizes: number;
  itemSizesFormatted: string;
}

export interface StockMetricValueCost {
  costValue: number;
  costValueFormatted: string;
  mrpValue: number;
  mrpValueFormatted: string;
}

export interface StockMetricDamaged {
  pcs: number;
  pcsFormatted: string;
  returnToSupplier: number;
  returnToSupplierFormatted: string;
}

export interface StockMetricLowOut {
  lowCount: number;
  outCount: number;
  formatted: string;
  subtext: string;
}

export interface StockMetricSlowMovers {
  count: number;
  formatted: string;
  days: number;
  subtext: string;
}

export interface StockMetrics {
  sellableStock: StockMetricSellable;
  valueAtCost: StockMetricValueCost;
  damaged: StockMetricDamaged;
  lowOut: StockMetricLowOut;
  slowMovers: StockMetricSlowMovers;
}

export interface StockCounts {
  all: number;
  lowOut: number;
  damaged: number;
  slowMoving: number;
}

export interface StockItemRow {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color?: string;
  barcode: string;
  opening: number;
  purchase: number;
  sold: number;
  salesReturn: number;
  transfer: number;
  adjust: number;
  closing: number;
  costPrice: number;
  mrp: number;
  sellingPrice: number;
  valueCost: number;
  threshold: number;
  damagedQty: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  isSlowMoving: boolean;
  daysWithoutSale: number;
}

export interface StockSummaryResponse {
  dateRangeLabel: string;
  metrics: StockMetrics;
  counts: StockCounts;
  items: StockItemRow[];
}

export interface AdjustStockPayload {
  variantId: string;
  type: 'INCREASE' | 'DECREASE' | 'CORRECTION' | 'DAMAGE';
  quantity: number;
  reason: string;
  notes?: string;
}

export interface PhysicalStockCountItem {
  variantId: string;
  systemQty: number;
  countedQty: number;
  reason?: string;
}

export interface PhysicalStockCountPayload {
  notes?: string;
  items: PhysicalStockCountItem[];
}

