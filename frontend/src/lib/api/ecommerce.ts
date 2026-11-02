import {api} from '@/utils/axios';

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  gender?: string;
}

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  categoryId?: string;
  view?: 'product' | 'variant';
  branchId?: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
}

export interface AdjustStockPayload {
  variantId: string;
  type: 'INCREASE' | 'DECREASE' | 'CORRECTION';
  quantity: number;
  reason: string;
  notes?: string;
  branchId?: string;
}

export interface BatchAdjustPayload {
  type: 'INCREASE' | 'DECREASE';
  reason: string;
  reference?: string;
  branchId?: string;
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
}

export interface UpdateThresholdPayload {
  variantId: string;
  threshold: number;
  branchId?: string;
}

// Prefixes based on panel: 'super-admin' | 'company-admin' | 'branch-admin' | 'shop-admin' | 'employee'
export const getProducts = (panel: string, params: ProductListParams) =>
  api.get(`/${panel}/products`, {params}).then((res: any) => res);

export const getProduct = (panel: string, id: string) =>
  api.get(`/${panel}/products/${id}`).then((res: any) => res);

export const createProduct = (panel: string, data: any) =>
  api.post(`/${panel}/products`, data).then((res: any) => res);

export const updateProduct = (panel: string, id: string, data: any) =>
  api.patch(`/${panel}/products/${id}`, data).then((res: any) => res);

export const deleteProduct = (panel: string, id: string) =>
  api.delete(`/${panel}/products/${id}`).then((res: any) => res);

export const getCategories = (panel: string) =>
  api.get(`/${panel}/categories`).then((res: any) => res);

export const getBrands = (panel: string) =>
  api.get(`/${panel}/brands`).then((res: any) => res);

export const getInventoryDashboard = (panel: string, params?: {branchId?: string}) =>
  api.get(`/${panel}/inventory/dashboard`, {params}).then((res: any) => res);

export const getInventory = (panel: string, params: InventoryListParams) =>
  api.get(`/${panel}/inventory`, {params}).then((res: any) => res);

export const adjustStock = (panel: string, data: AdjustStockPayload) =>
  api.post(`/${panel}/inventory/adjust`, data).then((res: any) => res);

export const batchAdjustStock = (panel: string, data: BatchAdjustPayload) =>
  api.post(`/${panel}/inventory/batch-adjust`, data).then((res: any) => res);

export const updateInventoryThreshold = (panel: string, data: UpdateThresholdPayload) =>
  api.patch(`/${panel}/inventory/threshold`, data).then((res: any) => res);

export const getStockMovements = (panel: string, params: any) =>
  api.get(`/${panel}/inventory/movements`, {params}).then((res: any) => res);

export const getOrders = (panel: string, params: OrderListParams) =>
  api.get(`/${panel}/orders`, {params}).then((res: any) => res);

export const getOrder = (panel: string, id: string) =>
  api.get(`/${panel}/orders/${id}`).then((res: any) => res);

export const updateOrderStatus = (panel: string, id: string, data: any) =>
  api.patch(`/${panel}/orders/${id}/status`, data).then((res: any) => res);

export const getReturns = (panel: string, params: any) =>
  api.get(`/${panel}/returns`, {params}).then((res: any) => res);
