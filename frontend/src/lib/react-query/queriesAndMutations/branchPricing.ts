import {getBranchProductPrices, type PriceTab} from '@/lib/api/branchPricing';
import {useQuery} from '@tanstack/react-query';

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
