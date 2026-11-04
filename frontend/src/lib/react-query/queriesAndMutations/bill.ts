import {
  cancelBill,
  confirmBill,
  createBill,
  deleteBill,
  getBill,
  getBillByNumber,
  getBills,
  recordBillPayment,
  updateBill,
} from '@/lib/api/bill';
import {ECOMM_KEYS} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {
  BillKind,
  BillListParams,
  BillPayload,
  RecordPaymentPayload,
} from '@/types/bill';
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
  /** Shop dashboard figures come from bills, so they refresh with them */
  DASHBOARD: 'shop_dashboard',
};

/** Bills change stock, so every inventory view must refresh too */
export const invalidateStock = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({queryKey: [BILL_KEYS.BILLS]});
  queryClient.invalidateQueries({queryKey: [BILL_KEYS.DASHBOARD]});
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

export const useBranchSalesSummary = (
  params: Pick<BranchSalesParams, 'shopId' | 'from' | 'to'>,
) =>
  useQuery({
    queryKey: [BILL_KEYS.BILLS, 'branch-admin', 'summary', params],
    queryFn: () => getBranchSalesSummary(params),
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

export const useBillMutation = <V>(
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

export const useRecordPayment = (panel: string, kind: BillKind) =>
  useBillMutation(
    ({id, data}: {id: string; data: RecordPaymentPayload}) =>
      recordBillPayment(panel, kind, id, data),
    'Failed to record payment',
  );

export const useCustomerSearch = (panel: string, q: string) =>
  useQuery({
    queryKey: [BILL_KEYS.BILLS, panel, 'customers', q],
    queryFn: () => searchCustomers(panel, q),
    select: (res) => res.data,
    enabled: q.trim().length >= 2,
  });

export const useBillByNumber = (
  panel: string,
  kind: BillKind,
  billNumber?: string,
) =>
  useQuery({
    queryKey: [BILL_KEYS.BILLS, panel, kind, 'by-number', billNumber],
    queryFn: () => getBillByNumber(panel, kind, billNumber!),
    select: (res) => res.data,
    enabled: !!billNumber && billNumber.trim().length > 0,
    retry: false,
  });