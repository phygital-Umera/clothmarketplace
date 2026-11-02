export type OfferType = 'PERCENTAGE' | 'FLAT';

export type OfferApplicableOn =
  | 'ALL_PRODUCTS'
  | 'SELECTED_CATEGORIES'
  | 'SELECTED_SUBCATEGORIES'
  | 'SELECTED_PRODUCTS';

export type PromotionStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'EXHAUSTED' | 'INACTIVE';

export interface Offer {
  id: string;
  name: string;
  description?: string | null;
  bannerUrl?: string | null;
  type: OfferType;
  discountValue: number;
  applicableOn: OfferApplicableOn;
  minOrderValue: number;
  maxDiscountLimit?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: PromotionStatus;
  categories?: {id: string; name: string; code?: string}[];
  subcategories?: {id: string; name: string; code?: string}[];
  products?: {id: string; name: string; sku: string; mrp?: number}[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  bannerUrl?: string | null;
  type: OfferType;
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountLimit?: number | null;
  usageLimit?: number | null;
  perCustomerLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: PromotionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  coupon?: {code: string; type: OfferType; discountValue: number};
  userId: string;
  user?: {id: string; fullname: string; email?: string; phoneNumber?: string};
  orderId?: string | null;
  discountAmount: number;
  usedAt: string;
}

export interface PromotionsDashboardData {
  summary: {
    totalOffers: number;
    activeOffers: number;
    scheduledOffers: number;
    expiredOffers: number;
    inactiveOffers: number;
    totalCoupons: number;
    activeCoupons: number;
    scheduledCoupons: number;
    expiredCoupons: number;
    totalRedemptions: number;
    totalDiscountGiven: number;
  };
  recentOffers: Offer[];
  recentCoupons: Coupon[];
  recentUsages: CouponUsage[];
}

export interface ValidateCouponPayload {
  code: string;
  subtotal: number;
  items?: {
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface ValidateCouponResult {
  valid: boolean;
  coupon: {
    id: string;
    code: string;
    name?: string;
    type: OfferType;
    discountValue: number;
    maxDiscountLimit?: number | null;
    minPurchaseAmount: number;
  };
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

