import {
  getBranchPurchase,
  getBranchPurchases,
  getBranchPurchaseSummary,
} from '@/lib/api/branchPurchase';
import {BranchPurchaseQuery} from '@/types/branchPurchase';
import {keepPreviousData, useQuery} from '@tanstack/react-query';

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

export const useBranchPurchaseSummary = (month?: string) =>
  useQuery({
    queryKey: [BRANCH_PURCHASE_KEYS.SUMMARY, month],
    queryFn: () => getBranchPurchaseSummary(month),
    select: (res) => res.data,
  });

export const useBranchPurchase = (id?: string) =>
  useQuery({
    queryKey: [BRANCH_PURCHASE_KEYS.DETAIL, id],
    queryFn: () => getBranchPurchase(id!),
    select: (res) => res.data,
    enabled: !!id,
  });
