// Stock transfer between the shops of a branch

export type TransferStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISPATCHED'
  | 'RECEIVED'
  | 'SHORT';

export const TRANSFER_REASONS = [
  'Low stock',
  'Customer order',
  'Festival / season demand',
  'Display / new arrivals',
  'Balancing slow stock',
  'Other',
] as const;

export type ShopRef = {id: string; name: string; code: string};

export type TransferItem = {
  id: string;
  productName: string;
  variantSku: string;
  size: string;
  color: string;
  requestedQty: number;
  approvedQty: number | null;
  dispatchedQty: number | null;
  receivedQty: number | null;
  destVariantId: string | null;
  sourceVariantId: string | null;
};

export type StockTransfer = {
  id: string;
  transferNumber: string;
  status: TransferStatus;
  reason: string;
  note: string | null;
  neededBy: string | null;
  createdAt: string;
  fromShop: ShopRef | null;
  toShop: ShopRef;
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  dispatchedBy: string | null;
  dispatchedAt: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  receiveNote: string | null;
  units: number;
  requestedUnits: number;
  shortUnits: number;
  items: TransferItem[];
};

export type ShopTransferList = {
  shopId: string;
  items: StockTransfer[];
  counts: {toDispatch: number; incoming: number; pending: number};
};

export type TransferVariant = {
  variantId: string;
  own: boolean;
  ownerShopId: string | null;
  productName: string;
  variantSku: string;
  size: string;
  color: string;
  have: number;
  threshold: number;
  sold30: number;
  elsewhere: {shopId: string; shopName: string; qty: number; variantId: string} | null;
  suggestedQty: number;
};

export type CreateTransferPayload = {
  fromShopId: string | null;
  neededBy?: string;
  reason: string;
  note?: string;
  items: Array<{variantId: string; qty: number}>;
};

export type TransferSummary = {
  toApprove: number;
  toDispatch: number;
  inTransit: number;
  discrepancies: number;
};

export type SourceOption = ShopRef & {
  items: Array<{itemId: string; variantId: string | null; available: number}>;
};

export type TransferDecision = {
  decision: 'APPROVE' | 'REJECT';
  fromShopId?: string;
  items?: Array<{itemId: string; approvedQty: number}>;
  reason?: string;
};
