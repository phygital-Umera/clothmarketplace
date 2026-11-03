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
  api.get<{statusCode: number; data: OrderDashboardData; message: string}>(
    `/${panel}/orders/dashboard`
  ).then((res: any) => res);

export const getOrders = (panel: string, params: OrderListParams) =>
  api.get<{statusCode: number; data: {items: Order[]; pagination: any}; message: string}>(
    `/${panel}/orders`,
    {params}
  ).then((res: any) => res);

export const getOrder = (panel: string, id: string) =>
  api.get<{statusCode: number; data: Order; message: string}>(
    `/${panel}/orders/${id}`
  ).then((res: any) => res);

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
  api.patch<{statusCode: number; data: Order; message: string}>(
    `/${panel}/orders/${id}/status`,
    data
  ).then((res: any) => res);

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
  api.patch<{statusCode: number; data: Order; message: string}>(
    `/${panel}/orders/${id}/shipping`,
    data
  ).then((res: any) => res);

export const updateOrderPayment = (
  panel: string,
  id: string,
  data: {
    paymentStatus: PaymentStatus;
    paymentDetails?: any;
    comment?: string;
  }
) =>
  api.patch<{statusCode: number; data: Order; message: string}>(
    `/${panel}/orders/${id}/payment`,
    data
  ).then((res: any) => res);

export const reviewCancellation = (
  panel: string,
  id: string,
  data: {
    approve: boolean;
    reason?: string;
  }
) =>
  api.post<{statusCode: number; data: Order; message: string}>(
    `/${panel}/orders/${id}/cancel-review`,
    data
  ).then((res: any) => res);

export const getOrderReturns = (
  panel: string,
  params: {page?: number; limit?: number; status?: ReturnStatus}
) =>
  api.get<{statusCode: number; data: {items: ReturnRequestItem[]; pagination: any}; message: string}>(
    `/${panel}/returns`,
    {params}
  ).then((res: any) => res);

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
  api.patch<{statusCode: number; data: ReturnRequestItem; message: string}>(
    `/${panel}/returns/${id}`,
    data
  ).then((res: any) => res);

export const getOrderInvoiceData = (panel: string, id: string) =>
  api.get<{statusCode: number; data: Order; message: string}>(
    `/${panel}/orders/${id}/invoice`
  ).then((res: any) => res);

// -------------------------------------------------------------
// CUSTOMER ORDER APIS
// -------------------------------------------------------------

export const checkoutCustomerOrder = (data: CreateOrderCheckoutPayload) =>
  api.post<{statusCode: number; data: Order; message: string}>(
    '/users/orders/checkout',
    data
  ).then((res: any) => res);

export const getCustomerOrders = (params: {page?: number; limit?: number; status?: string}) =>
  api.get<{statusCode: number; data: {items: Order[]; pagination: any}; message: string}>(
    '/users/orders',
    {params}
  ).then((res: any) => res);

export const getCustomerOrder = (id: string) =>
  api.get<{statusCode: number; data: Order; message: string}>(
    `/users/orders/${id}`
  ).then((res: any) => res);

export const cancelCustomerOrder = (id: string, reason: string) =>
  api.post<{statusCode: number; data: Order; message: string}>(
    `/users/orders/${id}/cancel`,
    {reason}
  ).then((res: any) => res);

export const returnCustomerOrder = (
  id: string,
  data: {reason: string; description?: string; returnItems?: any[]}
) =>
  api.post<{statusCode: number; data: ReturnRequestItem; message: string}>(
    `/users/orders/${id}/return`,
    data
  ).then((res: any) => res);

