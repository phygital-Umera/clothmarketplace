import {addCashEntry, addShopBankDeposit, closeCashDay, getCashBook} from '@/lib/api/cashBook';
import {BankDepositPayload, CashEntryPayload, CloseDayPayload} from '@/types/cashBook';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {invalidateStock} from './bill';

export const CASH_BOOK_KEYS = {
  all: ['cash-book'] as const,
  day: (panel: string, date?: string) => [...CASH_BOOK_KEYS.all, panel, date ?? 'today'] as const,
};

export const useCashBook = (panel: string, date?: string) =>
  useQuery({
    queryKey: CASH_BOOK_KEYS.day(panel, date),
    queryFn: () => getCashBook(panel, date),
    select: (res) => res.data,
  });

/** Cash moves change the cash book, the counter and the dashboard drawer */
const useInvalidate = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({queryKey: CASH_BOOK_KEYS.all});
    invalidateStock(qc);
  };
};

const useCashMutation = <T,>(run: (data: T) => Promise<any>, fallback: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: run,
    onSuccess: (res: any) => {
      toast.success(res?.message || fallback);
      invalidate();
    },
  });
};

export const useAddCashEntry = (panel: string) =>
  useCashMutation((data: CashEntryPayload) => addCashEntry(panel, data), 'Saved');

export const useShopBankDeposit = (panel: string) =>
  useCashMutation((data: BankDepositPayload) => addShopBankDeposit(panel, data), 'Deposit saved');

export const useCloseCashDay = (panel: string) =>
  useCashMutation((data: CloseDayPayload) => closeCashDay(panel, data), 'Day closed');
