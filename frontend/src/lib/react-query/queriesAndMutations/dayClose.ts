import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  getDayCloseData,
  resolveDayCloseDifference,
  recordBankDeposit,
  DayCloseData,
} from '@/lib/api/dayClose';
import toast from 'react-hot-toast';

export const useDayCloseData = (date = '2026-11-02') => {
  return useQuery({
    queryKey: ['branch-day-close', date],
    queryFn: async () => {
      const res = await getDayCloseData(date);
      return res?.data?.data || res?.data;
    },
  });
};

export const useResolveDifference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resolveDayCloseDifference,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Day close accepted and difference recorded');
      qc.invalidateQueries({queryKey: ['branch-day-close']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to accept day close');
    },
  });
};

export const useRecordBankDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recordBankDeposit,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Bank deposit recorded successfully');
      qc.invalidateQueries({queryKey: ['branch-day-close']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record deposit');
    },
  });
};

