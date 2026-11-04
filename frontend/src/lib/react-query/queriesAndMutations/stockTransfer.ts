import {
  confirmTransferReceipt,
  createStockTransfer,
  getStockTransfers,
  getStockTransferSummary,
} from '@/lib/api/stockTransfer';
import {getErrorMessage} from '@/utils/axios';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const TRANSFER_KEYS = {
  ALL: 'stock_transfers',
  LIST: 'stock_transfers_list',
  SUMMARY: 'stock_transfers_summary',
};

export const useStockTransfers = (params?: {search?: string; tab?: string}) =>
  useQuery({
    queryKey: [TRANSFER_KEYS.LIST, params],
    queryFn: () => getStockTransfers(params),
    select: (res) => res.data,
  });

export const useStockTransferSummary = () =>
  useQuery({
    queryKey: [TRANSFER_KEYS.SUMMARY],
    queryFn: getStockTransferSummary,
    select: (res) => res.data,
  });

export const useConfirmTransferReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        damagedOnArrival?: number;
        receivingNote?: string;
        itemsReceived: Record<string, number>;
      };
    }) => confirmTransferReceipt(id, data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Transfer receipt confirmed');
      queryClient.invalidateQueries({queryKey: [TRANSFER_KEYS.ALL]});
      queryClient.invalidateQueries({queryKey: [TRANSFER_KEYS.LIST]});
      queryClient.invalidateQueries({queryKey: [TRANSFER_KEYS.SUMMARY]});
      queryClient.invalidateQueries({queryKey: ['inventory']});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to confirm receipt'));
    },
  });
};

export const useCreateStockTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      transferType: string;
      fromSource: string;
      toDestination: string;
      dispatchDate: string;
      priority: string;
      items: Array<{
        productVariant: string;
        sku: string;
        availableAtSource: number;
        qtyToSend: number;
      }>;
      reason: string;
      noteForReceiver?: string;
      status?: string;
    }) => createStockTransfer(data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Stock transfer created successfully');
      queryClient.invalidateQueries({queryKey: [TRANSFER_KEYS.ALL]});
      queryClient.invalidateQueries({queryKey: [TRANSFER_KEYS.LIST]});
      queryClient.invalidateQueries({queryKey: [TRANSFER_KEYS.SUMMARY]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to create transfer'));
    },
  });
};

