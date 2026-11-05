import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  getNextAdjustmentNumber,
  getAdjustmentVariants,
  getAdjustmentHistory,
  createStockAdjustment,
} from '@/lib/api/stockAdjustment';
import {CreateStockAdjustmentPayload} from '@/types/stockAdjustment';

export const ADJUSTMENT_KEYS = {
  all: ['stock-adjustments'] as const,
  nextNumber: (panel: string) => [...ADJUSTMENT_KEYS.all, 'next-number', panel] as const,
  variants: (panel: string, search?: string) =>
    [...ADJUSTMENT_KEYS.all, 'variants', panel, search] as const,
  history: (panel: string, type?: string, search?: string) =>
    [...ADJUSTMENT_KEYS.all, 'history', panel, type, search] as const,
};

export const useNextAdjustmentNumber = (panel: string = 'shop-admin') =>
  useQuery({
    queryKey: ADJUSTMENT_KEYS.nextNumber(panel),
    queryFn: () => getNextAdjustmentNumber(panel),
    staleTime: 30_000,
  });

export const useAdjustmentVariants = (panel: string = 'shop-admin', search?: string) =>
  useQuery({
    queryKey: ADJUSTMENT_KEYS.variants(panel, search),
    queryFn: () => getAdjustmentVariants(panel, search),
    staleTime: 60_000,
  });

export const useAdjustmentHistory = (
  panel: string = 'shop-admin',
  params?: {
    type?: string;
    search?: string;
  }
) =>
  useQuery({
    queryKey: ADJUSTMENT_KEYS.history(panel, params?.type, params?.search),
    queryFn: () => getAdjustmentHistory(panel, params),
    staleTime: 15_000,
  });

export const useCreateStockAdjustment = (panel: string = 'shop-admin') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStockAdjustmentPayload) =>
      createStockAdjustment(panel, payload),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: ADJUSTMENT_KEYS.all});
      qc.invalidateQueries({queryKey: ['stock']});
    },
  });
};

