import {
  createCustomer,
  getCustomer,
  getCustomers,
  importCustomers,
  updateCustomer,
} from '@/lib/api/customer';
import {
  CreateCustomerPayload,
  CustomerListParams,
  UpdateCustomerPayload,
} from '@/types/customer';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const CUSTOMER_KEYS = {
  ALL: ['customers'] as const,
  LIST: (panel: string, params?: CustomerListParams) =>
    [...CUSTOMER_KEYS.ALL, panel, 'list', params] as const,
  DETAIL: (panel: string, id: string) =>
    [...CUSTOMER_KEYS.ALL, panel, 'detail', id] as const,
};

export const useCustomers = (panel: string, params?: CustomerListParams) =>
  useQuery({
    queryKey: CUSTOMER_KEYS.LIST(panel, params),
    queryFn: () => getCustomers(panel, params),
    select: (res) => res.data,
  });

export const useCustomer = (panel: string, id: string) =>
  useQuery({
    queryKey: CUSTOMER_KEYS.DETAIL(panel, id),
    queryFn: () => getCustomer(panel, id),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useCreateCustomer = (panel: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerPayload) => createCustomer(panel, data),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: CUSTOMER_KEYS.ALL});
      toast.success('Customer added successfully');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to add customer',
      );
    },
  });
};

export const useUpdateCustomer = (panel: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: {id: string; data: UpdateCustomerPayload}) =>
      updateCustomer(panel, id, data),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: CUSTOMER_KEYS.ALL});
      toast.success('Customer updated successfully');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to update customer',
      );
    },
  });
};

export const useImportCustomers = (panel: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: any[]) => importCustomers(panel, rows),
    onSuccess: (res) => {
      qc.invalidateQueries({queryKey: CUSTOMER_KEYS.ALL});
      toast.success(res?.message || 'Customers imported successfully');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to import customers',
      );
    },
  });
};

