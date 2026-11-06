import {
  createSupplier,
  getNextReceipt,
  getSupplierLedger,
  getSuppliers,
  recordSupplierPayment,
} from '@/lib/api/supplier';
import {
  CreateSupplierPayload,
  RecordSupplierPaymentPayload,
} from '@/types/supplier';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const supplierKeys = {
  all: ['suppliers'] as const,
  list: (panel: string, search?: string) =>
    [...supplierKeys.all, 'list', panel, search ?? ''] as const,
  ledger: (panel: string, supplierId?: string | null) =>
    [...supplierKeys.all, 'ledger', panel, supplierId ?? ''] as const,
  nextReceipt: (panel: string) =>
    [...supplierKeys.all, 'nextReceipt', panel] as const,
};

export const useSuppliers = (panel: string = 'shop-admin', search?: string) =>
  useQuery({
    queryKey: supplierKeys.list(panel, search),
    queryFn: () => getSuppliers(panel, search),
    staleTime: 30_000,
  });

export const useSupplierLedger = (
  panel: string = 'shop-admin',
  supplierId?: string | null,
) =>
  useQuery({
    queryKey: supplierKeys.ledger(panel, supplierId),
    queryFn: () => {
      if (!supplierId) return null;
      return getSupplierLedger(panel, supplierId);
    },
    enabled: !!supplierId,
  });

export const useNextReceipt = (panel: string = 'shop-admin') =>
  useQuery({
    queryKey: supplierKeys.nextReceipt(panel),
    queryFn: () => getNextReceipt(panel),
  });

export const useCreateSupplier = (panel: string = 'shop-admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => createSupplier(panel, payload),
    onSuccess: (_data, payload) => {
      toast.success(`Supplier "${payload.name}" added`);
      queryClient.invalidateQueries({queryKey: supplierKeys.all});
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create supplier';
      toast.error(msg);
    },
  });
};

export const useRecordSupplierPayment = (panel: string = 'shop-admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordSupplierPaymentPayload) =>
      recordSupplierPayment(panel, payload),
    onSuccess: (data: any) => {
      const msg = data?.message || 'Payment recorded successfully';
      toast.success(msg);
      queryClient.invalidateQueries({queryKey: supplierKeys.all});
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record payment';
      toast.error(msg);
    },
  });
};

