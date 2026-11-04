import {
  createBranchPurchase,
  getBranchPurchase,
  getBranchPurchases,
  getBranchPurchaseSummary,
} from '@/lib/api/branchPurchase';
import {
  BranchPurchaseQuery,
  NewBranchPurchasePayload,
} from '@/types/branchPurchase';
import {getErrorMessage} from '@/utils/axios';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const BRANCH_PURCHASE_KEYS = {
  ALL: 'branch_purchases',
  LIST: 'branch_purchases_list',
  SUMMARY: 'branch_purchases_summary',
  DETAIL: 'branch_purchase_detail',
};

export const useBranchPurchases = (params: BranchPurchaseQuery) =>
  useQuery({
    queryKey: [BRANCH_PURCHASE_KEYS.LIST, params],
    queryFn: () => getBranchPurchases(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useBranchPurchaseSummary = () =>
  useQuery({
    queryKey: [BRANCH_PURCHASE_KEYS.SUMMARY],
    queryFn: getBranchPurchaseSummary,
    select: (res) => res.data,
  });

export const useBranchPurchase = (id?: string) =>
  useQuery({
    queryKey: [BRANCH_PURCHASE_KEYS.DETAIL, id],
    queryFn: () => getBranchPurchase(id!),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useCreateBranchPurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewBranchPurchasePayload) => createBranchPurchase(data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Branch purchase saved successfully');
      queryClient.invalidateQueries({queryKey: [BRANCH_PURCHASE_KEYS.ALL]});
      queryClient.invalidateQueries({queryKey: [BRANCH_PURCHASE_KEYS.LIST]});
      queryClient.invalidateQueries({queryKey: [BRANCH_PURCHASE_KEYS.SUMMARY]});
      queryClient.invalidateQueries({queryKey: ['shop_bills']});
      queryClient.invalidateQueries({queryKey: ['inventory']});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to save purchase bill'));
    },
  });
};

