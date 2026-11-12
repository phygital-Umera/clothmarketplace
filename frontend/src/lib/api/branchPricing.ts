import {api} from '@/utils/axios';

export type ProductPriceItem = {
  id: string;
  name: string;
  code: string;
  category: string;
  categoryId: string | null;
  shop: {id: string; name: string} | null;
  taxRate: number;
  /** Weighted average purchase cost; null when never purchased */
  avgCost: number | null;
  mrp: number;
  branchPrice: number;
  margin: number | null;
  stock: number;
  priceChangedAt: string | null;
};

export type ProductPricingResult = {
  items: ProductPriceItem[];
  counts: {all: number; changedThisWeek: number; belowMinMargin: number};
  categories: {id: string; name: string}[];
  minMargin: number;
};

export type PriceTab = 'ALL' | 'CHANGED_THIS_WEEK' | 'BELOW_MIN_MARGIN';

type Res<T> = {statusCode: number; data: T; message: string};

export const getBranchProductPrices = (params?: {
  search?: string;
  categoryId?: string;
  tab?: PriceTab;
}) =>
  api.get('/branch-admin/products-pricing', {params}) as unknown as Promise<
    Res<ProductPricingResult>
  >;
