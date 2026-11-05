import {
  createPurchaseReturn,
  getBillsBySupplier,
  getEarlierReturns,
  getNextDebitNoteNumber,
  getPurchaseReturn,
  getReturnSuppliers,
} from '@/lib/api/purchaseReturn';
import {CreatePurchaseReturnPayload} from '@/types/purchaseReturn';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const purchaseReturnKeys = {
  all: ['purchaseReturn'] as const,
  nextNumber: (panel: string) => [...purchaseReturnKeys.all, 'nextNumber', panel] as const,
  suppliers: (panel: string) => [...purchaseReturnKeys.all, 'suppliers', panel] as const,
  bills: (panel: string, supplierName?: string) =>
    [...purchaseReturnKeys.all, 'bills', panel, supplierName ?? ''] as const,
  earlier: (panel: string) => [...purchaseReturnKeys.all, 'earlier', panel] as const,
  single: (panel: string, id: string) => [...purchaseReturnKeys.all, 'single', panel, id] as const,
};

export const useNextDebitNoteNumber = (panel: string = 'shop-admin') =>
  useQuery({
    queryKey: purchaseReturnKeys.nextNumber(panel),
    queryFn: () => getNextDebitNoteNumber(panel),
  });

export const useReturnSuppliers = (panel: string = 'shop-admin') =>
  useQuery({
    queryKey: purchaseReturnKeys.suppliers(panel),
    queryFn: () => getReturnSuppliers(panel),
  });

export const useBillsBySupplier = (panel: string = 'shop-admin', supplierName?: string) =>
  useQuery({
    queryKey: purchaseReturnKeys.bills(panel, supplierName),
    queryFn: () => getBillsBySupplier(panel, supplierName),
  });

export const useEarlierReturns = (panel: string = 'shop-admin') =>
  useQuery({
    queryKey: purchaseReturnKeys.earlier(panel),
    queryFn: () => getEarlierReturns(panel),
  });

export const useCreatePurchaseReturn = (panel: string = 'shop-admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchaseReturnPayload) => createPurchaseReturn(panel, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: purchaseReturnKeys.all});
      queryClient.invalidateQueries({queryKey: ['bills']});
      queryClient.invalidateQueries({queryKey: ['inventory']});
      queryClient.invalidateQueries({queryKey: ['shopDashboard']});
    },
  });
};

export const usePurchaseReturn = (panel: string = 'shop-admin', id: string) =>
  useQuery({
    queryKey: purchaseReturnKeys.single(panel, id),
    queryFn: () => getPurchaseReturn(panel, id),
    enabled: !!id,
  });

