import {api} from '@/utils/axios';
import {
  BranchPurchaseBill,
  BranchPurchaseQuery,
  BranchPurchaseSummary,
} from '@/types/branchPurchase';

type Res<T> = {statusCode: number; data: T; message: string};
type Pagination = {total: number; page: number; limit: number; pages: number};

export const getBranchPurchases = (params: BranchPurchaseQuery) =>
  (api.get('/branch-admin/purchase-bills', {
      params,
    }) as unknown as Promise<Res<{items: BranchPurchaseBill[]; pagination: Pagination}>>);

export const getBranchPurchaseSummary = (month?: string) =>
  (api.get('/branch-admin/purchase-bills/summary', {params: {month}}) as unknown as Promise<Res<BranchPurchaseSummary>>);

export const getBranchPurchase = (id: string) =>
  (api.get(`/branch-admin/purchase-bills/${id}`) as unknown as Promise<Res<BranchPurchaseBill>>);
