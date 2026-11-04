import {
  createCreditNote,
  decideCreditNote,
  getCreditNote,
  getCreditNotes,
  getCreditNoteSummary,
  getReturnableBill,
} from '@/lib/api/creditNote';
import {ECOMM_KEYS} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {BILL_KEYS} from '@/lib/react-query/queriesAndMutations/bill';
import {
  CreateCreditNotePayload,
  CreditNoteListParams,
  DecideCreditNotePayload,
} from '@/types/creditNote';
import {getErrorMessage} from '@/utils/axios';
import {
  keepPreviousData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const CREDIT_NOTE_KEYS = {NOTES: 'credit_notes'};

type Panel = 'shop-admin' | 'branch-admin';

/** Approved returns put units back in stock, so stock views refresh too */
const invalidate = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({queryKey: [CREDIT_NOTE_KEYS.NOTES]});
  queryClient.invalidateQueries({queryKey: [BILL_KEYS.BILLS]});
  queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.INVENTORY]});
  queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.INVENTORY_DASHBOARD]});
  queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.MOVEMENTS]});
};

export const useCreditNotes = (panel: Panel, params: CreditNoteListParams) =>
  useQuery({
    queryKey: [CREDIT_NOTE_KEYS.NOTES, panel, params],
    queryFn: () => getCreditNotes(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useCreditNote = (panel: Panel, id?: string) =>
  useQuery({
    queryKey: [CREDIT_NOTE_KEYS.NOTES, panel, 'one', id],
    queryFn: () => getCreditNote(panel, id!),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useCreditNoteSummary = (params: {shopId?: string}) =>
  useQuery({
    queryKey: [CREDIT_NOTE_KEYS.NOTES, 'summary', params],
    queryFn: () => getCreditNoteSummary(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useReturnableBill = (bill?: string) =>
  useQuery({
    queryKey: [CREDIT_NOTE_KEYS.NOTES, 'returnable', bill],
    queryFn: () => getReturnableBill(bill!),
    select: (res) => res.data,
    enabled: !!bill,
    retry: false,
  });

export const useCreateCreditNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCreditNotePayload) => createCreditNote(data),
    onSuccess: (res) => {
      toast.success(res.message || 'Return saved');
      invalidate(queryClient);
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, 'Could not save return')),
  });
};

export const useDecideCreditNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: {id: string; data: DecideCreditNotePayload}) =>
      decideCreditNote(id, data),
    onSuccess: (res) => {
      toast.success(res.message || 'Saved');
      invalidate(queryClient);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Could not save decision'));
      queryClient.invalidateQueries({queryKey: [CREDIT_NOTE_KEYS.NOTES]});
    },
  });
};
