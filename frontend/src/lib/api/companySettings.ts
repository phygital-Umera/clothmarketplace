import {api} from '@/utils/axios';

/** The company's business rules (P4-08); the owner edits them on Company Profile */
export interface CompanyRules {
  refundApprovalLimit: number;
  discountApprovalPct: number;
  lowStockDefault: number;
  defaultCreditDays: number;
  minMarginPct: number;
}

type Res<T> = {data: T; message: string};

/** company-admin edits; shop-admin (and employees, via the interceptor) read */
export const getCompanyRules = (panel: 'company-admin' | 'shop-admin') =>
  (api.get(`/${panel}/settings`) as unknown as Promise<Res<CompanyRules>>).then((r) => r.data);

export const updateCompanyRules = (rules: CompanyRules) =>
  (api.patch('/company-admin/settings', rules) as unknown as Promise<Res<CompanyRules>>).then(
    (r) => r.data,
  );
