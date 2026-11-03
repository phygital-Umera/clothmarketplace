import {api} from '@/utils/axios';
import {
  Coupon,
  Offer,
  PromotionsDashboardData,
  ValidateCouponPayload,
  ValidateCouponResult,
} from '@/types/promotion';

export interface PromotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  applicableOn?: string;
}

// 1. Dashboard
export const getPromotionsDashboard = (panel: string) =>
  api.get<{statusCode: number; data: PromotionsDashboardData; message: string}>(
    `/${panel}/promotions/dashboard`
  ).then((res: any) => res);

// 2. Offers
export const getOffers = (panel: string, params: PromotionListParams) =>
  api.get<{statusCode: number; data: {items: Offer[]; pagination: any}; message: string}>(
    `/${panel}/promotions/offers`,
    {params}
  ).then((res: any) => res);

export const getOffer = (panel: string, id: string) =>
  api.get<{statusCode: number; data: Offer; message: string}>(
    `/${panel}/promotions/offers/${id}`
  ).then((res: any) => res);

export const createOffer = (panel: string, data: FormData | any) =>
  api.post<{statusCode: number; data: Offer; message: string}>(
    `/${panel}/promotions/offers`,
    data
  ).then((res: any) => res);

export const updateOffer = (panel: string, id: string, data: FormData | any) =>
  api.patch<{statusCode: number; data: Offer; message: string}>(
    `/${panel}/promotions/offers/${id}`,
    data
  ).then((res: any) => res);

export const toggleOfferStatus = (panel: string, id: string, isActive?: boolean) =>
  api.patch<{statusCode: number; data: Offer; message: string}>(
    `/${panel}/promotions/offers/${id}/status`,
    {isActive}
  ).then((res: any) => res);

export const deleteOffer = (panel: string, id: string) =>
  api.delete<{statusCode: number; data: {id: string; deleted: boolean}; message: string}>(
    `/${panel}/promotions/offers/${id}`
  ).then((res: any) => res);

// 3. Coupons
export const getCoupons = (panel: string, params: PromotionListParams) =>
  api.get<{statusCode: number; data: {items: Coupon[]; pagination: any}; message: string}>(
    `/${panel}/promotions/coupons`,
    {params}
  ).then((res: any) => res);

export const getCoupon = (panel: string, id: string) =>
  api.get<{statusCode: number; data: Coupon; message: string}>(
    `/${panel}/promotions/coupons/${id}`
  ).then((res: any) => res);

export const createCoupon = (panel: string, data: FormData | any) =>
  api.post<{statusCode: number; data: Coupon; message: string}>(
    `/${panel}/promotions/coupons`,
    data
  ).then((res: any) => res);

export const updateCoupon = (panel: string, id: string, data: FormData | any) =>
  api.patch<{statusCode: number; data: Coupon; message: string}>(
    `/${panel}/promotions/coupons/${id}`,
    data
  ).then((res: any) => res);

export const toggleCouponStatus = (panel: string, id: string, isActive?: boolean) =>
  api.patch<{statusCode: number; data: Coupon; message: string}>(
    `/${panel}/promotions/coupons/${id}/status`,
    {isActive}
  ).then((res: any) => res);

export const deleteCoupon = (panel: string, id: string) =>
  api.delete<{statusCode: number; data: {id: string; deleted: boolean}; message: string}>(
    `/${panel}/promotions/coupons/${id}`
  ).then((res: any) => res);

// 4. Coupon Validation & Checkout
export const validateCoupon = (panel: string, data: ValidateCouponPayload) =>
  api.post<{statusCode: number; data: ValidateCouponResult; message: string}>(
    `/${panel}/promotions/coupons/validate`,
    data
  ).then((res: any) => res);

