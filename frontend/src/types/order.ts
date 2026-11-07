export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type ReturnStatus =
  | 'REQUESTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'COMPLETED';

export type RefundStatus =
  | 'NONE'
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSED'
  | 'REJECTED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName?: string;
  variantSku?: string;
  size?: string;
  color?: string;
  image?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    images?: Array<{id: string; url: string}>;
  };
  variant?: {
    id: string;
    size: string;
    color: string;
    variantSku: string;
    image?: string;
  };
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  status: OrderStatus;
  comment?: string;
  updatedById?: string;
  updatedBy?: {
    id: string;
    fullname: string;
    role: string;
  };
  createdAt: string;
}

export interface CustomerShippingAddress {
  recipient: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  district?: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface ReturnRequestItem {
  id: string;
  orderId: string;
  customerId: string;
  companyId: string;
  shopId?: string;
  reason: string;
  description?: string;
  returnStatus: ReturnStatus;
  refundAmount?: number;
  refundStatus: RefundStatus;
  notes?: string;
  returnItems?: any;
  /** What the customer wants: money back or another size/colour */
  resolution?: 'REFUND' | 'EXCHANGE';
  exchangeFor?: string | null;
  images?: string[];
  /** The items actually being returned */
  lines?: {orderItemId: string; name: string; size?: string | null; color?: string | null; image?: string | null; unitPrice: number; quantity: number}[];
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    fullname: string;
    phoneNumber?: string;
    email?: string;
  };
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    branch?: {id: string; name: string};
    shop?: {id: string; name: string};
    items?: OrderItem[];
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: {
    id: string;
    fullname: string;
    email?: string;
    phoneNumber: string;
    address?: string;
  };
  companyId: string;
  company?: {id: string; name: string; code?: string};
  branchId: string;
  branch?: {id: string; name: string; code?: string};
  shopId?: string;
  shop?: {id: string; name: string; code?: string; phone?: string; address?: string};

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string; // 'COD' | 'ONLINE'

  subtotal: number;
  discount: number;
  couponDiscount: number;
  tax: number;
  shippingFee: number;
  totalAmount: number;

  shippingAddress: CustomerShippingAddress | any;
  courierName?: string;
  trackingNumber?: string;
  notes?: string;

  // Cancellation
  cancelReason?: string;
  cancelRequested: boolean;
  cancelRequestedAt?: string;
  cancelApproved?: boolean | null;
  cancelRejectionReason?: string;

  paymentDetails?: {
    transactionId?: string;
    provider?: string;
    paidAt?: string;
    refundId?: string;
    refundAmount?: number;
    notes?: string;
  };

  createdAt: string;
  updatedAt: string;

  items: OrderItem[];
  statusHistory?: OrderStatusHistoryItem[];
  returns?: ReturnRequestItem[];
  couponCode?: string;
  couponUsages?: any[];
}

export interface OrderDashboardData {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  packedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  cancellationRequests: number;
  returnRequests: number;
  totalRevenue: number;
  recentOrders: Order[];
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  cancellationPending?: boolean;
}

export interface CreateOrderCheckoutPayload {
  shopId?: string;
  branchId?: string;
  companyId?: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  shippingAddress: CustomerShippingAddress;
  paymentMethod: 'COD' | 'ONLINE';
  paymentDetails?: any;
  couponCode?: string;
  notes?: string;
}

