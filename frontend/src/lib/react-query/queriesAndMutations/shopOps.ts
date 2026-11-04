import {
  closeCounter,
  createExpense,
  createSalesReturn,
  getSalesReturns,
  getShopDashboard,
  openCounter,
} from '@/lib/api/shopOps';
import {
  BILL_KEYS,
  useBillMutation,
} from '@/lib/react-query/queriesAndMutations/bill';
import {
  ExpensePayload,
  SalesReturnPayload,
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

// Returns restock items, so they refresh stock views like bills do
export const useCreateSalesReturn = (panel: string) =>
  useBillMutation(
    (data: SalesReturnPayload) => createSalesReturn(panel, data),
    'Failed to save return',
  );

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


export const useSalesReturns = (
  panel: string,
  params?: {limit?: number; salesBillId?: string; search?: string},
) =>
  useQuery({
    queryKey: ['sales_returns', panel, params],
    queryFn: () => getSalesReturns(panel, params),
    select: (res) => res.data,
  });