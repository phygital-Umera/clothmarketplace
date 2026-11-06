import {api} from '@/utils/axios';
import {
  CustomerDue,
  CustomerDueListParams,
  DueReminder,
  CustomerDueSummary,
  UpdateCreditLimitPayload,
} from '@/types/customerDue';

type Res<T> = {statusCode: number; data: T; message: string};

export const getCustomerDues = (params: CustomerDueListParams) =>
  (api.get('/branch-admin/customer-dues', {params}) as unknown as Promise<Res<{items: CustomerDue[]; pagination: any}>>);

export const getCustomerDueSummary = () =>
  (api.get('/branch-admin/customer-dues/summary') as unknown as Promise<Res<CustomerDueSummary>>);

export const getCustomerDue = (id: string) =>
  (api.get(`/branch-admin/customer-dues/${id}`) as unknown as Promise<Res<CustomerDue>>);

export const updateCustomerCreditLimit = (id: string, payload: UpdateCreditLimitPayload) =>
  (api.patch(`/branch-admin/customer-dues/${id}/limit`, payload) as unknown as Promise<Res<CustomerDue>>);

export const sendCustomerDueReminders = (customerIds?: string[]) =>
  (api.post(
      '/branch-admin/customer-dues/reminders',
      {customerIds},
    ) as unknown as Promise<Res<{reminders: DueReminder[]}>>);

export const exportCustomerDues = (params: CustomerDueListParams) =>
  (api.get('/branch-admin/customer-dues/export', {params}) as unknown as Promise<Res<CustomerDue[]>>);

