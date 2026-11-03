import {
  cancelBill,
  confirmBill,
  createBill,
  deleteBill,
  getBill,
  getBills,
  updateBill,
} from '@/lib/api/bill';
import {ECOMM_KEYS} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {BillKind, BillListParams, BillPayload} from '@/types/bill';
import {getErrorMessage} from '@/utils/axios';
import {
  keepPreviousData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const BILL_KEYS = {
  BILLS: 'shop_bills',
};

/** Bills change stock, so every inventory view must refresh too */
const invalidateStock = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({queryKey: [BILL_KEYS.BILLS]});
  queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.INVENTORY]});
  queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.INVENTORY_DASHBOARD]});
  queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.MOVEMENTS]});
  queryClient.invalidateQueries({queryKey: ['shop_products']});
};

export const useBills = (
  panel: string,
  kind: BillKind,
  params: BillListParams,
) =>
  useQuery({
    queryKey: [BILL_KEYS.BILLS, panel, kind, params],
    queryFn: () => getBills(panel, kind, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useBill = (panel: string, kind: BillKind, id?: string) =>
  useQuery({
    queryKey: [BILL_KEYS.BILLS, panel, kind, 'one', id],
    queryFn: () => getBill(panel, kind, id!),
    select: (res) => res.data,
    enabled: !!id,
  });

const useBillMutation = <V>(
  run: (vars: V) => Promise<any>,
  failure: string,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Saved');
      invalidateStock(queryClient);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, failure));
      // A stale version (409) or stock error means the list may be out of date
      queryClient.invalidateQueries({queryKey: [BILL_KEYS.BILLS]});
    },
  });
};

export const useSaveBill = (panel: string, kind: BillKind) =>
  useBillMutation(
    ({id, data}: {id?: string; data: BillPayload}) =>
      id ? updateBill(panel, kind, id, data) : createBill(panel, kind, data),
    'Failed to save bill',
  );

export const useConfirmBill = (panel: string, kind: BillKind) =>
  useBillMutation(
    (id: string) => confirmBill(panel, kind, id),
    'Failed to confirm bill',
  );

export const useCancelBill = (panel: string, kind: BillKind) =>
  useBillMutation(
    ({id, reason}: {id: string; reason: string}) =>
      cancelBill(panel, kind, id, reason),
    'Failed to cancel bill',
  );

export const useDeleteBill = (panel: string, kind: BillKind) =>
  useBillMutation(
    (id: string) => deleteBill(panel, kind, id),
    'Failed to delete bill',
  );
