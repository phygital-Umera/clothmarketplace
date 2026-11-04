import {api} from '@/utils/axios';

export type ProductPriceItem = {
  id: string;
  name: string;
  code: string;
  category: string;
  hsnGst: string;
  avgCost: number;
  mrp: number;
  branchPrice: number;
  margin: number;
  mensStock: number;
  womensStock: number;
  kidsStock: number;
  priceChangedAt: string | null;
};

export type ProductPricingResult = {
  items: ProductPriceItem[];
  counts: {
    all: number;
    changedThisWeek: number;
    belowMinMargin: number;
  };
};

type Res<T> = {statusCode: number; data: T; message: string};

export const getBranchProductPrices = (params?: {
  search?: string;
  category?: string;
  tab?: string;
}) =>
  api
    .get<Res<ProductPricingResult>>('/branch-admin/products-pricing', {params})
    .then((res: any) => res);

export const saveBranchPrices = (prices: Record<string, number>) =>
  api
    .post<Res<{success: boolean; message: string}>>('/branch-admin/products-pricing/save', {
      prices,
    })
    .then((res: any) => res);

export const scheduleBulkPrice = (data: {
  applyTo: string;
  changeType: string;
  value: number;
  fromDate: string;
  toDate: string;
  name: string;
}) =>
  api
    .post<Res<{success: boolean; message: string}>>('/branch-admin/products-pricing/bulk', data)
    .then((res: any) => res);

