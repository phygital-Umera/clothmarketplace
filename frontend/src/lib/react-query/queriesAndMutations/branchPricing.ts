import {
  getBranchProductPrices,
  saveBranchPrices,
  applyBulkPrice,
  type BulkPriceInput,
  type PriceTab,
} from '@/lib/api/branchPricing';
import {getErrorMessage} from '@/utils/axios';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const PRICING_KEYS = {
  ALL: 'branch_pricing',
  LIST: 'branch_pricing_list',
};

export const useBranchProductPrices = (params?: {
  search?: string;
  categoryId?: string;
  tab?: PriceTab;
}) =>
  useQuery({
    queryKey: [PRICING_KEYS.LIST, params],
    queryFn: () => getBranchProductPrices(params),
    select: (res) => res.data,
  });

export const useSaveBranchPrices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prices: Record<string, number>) => saveBranchPrices(prices),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Branch prices saved successfully');
      queryClient.invalidateQueries({queryKey: [PRICING_KEYS.ALL]});
      queryClient.invalidateQueries({queryKey: [PRICING_KEYS.LIST]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to save prices'));
    },
  });
};

export const useScheduleBulkPrice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkPriceInput) => applyBulkPrice(data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'New prices applied');
      queryClient.invalidateQueries({queryKey: [PRICING_KEYS.ALL]});
      queryClient.invalidateQueries({queryKey: [PRICING_KEYS.LIST]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to schedule bulk price'));
    },
  });
};

