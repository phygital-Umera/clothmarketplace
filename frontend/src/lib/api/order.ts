import {api} from '@/utils/axios';
import {
  CreateOrderCheckoutPayload,
  Order,
  OrderDashboardData,
  OrderListParams,
  OrderStatus,
  PaymentStatus,
  ReturnRequestItem,
  ReturnStatus,
  RefundStatus,
} from '@/types/order';

// -------------------------------------------------------------
// ADMIN ORDER APIS
// -------------------------------------------------------------

export const getOrderDashboard = (panel: string) =>
  (api.get(
    `/${panel}/orders/dashboard`
  ) as unknown as Promise<{statusCode: number; data: OrderDashboardData; message: string}>);

export const getOrders = (panel: string, params: OrderListParams) =>
  (api.get(
    `/${panel}/orders`,
    {params}
  ) as unknown as Promise<{statusCode: number; data: {items: Order[]; pagination: any}; message: string}>);

export const getOrder = (panel: string, id: string) =>
  (api.get(
    `/${panel}/orders/${id}`
  ) as unknown as Promise<{statusCode: number; data: Order; message: string}>);

export const updateOrderStatus = (
  panel: string,
  id: string,
  data: {
    status: OrderStatus;
    comment?: string;
    courierName?: string;
    trackingNumber?: string;
  }
) =>
  (api.patch(
    `/${panel}/orders/${id}/status`,
    data
  ) as unknown as Promise<{statusCode: number; data: Order; message: string}>);

export const updateOrderShipping = (
  panel: string,
  id: string,
  data: {
    courierName: string;
    trackingNumber: string;
    status?: OrderStatus;
    comment?: string;
  }
) =>
  (api.patch(
    `/${panel}/orders/${id}/shipping`,
    data
  ) as unknown as Promise<{statusCode: number; data: Order; message: string}>);

export const updateOrderPayment = (
  panel: string,
  id: string,
  data: {
    paymentStatus: PaymentStatus;
    paymentDetails?: any;
    comment?: string;
  }
) =>
  (api.patch(
    `/${panel}/orders/${id}/payment`,
    data
  ) as unknown as Promise<{statusCode: number; data: Order; message: string}>);

export const reviewCancellation = (
  panel: string,
  id: string,
  data: {
    approve: boolean;
    reason?: string;
  }
) =>
  (api.post(
    `/${panel}/orders/${id}/cancel-review`,
    data
  ) as unknown as Promise<{statusCode: number; data: Order; message: string}>);

export const getOrderReturns = (
  panel: string,
  params: {page?: number; limit?: number; status?: ReturnStatus}
) =>
  (api.get(
    `/${panel}/returns`,
    {params}
  ) as unknown as Promise<{statusCode: number; data: {items: ReturnRequestItem[]; pagination: any}; message: string}>);

export const updateReturnStatus = (
  panel: string,
  id: string,
  data: {
    returnStatus?: ReturnStatus;
    refundStatus?: RefundStatus;
    notes?: string;
    restock?: boolean;
  }
) =>
  (api.patch(
    `/${panel}/returns/${id}`,
    data
  ) as unknown as Promise<{statusCode: number; data: ReturnRequestItem; message: string}>);

export const getOrderInvoiceData = (panel: string, id: string) =>
  (api.get(
    `/${panel}/orders/${id}/invoice`
  ) as unknown as Promise<{statusCode: number; data: Order; message: string}>);

// -------------------------------------------------------------
// CUSTOMER ORDER APIS
// -------------------------------------------------------------

export const checkoutCustomerOrder = (data: CreateOrderCheckoutPayload) =>
  (api.post(
    '/users/orders/checkout',
    data
  ) as unknown as Promise<{statusCode: number; data: Order; message: string}>);

export const getCustomerOrders = (params: {page?: number; limit?: number; status?: string}) =>
  (api.get(
    '/users/orders',
    {params}
  ) as unknown as Promise<{statusCode: number; data: {items: Order[]; pagination: any}; message: string}>);

export const getCustomerOrder = (id: string) =>
  (api.get(
    `/users/orders/${id}`
  ) as unknown as Promise<{statusCode: number; data: Order; message: string}>);

export const cancelCustomerOrder = (id: string, reason: string) =>
  (api.post(
    `/users/orders/${id}/cancel`,
    {reason}
  ) as unknown as Promise<{statusCode: number; data: Order; message: string}>);

export const returnCustomerOrder = (
  id: string,
  data: {reason: string; description?: string; returnItems?: any[]}
) =>
  (api.post(
    `/users/orders/${id}/return`,
    data
  ) as unknown as Promise<{statusCode: number; data: ReturnRequestItem; message: string}>);

