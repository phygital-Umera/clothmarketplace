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
  (api.get(
    `/${panel}/promotions/dashboard`
  ) as unknown as Promise<{statusCode: number; data: PromotionsDashboardData; message: string}>);

// 2. Offers
export const getOffers = (panel: string, params: PromotionListParams) =>
  (api.get(
    `/${panel}/promotions/offers`,
    {params}
  ) as unknown as Promise<{statusCode: number; data: {items: Offer[]; pagination: any}; message: string}>);

export const getOffer = (panel: string, id: string) =>
  (api.get(
    `/${panel}/promotions/offers/${id}`
  ) as unknown as Promise<{statusCode: number; data: Offer; message: string}>);

export const createOffer = (panel: string, data: FormData | any) =>
  (api.post(
    `/${panel}/promotions/offers`,
    data
  ) as unknown as Promise<{statusCode: number; data: Offer; message: string}>);

export const updateOffer = (panel: string, id: string, data: FormData | any) =>
  (api.patch(
    `/${panel}/promotions/offers/${id}`,
    data
  ) as unknown as Promise<{statusCode: number; data: Offer; message: string}>);

export const toggleOfferStatus = (panel: string, id: string, isActive?: boolean) =>
  (api.patch(
    `/${panel}/promotions/offers/${id}/status`,
    {isActive}
  ) as unknown as Promise<{statusCode: number; data: Offer; message: string}>);

export const deleteOffer = (panel: string, id: string) =>
  (api.delete(
    `/${panel}/promotions/offers/${id}`
  ) as unknown as Promise<{statusCode: number; data: {id: string; deleted: boolean}; message: string}>);

// 3. Coupons
export const getCoupons = (panel: string, params: PromotionListParams) =>
  (api.get(
    `/${panel}/promotions/coupons`,
    {params}
  ) as unknown as Promise<{statusCode: number; data: {items: Coupon[]; pagination: any}; message: string}>);

export const getCoupon = (panel: string, id: string) =>
  (api.get(
    `/${panel}/promotions/coupons/${id}`
  ) as unknown as Promise<{statusCode: number; data: Coupon; message: string}>);

export const createCoupon = (panel: string, data: FormData | any) =>
  (api.post(
    `/${panel}/promotions/coupons`,
    data
  ) as unknown as Promise<{statusCode: number; data: Coupon; message: string}>);

export const updateCoupon = (panel: string, id: string, data: FormData | any) =>
  (api.patch(
    `/${panel}/promotions/coupons/${id}`,
    data
  ) as unknown as Promise<{statusCode: number; data: Coupon; message: string}>);

export const toggleCouponStatus = (panel: string, id: string, isActive?: boolean) =>
  (api.patch(
    `/${panel}/promotions/coupons/${id}/status`,
    {isActive}
  ) as unknown as Promise<{statusCode: number; data: Coupon; message: string}>);

export const deleteCoupon = (panel: string, id: string) =>
  (api.delete(
    `/${panel}/promotions/coupons/${id}`
  ) as unknown as Promise<{statusCode: number; data: {id: string; deleted: boolean}; message: string}>);

// 4. Coupon Validation & Checkout
export const validateCoupon = (panel: string, data: ValidateCouponPayload) =>
  (api.post(
    `/${panel}/promotions/coupons/validate`,
    data
  ) as unknown as Promise<{statusCode: number; data: ValidateCouponResult; message: string}>);

