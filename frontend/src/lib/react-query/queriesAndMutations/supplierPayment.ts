import {
  getSuppliers,
  getSupplierSummary,
  recordSupplierPayment,
  RecordPaymentPayload,
} from '@/lib/api/supplierPayment';
import {getErrorMessage} from '@/utils/axios';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const SUPPLIER_KEYS = {
  ALL: 'suppliers',
  LIST: 'suppliers_list',
  SUMMARY: 'suppliers_summary',
};

export const useSuppliers = (params?: {search?: string}) =>
  useQuery({
    queryKey: [SUPPLIER_KEYS.LIST, params],
    queryFn: () => getSuppliers(params),
    select: (res) => res.data,
  });

export const useSupplierSummary = () =>
  useQuery({
    queryKey: [SUPPLIER_KEYS.SUMMARY],
    queryFn: getSupplierSummary,
    select: (res) => res.data,
  });

export const useRecordSupplierPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPaymentPayload) => recordSupplierPayment(data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Payment recorded successfully');
      queryClient.invalidateQueries({queryKey: [SUPPLIER_KEYS.ALL]});
      queryClient.invalidateQueries({queryKey: [SUPPLIER_KEYS.LIST]});
      queryClient.invalidateQueries({queryKey: [SUPPLIER_KEYS.SUMMARY]});
      queryClient.invalidateQueries({queryKey: ['branch_purchases']});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to record payment'));
    },
  });
};

