import {api} from '@/utils/axios';
import {
  CustomerDue,
  CustomerDueListParams,
  CustomerDueSummary,
  UpdateCreditLimitPayload,
} from '@/types/customerDue';

type Res<T> = {statusCode: number; data: T; message: string};

export const getCustomerDues = (params: CustomerDueListParams) =>
  api
    .get<Res<{items: CustomerDue[]; pagination: any}>>('/branch-admin/customer-dues', {params})
    .then((res: any) => res);

export const getCustomerDueSummary = () =>
  api
    .get<Res<CustomerDueSummary>>('/branch-admin/customer-dues/summary')
    .then((res: any) => res);

export const getCustomerDue = (id: string) =>
  api
    .get<Res<CustomerDue>>(`/branch-admin/customer-dues/${id}`)
    .then((res: any) => res);

export const updateCustomerCreditLimit = (id: string, payload: UpdateCreditLimitPayload) =>
  api
    .patch<Res<CustomerDue>>(`/branch-admin/customer-dues/${id}/limit`, payload)
    .then((res: any) => res);

export const sendCustomerDueReminders = (customerIds?: string[]) =>
  api
    .post<Res<{success: boolean; sentCount: number; message: string}>>(
      '/branch-admin/customer-dues/reminders',
      {customerIds},
    )
    .then((res: any) => res);

export const exportCustomerDues = (params: CustomerDueListParams) =>
  api
    .get<Res<CustomerDue[]>>('/branch-admin/customer-dues/export', {params})
    .then((res: any) => res);

