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
  branchId?: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
}

// Prefixes based on panel: 'super-admin' | 'company-admin' | 'branch-admin'
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

export const getInventory = (panel: string, params: InventoryListParams) =>
  api.get(`/${panel}/inventory`, {params}).then((res: any) => res);

export const adjustStock = (panel: string, data: any) =>
  api.post(`/${panel}/inventory/adjust`, data).then((res: any) => res);

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
