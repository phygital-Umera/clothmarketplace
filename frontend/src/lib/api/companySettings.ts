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

/** Store-wide settings (P4-08b), super admin */
export interface StoreRules {
  deliveryFee: number;
  freeDeliveryAbove: number;
  expressFee: number;
  deliveryDaysStd: number;
  deliveryDaysExpress: number;
  limitedBadgeAt: number;
  newProductDays: number;
}

export const getStoreRules = () =>
  (api.get('/super-admin/store-settings') as unknown as Promise<Res<StoreRules>>).then(
    (r) => r.data,
  );

export const updateStoreRules = (rules: StoreRules) =>
  (api.patch('/super-admin/store-settings', rules) as unknown as Promise<Res<StoreRules>>).then(
    (r) => r.data,
  );

export const updateCompanyRules = (rules: CompanyRules) =>
  (api.patch('/company-admin/settings', rules) as unknown as Promise<Res<CompanyRules>>).then(
    (r) => r.data,
  );
