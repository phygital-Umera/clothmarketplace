import {
  exportCustomerDues,
  getCustomerDue,
  getCustomerDues,
  getCustomerDueSummary,
  sendCustomerDueReminders,
  updateCustomerCreditLimit,
} from '@/lib/api/customerDue';
import {
  CustomerDueListParams,
  UpdateCreditLimitPayload,
} from '@/types/customerDue';
import {getErrorMessage} from '@/utils/axios';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const CUSTOMER_DUE_KEYS = {
  ALL: 'customer_dues',
  LIST: 'customer_dues_list',
  SUMMARY: 'customer_dues_summary',
  DETAIL: 'customer_due_detail',
};

export const useCustomerDues = (params: CustomerDueListParams) =>
  useQuery({
    queryKey: [CUSTOMER_DUE_KEYS.LIST, params],
    queryFn: () => getCustomerDues(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useCustomerDueSummary = () =>
  useQuery({
    queryKey: [CUSTOMER_DUE_KEYS.SUMMARY],
    queryFn: getCustomerDueSummary,
    select: (res) => res.data,
  });

export const useCustomerDue = (id?: string) =>
  useQuery({
    queryKey: [CUSTOMER_DUE_KEYS.DETAIL, id],
    queryFn: () => getCustomerDue(id!),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useUpdateCreditLimit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, payload}: {id: string; payload: UpdateCreditLimitPayload}) =>
      updateCustomerCreditLimit(id, payload),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Credit limit updated');
      queryClient.invalidateQueries({queryKey: [CUSTOMER_DUE_KEYS.ALL]});
      queryClient.invalidateQueries({queryKey: [CUSTOMER_DUE_KEYS.LIST]});
      queryClient.invalidateQueries({queryKey: [CUSTOMER_DUE_KEYS.SUMMARY]});
      queryClient.invalidateQueries({queryKey: [CUSTOMER_DUE_KEYS.DETAIL]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to update credit limit'));
    },
  });
};

export const useSendReminders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerIds?: string[]) => sendCustomerDueReminders(customerIds),
    onSuccess: (res: any) => {
      toast.success(res?.data?.message || res?.message || 'Reminders sent successfully');
      queryClient.invalidateQueries({queryKey: [CUSTOMER_DUE_KEYS.LIST]});
      queryClient.invalidateQueries({queryKey: [CUSTOMER_DUE_KEYS.SUMMARY]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to send reminders'));
    },
  });
};

