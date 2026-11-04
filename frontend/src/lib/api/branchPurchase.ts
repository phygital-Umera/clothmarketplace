import {api} from '@/utils/axios';
import {
  BranchPurchaseBill,
  BranchPurchaseQuery,
  BranchPurchaseSummary,
  NewBranchPurchasePayload,
} from '@/types/branchPurchase';

type Res<T> = {statusCode: number; data: T; message: string};

export const getBranchPurchases = (params: BranchPurchaseQuery) =>
  api
    .get<Res<{items: BranchPurchaseBill[]; pagination: any}>>('/branch-admin/purchase-bills', {
      params,
    })
    .then((res: any) => res);

export const getBranchPurchaseSummary = () =>
  api
    .get<Res<BranchPurchaseSummary>>('/branch-admin/purchase-bills/summary')
    .then((res: any) => res);

export const getBranchPurchase = (id: string) =>
  api
    .get<Res<BranchPurchaseBill>>(`/branch-admin/purchase-bills/${id}`)
    .then((res: any) => res);

export const createBranchPurchase = (data: NewBranchPurchasePayload) =>
  api
    .post<Res<BranchPurchaseBill>>('/branch-admin/purchase-bills', data)
    .then((res: any) => res);

