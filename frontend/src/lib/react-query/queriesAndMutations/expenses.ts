import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {
  getShopExpenses,
  getNextExpenseNumber,
  createShopExpense,
} from '@/lib/api/expenses';
import {CreateExpensePayload} from '@/types/expense';

export const useShopExpensesQuery = (
  panel: string = 'shop-admin',
  params?: {
    month?: string;
    head?: string;
  }
) => {
  return useQuery({
    queryKey: ['shop-expenses', panel, params?.month, params?.head],
    queryFn: () => getShopExpenses(panel, params),
  });
};

export const useNextExpenseNumberQuery = (panel: string = 'shop-admin') => {
  return useQuery({
    queryKey: ['shop-expenses-next-number', panel],
    queryFn: () => getNextExpenseNumber(panel),
  });
};

export const useCreateShopExpenseMutation = (panel: string = 'shop-admin') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => createShopExpense(panel, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['shop-expenses']});
      queryClient.invalidateQueries({queryKey: ['shop-expenses-next-number']});
      queryClient.invalidateQueries({queryKey: ['cash-entries']});
      queryClient.invalidateQueries({queryKey: ['cash-counter']});
    },
  });
};

