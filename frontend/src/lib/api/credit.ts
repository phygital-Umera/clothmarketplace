import {api} from '@/utils/axios';
import {
  CreditCustomerSummary,
  CreditMetrics,
  CustomerStatement,
  ReceivePaymentPayload,
  WhatsAppReminder,
} from '@/types/credit';

interface Res<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export const getCreditMetrics = (panel: string = 'shop-admin') =>
  api.get<Res<CreditMetrics>>(`/${panel}/credit/metrics`).then((res: any) => res?.data ?? res);

export const getCreditCustomers = (panel: string = 'shop-admin', search?: string) =>
  api
    .get<Res<CreditCustomerSummary[]>>(`/${panel}/credit/customers`, {
      params: search ? {search} : undefined,
    })
    .then((res: any) => res?.data ?? res);

export const getCustomerStatement = (panel: string = 'shop-admin', customerId: string) =>
  api
    .get<Res<CustomerStatement>>(`/${panel}/credit/customers/${customerId}/statement`)
    .then((res: any) => res?.data ?? res);

export const getNextReceiptNumber = (panel: string = 'shop-admin') =>
  api
    .get<{receiptNumber: string; success: boolean}>(`/${panel}/credit/next-receipt`)
    .then((res: any) => res?.receiptNumber ?? res?.data?.receiptNumber ?? 'RC/26-27/0044');

export const recordCustomerPayment = (
  panel: string = 'shop-admin',
  customerId: string,
  payload: ReceivePaymentPayload,
) =>
  api
    .post<Res<{payment: any; customer: any; receiptNumber: string}>>(
      `/${panel}/credit/customers/${customerId}/payment`,
      payload,
    )
    .then((res: any) => res?.data ?? res);

export const getWhatsAppReminders = (panel: string = 'shop-admin', customerId?: string) =>
  api
    .get<Res<WhatsAppReminder[]>>(`/${panel}/credit/reminders`, {
      params: customerId ? {customerId} : undefined,
    })
    .then((res: any) => res?.data ?? res);

