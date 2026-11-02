import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  checkoutCustomerOrder,
  cancelCustomerOrder,
  getCustomerOrder,
  getCustomerOrders,
  getOrder,
  getOrderDashboard,
  getOrderReturns,
  getOrders,
  returnCustomerOrder,
  reviewCancellation,
  updateOrderPayment,
  updateOrderShipping,
  updateOrderStatus,
  updateReturnStatus,
} from '@/lib/api/order';
import {
  CreateOrderCheckoutPayload,
  OrderListParams,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ReturnStatus,
} from '@/types/order';

export const ORDER_KEYS = {
  dashboard: (panel: string) => ['orders', panel, 'dashboard'] as const,
  list: (panel: string, params: OrderListParams) => ['orders', panel, 'list', params] as const,
  detail: (panel: string, id: string) => ['orders', panel, 'detail', id] as const,
  returns: (panel: string, params: any) => ['orders', panel, 'returns', params] as const,
  customerList: (params: any) => ['orders', 'customer', 'list', params] as const,
  customerDetail: (id: string) => ['orders', 'customer', 'detail', id] as const,
};

// -------------------------------------------------------------
// ADMIN HOOKS
// -------------------------------------------------------------

export const useOrderDashboard = (panel: string) => {
  return useQuery({
    queryKey: ORDER_KEYS.dashboard(panel),
    queryFn: async () => {
      const res = await getOrderDashboard(panel);
      return res.data;
    },
    enabled: Boolean(panel),
  });
};

export const useOrders = (panel: string, params: OrderListParams) => {
  return useQuery({
    queryKey: ORDER_KEYS.list(panel, params),
    queryFn: async () => {
      const res = await getOrders(panel, params);
      return res.data;
    },
    enabled: Boolean(panel),
  });
};

export const useOrder = (panel: string, id: string | null) => {
  return useQuery({
    queryKey: ORDER_KEYS.detail(panel, id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await getOrder(panel, id);
      return res.data;
    },
    enabled: Boolean(panel && id),
  });
};

export const useUpdateOrderStatus = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        status: OrderStatus;
        comment?: string;
        courierName?: string;
        trackingNumber?: string;
      };
    }) => updateOrderStatus(panel, id, data),
    onSuccess: (_, {id}) => {
      toast.success('Order status updated');
      queryClient.invalidateQueries({queryKey: ['orders']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update order status');
    },
  });
};

export const useUpdateOrderShipping = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        courierName: string;
        trackingNumber: string;
        status?: OrderStatus;
        comment?: string;
      };
    }) => updateOrderShipping(panel, id, data),
    onSuccess: () => {
      toast.success('Shipping & tracking updated');
      queryClient.invalidateQueries({queryKey: ['orders']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update shipping');
    },
  });
};

export const useUpdateOrderPayment = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        paymentStatus: PaymentStatus;
        paymentDetails?: any;
        comment?: string;
      };
    }) => updateOrderPayment(panel, id, data),
    onSuccess: () => {
      toast.success('Payment status updated');
      queryClient.invalidateQueries({queryKey: ['orders']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update payment');
    },
  });
};

export const useReviewCancellation = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        approve: boolean;
        reason?: string;
      };
    }) => reviewCancellation(panel, id, data),
    onSuccess: (_, {data}) => {
      toast.success(
        data.approve
          ? 'Cancellation approved and stock restored to inventory'
          : 'Cancellation rejected'
      );
      queryClient.invalidateQueries({queryKey: ['orders']});
      queryClient.invalidateQueries({queryKey: ['inventory']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to review cancellation');
    },
  });
};

export const useOrderReturns = (
  panel: string,
  params: {page?: number; limit?: number; status?: ReturnStatus}
) => {
  return useQuery({
    queryKey: ORDER_KEYS.returns(panel, params),
    queryFn: async () => {
      const res = await getOrderReturns(panel, params);
      return res.data;
    },
    enabled: Boolean(panel),
  });
};

export const useUpdateReturnStatus = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        returnStatus?: ReturnStatus;
        refundStatus?: RefundStatus;
        notes?: string;
        restock?: boolean;
      };
    }) => updateReturnStatus(panel, id, data),
    onSuccess: () => {
      toast.success('Return status updated');
      queryClient.invalidateQueries({queryKey: ['orders']});
      queryClient.invalidateQueries({queryKey: ['inventory']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update return');
    },
  });
};

// -------------------------------------------------------------
// CUSTOMER HOOKS
// -------------------------------------------------------------

export const useCustomerOrders = (params: {page?: number; limit?: number; status?: string}) => {
  return useQuery({
    queryKey: ORDER_KEYS.customerList(params),
    queryFn: async () => {
      const res = await getCustomerOrders(params);
      return res.data;
    },
  });
};

export const useCustomerOrder = (id: string | null) => {
  return useQuery({
    queryKey: ORDER_KEYS.customerDetail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await getCustomerOrder(id);
      return res.data;
    },
    enabled: Boolean(id),
  });
};

export const useCheckoutCustomerOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderCheckoutPayload) => checkoutCustomerOrder(data),
    onSuccess: () => {
      toast.success('Order placed successfully!');
      queryClient.invalidateQueries({queryKey: ['orders']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    },
  });
};

export const useCancelCustomerOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, reason}: {id: string; reason: string}) => cancelCustomerOrder(id, reason),
    onSuccess: () => {
      toast.success('Cancellation request submitted to shop');
      queryClient.invalidateQueries({queryKey: ['orders']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to request cancellation');
    },
  });
};

export const useReturnCustomerOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {reason: string; description?: string; returnItems?: any[]};
    }) => returnCustomerOrder(id, data),
    onSuccess: () => {
      toast.success('Return request submitted');
      queryClient.invalidateQueries({queryKey: ['orders']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to request return');
    },
  });
};

