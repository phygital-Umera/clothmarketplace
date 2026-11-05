import {
  getBillItemsForLabels,
  getPurchaseBillsForLabels,
  getReprintBatches,
  recordPrintJob,
  searchProductsForLabels,
} from '@/lib/api/barcodeLabel';
import {PrintJobPayload} from '@/types/barcodeLabel';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const barcodeLabelKeys = {
  all: ['barcode-labels'] as const,
  bills: (panel: string) => [...barcodeLabelKeys.all, 'bills', panel] as const,
  billItems: (panel: string, billId?: string | null) =>
    [...barcodeLabelKeys.all, 'billItems', panel, billId ?? ''] as const,
  products: (panel: string, search?: string) =>
    [...barcodeLabelKeys.all, 'products', panel, search ?? ''] as const,
  reprints: (panel: string) => [...barcodeLabelKeys.all, 'reprints', panel] as const,
};

export const usePurchaseBillsForLabels = (panel: string = 'shop-admin') =>
  useQuery({
    queryKey: barcodeLabelKeys.bills(panel),
    queryFn: () => getPurchaseBillsForLabels(panel),
    staleTime: 30_000,
  });

export const useBillItemsForLabels = (panel: string = 'shop-admin', billId?: string | null) =>
  useQuery({
    queryKey: barcodeLabelKeys.billItems(panel, billId),
    queryFn: () => {
      if (!billId) return null;
      return getBillItemsForLabels(panel, billId);
    },
    enabled: !!billId,
  });

export const useProductsForLabels = (panel: string = 'shop-admin', search?: string) =>
  useQuery({
    queryKey: barcodeLabelKeys.products(panel, search),
    queryFn: () => searchProductsForLabels(panel, search),
    staleTime: 30_000,
  });

export const useReprintBatches = (panel: string = 'shop-admin') =>
  useQuery({
    queryKey: barcodeLabelKeys.reprints(panel),
    queryFn: () => getReprintBatches(panel),
  });

export const useRecordPrintJob = (panel: string = 'shop-admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PrintJobPayload) => recordPrintJob(panel, payload),
    onSuccess: (data: any) => {
      const msg = data?.message || 'Print job queued successfully';
      toast.success(msg);
      queryClient.invalidateQueries({queryKey: barcodeLabelKeys.reprints(panel)});
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to queue print job';
      toast.error(msg);
    },
  });
};

