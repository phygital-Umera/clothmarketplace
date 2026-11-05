import {
  getCreditCustomers,
  getCreditMetrics,
  getCustomerStatement,
  getNextReceiptNumber,
  getWhatsAppReminders,
  recordCustomerPayment,
} from '@/lib/api/credit';
import {ReceivePaymentPayload} from '@/types/credit';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const creditKeys = {
  all: ['credit'] as const,
  metrics: (panel: string) => [...creditKeys.all, 'metrics', panel] as const,
  customers: (panel: string, search?: string) =>
    [...creditKeys.all, 'customers', panel, search ?? ''] as const,
  statement: (panel: string, customerId: string | null) =>
    [...creditKeys.all, 'statement', panel, customerId ?? ''] as const,
  nextReceipt: (panel: string) => [...creditKeys.all, 'nextReceipt', panel] as const,
  reminders: (panel: string, customerId?: string) =>
    [...creditKeys.all, 'reminders', panel, customerId ?? ''] as const,
};

export const useCreditMetrics = (panel: string = 'shop-admin') =>
  useQuery({
    queryKey: creditKeys.metrics(panel),
    queryFn: () => getCreditMetrics(panel),
    staleTime: 30_000,
  });

export const useCreditCustomers = (panel: string = 'shop-admin', search?: string) =>
  useQuery({
    queryKey: creditKeys.customers(panel, search),
    queryFn: () => getCreditCustomers(panel, search),
    staleTime: 30_000,
  });

export const useCustomerStatement = (panel: string = 'shop-admin', customerId: string | null) =>
  useQuery({
    queryKey: creditKeys.statement(panel, customerId),
    queryFn: () => {
      if (!customerId) return null;
      return getCustomerStatement(panel, customerId);
    },
    enabled: !!customerId,
  });

export const useNextReceiptNumber = (panel: string = 'shop-admin') =>
  useQuery({
    queryKey: creditKeys.nextReceipt(panel),
    queryFn: () => getNextReceiptNumber(panel),
  });

export const useRecordCustomerPayment = (panel: string = 'shop-admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      payload,
    }: {
      customerId: string;
      payload: ReceivePaymentPayload;
    }) => recordCustomerPayment(panel, customerId, payload),
    onSuccess: (_, {customerId}) => {
      queryClient.invalidateQueries({queryKey: creditKeys.all});
      queryClient.invalidateQueries({queryKey: ['customers']});
      queryClient.invalidateQueries({queryKey: ['bills']});
      queryClient.invalidateQueries({queryKey: ['shopDashboard']});
    },
  });
};

export const useWhatsAppReminders = (panel: string = 'shop-admin', customerId?: string) =>
  useQuery({
    queryKey: creditKeys.reminders(panel, customerId),
    queryFn: () => getWhatsAppReminders(panel, customerId),
  });

