import {
  closeCounter,
  createExpense,
  getShopDashboard,
  openCounter,
} from '@/lib/api/shopOps';
import {
  BILL_KEYS,
  useBillMutation,
} from '@/lib/react-query/queriesAndMutations/bill';
import {
  ExpensePayload,
  ShopDashboard,
} from '@/types/shopOps';
import {useQuery} from '@tanstack/react-query';

/** Shop dashboard; refreshed by every bill / return / counter / expense change */
export const useShopDashboard = (panel: string) =>
  useQuery({
    queryKey: [BILL_KEYS.DASHBOARD, panel],
    queryFn: () => getShopDashboard(panel),
    select: (res): ShopDashboard => res.data,
    // Counter figures move all day: keep the page current while it is open
    refetchInterval: 60 * 1000,
  });

export const useOpenCounter = (panel: string) =>
  useBillMutation(
    (openingCash: number) => openCounter(panel, openingCash),
    'Failed to open counter',
  );

export const useCloseCounter = (panel: string) =>
  useBillMutation(
    (closingCash: number) => closeCounter(panel, closingCash),
    'Failed to close counter',
  );

export const useCreateExpense = (panel: string) =>
  useBillMutation(
    (data: ExpensePayload) => createExpense(panel, data),
    'Failed to add expense',
  );

