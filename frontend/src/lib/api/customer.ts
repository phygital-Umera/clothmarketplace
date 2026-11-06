import {api} from '@/utils/axios';
import {
  CreateCustomerPayload,
  CustomerListParams,
  CustomerListResponse,
  ShopCustomer,
  UpdateCustomerPayload,
} from '@/types/customer';

interface Res<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export const getCustomers = (panel: string, params?: CustomerListParams) =>
  (api.get(`/${panel}/customers`, {params}) as unknown as Promise<Res<CustomerListResponse>>);

export const getCustomer = (panel: string, id: string) =>
  (api.get(`/${panel}/customers/${id}`) as unknown as Promise<Res<ShopCustomer>>);

export const createCustomer = (panel: string, data: CreateCustomerPayload) =>
  (api.post(`/${panel}/customers`, data) as unknown as Promise<Res<ShopCustomer>>);

export const updateCustomer = (
  panel: string,
  id: string,
  data: UpdateCustomerPayload,
) =>
  (api.patch(`/${panel}/customers/${id}`, data) as unknown as Promise<Res<ShopCustomer>>);

export const importCustomers = (panel: string, rows: any[]) =>
  (api.post(`/${panel}/customers/import`, {rows}) as unknown as Promise<Res<{imported: number; total: number}>>);

