import {
  createTransferRequest,
  decideTransfer,
  dispatchTransfer,
  getShopTransfers,
  getStockTransfers,
  getStockTransferSummary,
  getTransferShops,
  getTransferSources,
  getTransferVariants,
  receiveTransfer,
} from '@/lib/api/stockTransfer';
import {CreateTransferPayload, TransferDecision} from '@/types/stockTransfer';
import {getErrorMessage} from '@/utils/axios';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {invalidateStock} from './bill';

export const TRANSFER_KEYS = {
  all: ['stock-transfers'] as const,
  shops: (panel: string) => [...TRANSFER_KEYS.all, 'shops', panel] as const,
  variants: (panel: string, search?: string) =>
    [...TRANSFER_KEYS.all, 'variants', panel, search ?? ''] as const,
  shopList: (panel: string, tab: string, search?: string) =>
    [...TRANSFER_KEYS.all, 'shop', panel, tab, search ?? ''] as const,
  branchList: (params?: {search?: string; tab?: string}) =>
    [...TRANSFER_KEYS.all, 'branch', params] as const,
  summary: () => [...TRANSFER_KEYS.all, 'summary'] as const,
  sources: (id: string) => [...TRANSFER_KEYS.all, 'sources', id] as const,
};

/** Transfers move stock: refresh transfer lists and every stock view */
const useInvalidate = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({queryKey: TRANSFER_KEYS.all});
    invalidateStock(qc);
    qc.invalidateQueries({queryKey: ['stock']});
  };
};

// ---- Shop ----

export const useTransferShops = (panel: string) =>
  useQuery({
    queryKey: TRANSFER_KEYS.shops(panel),
    queryFn: () => getTransferShops(panel),
    select: (res) => res.data,
  });

export const useTransferVariants = (panel: string, search?: string, enabled = true) =>
  useQuery({
    queryKey: TRANSFER_KEYS.variants(panel, search),
    queryFn: () => getTransferVariants(panel, search),
    select: (res) => res.data,
    enabled,
  });

export const useShopTransfers = (
  panel: string,
  tab: 'MINE' | 'DISPATCH' | 'HISTORY',
  search?: string,
) =>
  useQuery({
    queryKey: TRANSFER_KEYS.shopList(panel, tab, search),
    queryFn: () => getShopTransfers(panel, tab, search),
    select: (res) => res.data,
  });

export const useCreateTransferRequest = (panel: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: CreateTransferPayload) => createTransferRequest(panel, data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Request sent');
      invalidate();
    },
  });
};

export const useDispatchTransfer = (panel: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => dispatchTransfer(panel, id),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Marked dispatched');
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not mark dispatched')),
  });
};

export const useReceiveTransfer = (panel: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {items: Array<{itemId: string; receivedQty: number}>; note?: string};
    }) => receiveTransfer(panel, id, data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Transfer received');
      invalidate();
    },
  });
};

// ---- Branch admin ----

export const useStockTransfers = (params?: {search?: string; tab?: string}) =>
  useQuery({
    queryKey: TRANSFER_KEYS.branchList(params),
    queryFn: () => getStockTransfers(params),
    select: (res) => res.data,
  });

export const useStockTransferSummary = () =>
  useQuery({
    queryKey: TRANSFER_KEYS.summary(),
    queryFn: getStockTransferSummary,
    select: (res) => res.data,
  });

export const useTransferSources = (id: string | null) =>
  useQuery({
    queryKey: TRANSFER_KEYS.sources(id ?? ''),
    queryFn: () => getTransferSources(id as string),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useDecideTransfer = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({id, data}: {id: string; data: TransferDecision}) => decideTransfer(id, data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Decision saved');
      invalidate();
    },
  });
};
