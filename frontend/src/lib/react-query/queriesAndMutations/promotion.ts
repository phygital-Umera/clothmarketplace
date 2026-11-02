import {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getOffers,
  getOffer,
  createOffer,
  updateOffer,
  toggleOfferStatus,
  deleteOffer,
  getPromotionsDashboard,
  validateCoupon,
  PromotionListParams,
} from '@/lib/api/promotion';
import {ValidateCouponPayload} from '@/types/promotion';
import {getErrorMessage} from '@/utils/axios';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const PROMOTION_KEYS = {
  DASHBOARD: 'promotions_dashboard',
  OFFERS: 'promotions_offers',
  OFFER: 'promotions_offer',
  COUPONS: 'promotions_coupons',
  COUPON: 'promotions_coupon',
};

// 1. Dashboard
export const usePromotionsDashboard = (panel: string) =>
  useQuery({
    queryKey: [PROMOTION_KEYS.DASHBOARD, panel],
    queryFn: () => getPromotionsDashboard(panel),
    select: (res) => res.data,
  });

// 2. Offers Queries & Mutations
export const useOffers = (panel: string, params: PromotionListParams) =>
  useQuery({
    queryKey: [PROMOTION_KEYS.OFFERS, panel, params],
    queryFn: () => getOffers(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useOffer = (panel: string, id: string) =>
  useQuery({
    queryKey: [PROMOTION_KEYS.OFFER, panel, id],
    queryFn: () => getOffer(panel, id),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useCreateOffer = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData | any) => createOffer(panel, data),
    onSuccess: () => {
      toast.success('Offer created successfully');
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.OFFERS]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.DASHBOARD]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to create offer'));
    },
  });
};

export const useUpdateOffer = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: {id: string; data: FormData | any}) => updateOffer(panel, id, data),
    onSuccess: () => {
      toast.success('Offer updated successfully');
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.OFFERS]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.OFFER]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.DASHBOARD]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to update offer'));
    },
  });
};

export const useToggleOfferStatus = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, isActive}: {id: string; isActive?: boolean}) =>
      toggleOfferStatus(panel, id, isActive),
    onSuccess: () => {
      toast.success('Offer status updated');
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.OFFERS]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.DASHBOARD]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to update offer status'));
    },
  });
};

export const useDeleteOffer = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOffer(panel, id),
    onSuccess: () => {
      toast.success('Offer deleted successfully');
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.OFFERS]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.DASHBOARD]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to delete offer'));
    },
  });
};

// 3. Coupons Queries & Mutations
export const useCoupons = (panel: string, params: PromotionListParams) =>
  useQuery({
    queryKey: [PROMOTION_KEYS.COUPONS, panel, params],
    queryFn: () => getCoupons(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useCoupon = (panel: string, id: string) =>
  useQuery({
    queryKey: [PROMOTION_KEYS.COUPON, panel, id],
    queryFn: () => getCoupon(panel, id),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useCreateCoupon = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData | any) => createCoupon(panel, data),
    onSuccess: () => {
      toast.success('Coupon created successfully');
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.COUPONS]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.DASHBOARD]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to create coupon'));
    },
  });
};

export const useUpdateCoupon = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: {id: string; data: FormData | any}) => updateCoupon(panel, id, data),
    onSuccess: () => {
      toast.success('Coupon updated successfully');
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.COUPONS]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.COUPON]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.DASHBOARD]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to update coupon'));
    },
  });
};

export const useToggleCouponStatus = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, isActive}: {id: string; isActive?: boolean}) =>
      toggleCouponStatus(panel, id, isActive),
    onSuccess: () => {
      toast.success('Coupon status updated');
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.COUPONS]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.DASHBOARD]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to update coupon status'));
    },
  });
};

export const useDeleteCoupon = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCoupon(panel, id),
    onSuccess: () => {
      toast.success('Coupon deleted successfully');
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.COUPONS]});
      queryClient.invalidateQueries({queryKey: [PROMOTION_KEYS.DASHBOARD]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to delete coupon'));
    },
  });
};

// 4. Validate Coupon Mutation
export const useValidateCoupon = (panel: string) => {
  return useMutation({
    mutationFn: (data: ValidateCouponPayload) => validateCoupon(panel, data),
    onSuccess: (res: any) => {
      toast.success(res?.data?.message || 'Coupon is valid!');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Invalid coupon'));
    },
  });
};
