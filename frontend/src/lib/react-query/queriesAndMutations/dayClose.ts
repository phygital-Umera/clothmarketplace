import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  DayCloseData,
  getDayCloseData,
  recordBankDeposit,
  resolveDayCloseDifference,
} from '@/lib/api/dayClose';
import toast from 'react-hot-toast';

export const DAY_CLOSE_KEYS = {
  all: ['branch-day-close'] as const,
  day: (date: string) => [...DAY_CLOSE_KEYS.all, date] as const,
};

export const useDayCloseData = (date: string) =>
  useQuery({
    queryKey: DAY_CLOSE_KEYS.day(date),
    queryFn: () => getDayCloseData(date),
    select: (res) => res.data as DayCloseData,
  });

export const useResolveDifference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resolveDayCloseDifference,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Day close accepted');
      qc.invalidateQueries({queryKey: DAY_CLOSE_KEYS.all});
    },
  });
};

export const useRecordBankDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recordBankDeposit,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Bank deposit recorded');
      qc.invalidateQueries({queryKey: DAY_CLOSE_KEYS.all});
    },
  });
};
