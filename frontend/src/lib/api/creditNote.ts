import {
  CreateCreditNotePayload,
  CreditNote,
  CreditNoteListParams,
  CreditNoteSummary,
  DecideCreditNotePayload,
  ReturnableBill,
} from '@/types/creditNote';
import {api} from '@/utils/axios';

// Sales returns: shops create credit notes, the branch admin (or the company
// owner running the shop) decides on cash refunds and refunds above the
// limit. The response interceptor already unwraps the axios response body.
type Res<T> = Promise<{statusCode: number; data: T; message: string}>;
export type CreditNotePanel = 'shop-admin' | 'branch-admin';
type Panel = CreditNotePanel;

export const getCreditNotes = (panel: Panel, params: CreditNoteListParams) =>
  api.get(`/${panel}/credit-notes`, {params}) as unknown as Res<{
    items: CreditNote[];
    pagination: {page: number; limit: number; total: number};
  }>;

export const getCreditNote = (panel: Panel, id: string) =>
  api.get(`/${panel}/credit-notes/${id}`) as unknown as Res<CreditNote>;

export const getCreditNoteSummary = (params: {shopId?: string}) =>
  api.get('/branch-admin/credit-notes/summary', {
    params,
  }) as unknown as Res<CreditNoteSummary>;

export const getReturnableBill = (bill: string) =>
  api.get('/shop-admin/credit-notes/returnable', {
    params: {bill},
  }) as unknown as Res<ReturnableBill>;

export const createCreditNote = (data: CreateCreditNotePayload) =>
  api.post('/shop-admin/credit-notes', data) as unknown as Res<CreditNote>;

export const decideCreditNote = (
  id: string,
  data: DecideCreditNotePayload,
  panel: Panel = 'branch-admin',
) =>
  api.post(
    `/${panel}/credit-notes/${id}/decision`,
    data,
  ) as unknown as Res<CreditNote>;
