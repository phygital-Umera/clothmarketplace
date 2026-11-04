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
  api
    .get<Res<CustomerListResponse>>(`/${panel}/customers`, {params})
    .then((res: any) => res);

export const getCustomer = (panel: string, id: string) =>
  api.get<Res<ShopCustomer>>(`/${panel}/customers/${id}`).then((res: any) => res);

export const createCustomer = (panel: string, data: CreateCustomerPayload) =>
  api.post<Res<ShopCustomer>>(`/${panel}/customers`, data).then((res: any) => res);

export const updateCustomer = (
  panel: string,
  id: string,
  data: UpdateCustomerPayload,
) =>
  api.patch<Res<ShopCustomer>>(`/${panel}/customers/${id}`, data).then((res: any) => res);

export const importCustomers = (panel: string, rows: any[]) =>
  api.post<Res<{imported: number; total: number}>>(`/${panel}/customers/import`, {rows}).then((res: any) => res);

