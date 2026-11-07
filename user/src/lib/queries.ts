import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {api, errorMessage} from './api';
import {useAuth} from './auth';
import type {
  Address,
  AddressInput,
  Cart,
  CheckoutResult,
  DeliveryOption,
  Fit,
  Home,
  NotificationList,
  Order,
  OrderList,
  OrderTab,
  PaymentStatus,
  Profile,
  ReturnResolution,
  ReturnRow,
  ProductDetail,
  ProductList,
  RazorpayInfo,
  WishlistItem,
} from './types';

/* Public catalog ----------------------------------------------------------- */

export type ListParams = {
  q?: string;
  gender?: 'WOMEN' | 'MEN' | 'KIDS';
  category?: string;
  subcategory?: string;
  brand?: string;
  size?: string;
  color?: string;
  fabric?: string;
  priceMin?: number;
  priceMax?: number;
  minDiscount?: number;
  inStock?: boolean;
  newOnly?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
};

export const useHome = () => useQuery({queryKey: ['home'], queryFn: () => api.get<Home>('/store/home')});

export const useProducts = (params: ListParams) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: () => api.get<ProductList>('/store/products', params),
    placeholderData: keepPreviousData,
  });

export const useProduct = (idOrSlug: string) =>
  useQuery({
    queryKey: ['product', idOrSlug],
    queryFn: () => api.get<ProductDetail>(`/store/products/${idOrSlug}`),
    // Shops add colour photos, prices and stock at any time: always show the latest
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

export const useSuggest = (q: string) =>
  useQuery({
    queryKey: ['suggest', q],
    queryFn: () =>
      api.get<{suggestions: {text: string; where: string; count: number}[]; products: ProductList['items']}>(
        '/store/search/suggest',
        {q},
      ),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });

export const usePaymentConfig = () =>
  useQuery({
    queryKey: ['payment-config'],
    queryFn: () => api.get<{online: boolean; keyId: string | null}>('/store/payment-config'),
    staleTime: 5 * 60_000,
  });

/* Signed-in customer ------------------------------------------------------- */

const PRIVATE = 'store-private';

export const useCart = (opts: {coupon?: string; delivery?: DeliveryOption} = {}) => {
  const {signedIn} = useAuth();
  return useQuery({
    queryKey: [PRIVATE, 'cart', opts],
    queryFn: () => api.get<Cart>('/store/cart', {coupon: opts.coupon || undefined, delivery: opts.delivery}),
    enabled: signedIn,
    placeholderData: keepPreviousData,
  });
};

/** Bag changes refresh every bag view (header count, bag page, checkout) */
const useBagMutation = <V,>(fn: (v: V) => Promise<unknown>, success?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: [PRIVATE, 'cart']});
      qc.invalidateQueries({queryKey: [PRIVATE, 'wishlist']});
      qc.invalidateQueries({queryKey: [PRIVATE, 'wishlist-ids']});
      if (success) toast.success(success);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
};

export const useAddToCart = () =>
  useBagMutation((v: {variantId: string; quantity?: number}) => api.post('/store/cart/items', {quantity: 1, ...v}), 'Added to bag');

export const useUpdateCartLine = () =>
  useBagMutation((v: {id: string; variantId?: string; quantity?: number}) =>
    api.patch(`/store/cart/items/${v.id}`, {variantId: v.variantId, quantity: v.quantity}),
  );

export const useRemoveCartLine = () =>
  useBagMutation((v: {id: string; toWishlist?: boolean}) =>
    api
      .del(`/store/cart/items/${v.id}`, v.toWishlist ? {toWishlist: 'true'} : undefined)
      .then(() => toast.success(v.toWishlist ? 'Moved to wishlist' : 'Removed from bag')),
  );

export const useWishlist = () => {
  const {signedIn} = useAuth();
  return useQuery({queryKey: [PRIVATE, 'wishlist'], queryFn: () => api.get<WishlistItem[]>('/store/wishlist'), enabled: signedIn});
};

export const useWishlistIds = () => {
  const {signedIn} = useAuth();
  return useQuery({queryKey: [PRIVATE, 'wishlist-ids'], queryFn: () => api.get<string[]>('/store/wishlist/ids'), enabled: signedIn});
};

export const useToggleWishlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({productId, saved}: {productId: string; saved: boolean}) =>
      saved ? api.del(`/store/wishlist/${productId}`) : api.post(`/store/wishlist/${productId}`),
    onMutate: async ({productId, saved}) => {
      // Fill / empty the heart straight away
      const key = [PRIVATE, 'wishlist-ids'];
      const before = qc.getQueryData<string[]>(key) ?? [];
      qc.setQueryData(key, saved ? before.filter((id) => id !== productId) : [...before, productId]);
      return {before};
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData([PRIVATE, 'wishlist-ids'], ctx?.before);
      toast.error(errorMessage(e));
    },
    onSuccess: (_d, {saved}) => toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist'),
    onSettled: () => {
      qc.invalidateQueries({queryKey: [PRIVATE, 'wishlist']});
      qc.invalidateQueries({queryKey: [PRIVATE, 'wishlist-ids']});
    },
  });
};

export const useAddresses = () => {
  const {signedIn} = useAuth();
  return useQuery({queryKey: [PRIVATE, 'addresses'], queryFn: () => api.get<Address[]>('/store/addresses'), enabled: signedIn});
};

export const useSaveAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, ...data}: AddressInput & {id?: string}) =>
      id ? api.patch<Address>(`/store/addresses/${id}`, data) : api.post<Address>('/store/addresses', data),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: [PRIVATE, 'addresses']});
      toast.success('Address saved');
    },
  });
};

export const useDeleteAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/store/addresses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: [PRIVATE, 'addresses']});
      toast.success('Address removed');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
};

export const useCheckout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {addressId: string; delivery: DeliveryOption; paymentMethod: 'COD' | 'ONLINE'; couponCode?: string}) =>
      api.post<CheckoutResult>('/store/checkout', v),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: [PRIVATE]});
      qc.invalidateQueries({queryKey: ['products']});
      qc.invalidateQueries({queryKey: ['product']});
    },
  });
};

export const usePaymentStatus = (razorpayOrderId?: string) => {
  const {signedIn} = useAuth();
  return useQuery({
    queryKey: [PRIVATE, 'payment', razorpayOrderId],
    queryFn: () => api.get<PaymentStatus>(`/store/payments/${razorpayOrderId}`),
    enabled: signedIn && !!razorpayOrderId,
  });
};

export const paymentApi = {
  verify: (v: {razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string}) =>
    api.post('/store/payments/verify', v),
  failed: (razorpayOrderId: string, reason?: string) => api.post('/store/payments/failed', {razorpayOrderId, reason}),
  retry: (razorpayOrderId: string) => api.post<RazorpayInfo>('/store/payments/retry', {razorpayOrderId}),
  cod: (razorpayOrderId: string) => api.post('/store/payments/cod', {razorpayOrderId}),
};

/* Orders, returns, reviews ------------------------------------------------ */

export const useOrderList = (tab: OrderTab, q = '') => {
  const {signedIn} = useAuth();
  return useQuery({
    queryKey: [PRIVATE, 'orders', tab, q],
    queryFn: () => api.get<OrderList>('/store/orders', {tab, q: q || undefined}),
    enabled: signedIn,
    placeholderData: keepPreviousData,
  });
};

export const useOrder = (id: string) => {
  const {signedIn} = useAuth();
  return useQuery({queryKey: [PRIVATE, 'order', id], queryFn: () => api.get<Order>(`/store/orders/${id}`), enabled: signedIn && !!id});
};

/** After any order change: lists, the order, returns, notifications and the bag may all differ */
const useOrderMutation = <V, R>(fn: (v: V) => Promise<R>, success?: (r: R, v: V) => string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r, v) => {
      qc.invalidateQueries({queryKey: [PRIVATE]});
      const msg = success?.(r, v);
      if (msg) toast.success(msg);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
};

export const useCancelOrder = () =>
  useOrderMutation(
    (v: {id: string; reason?: string}) => api.post<Order & {message: string}>(`/store/orders/${v.id}/cancel`, {reason: v.reason}),
    (r) => r.message,
  );

export type ReturnInput = {
  orderId: string;
  items: {orderItemId: string; quantity: number}[];
  reason: string;
  details?: string;
  resolution: ReturnResolution;
  exchangeFor?: string;
  images: string[];
};
export const useRequestReturn = () =>
  useOrderMutation(
    ({orderId, ...body}: ReturnInput) => api.post<{id: string; refundAmount: number; resolution: ReturnResolution}>(`/store/orders/${orderId}/return`, body),
    () => null,
  );

export const useBuyAgain = () =>
  useOrderMutation(
    (id: string) => api.post<{added: string[]; skipped: string[]}>(`/store/orders/${id}/buy-again`),
    (r) =>
      r.added.length
        ? `Added ${r.added.length} item${r.added.length > 1 ? 's' : ''} to your bag${r.skipped.length ? ` (${r.skipped.length} no longer available)` : ''}`
        : null,
  );

export const useReturns = () => {
  const {signedIn} = useAuth();
  return useQuery({queryKey: [PRIVATE, 'returns'], queryFn: () => api.get<ReturnRow[]>('/store/returns'), enabled: signedIn});
};

export type MyReviews = {
  mine: {
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    fit: Fit | null;
    images: string[];
    createdAt: string;
    product: {id: string; slug: string | null; name: string; images: {url: string}[]};
  }[];
  pending: {
    productId: string;
    slug: string | null;
    productName: string | null;
    size: string | null;
    color: string | null;
    image: string | null;
    order: {id: string; orderNumber: string; updatedAt: string};
  }[];
};

export const useReviews = () => {
  const {signedIn} = useAuth();
  return useQuery({queryKey: [PRIVATE, 'reviews'], queryFn: () => api.get<MyReviews>('/store/reviews'), enabled: signedIn});
};

export const useWriteReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({productId, ...body}: {productId: string; rating: number; title?: string; comment?: string; fit?: Fit | null; images: string[]}) =>
      api.post(`/store/products/${productId}/reviews`, body),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: [PRIVATE, 'reviews']});
      qc.invalidateQueries({queryKey: ['product']});
      toast.success('Thanks for your review');
    },
  });
};

/** Upload one photo (review or return); resolves to its URL */
export const uploadPhoto = (file: File) => {
  const fd = new FormData();
  fd.append('photo', file);
  return api.post<{url: string}>('/store/uploads', fd).then((r) => r.url);
};

/* Notifications ------------------------------------------------------------ */

export type NotificationTab = 'all' | 'unread' | 'orders' | 'offers' | 'account';

export const useNotifications = (tab: NotificationTab) => {
  const {signedIn} = useAuth();
  return useQuery({
    queryKey: [PRIVATE, 'notifications', tab],
    queryFn: () => api.get<NotificationList>('/store/notifications', {tab}),
    enabled: signedIn,
    placeholderData: keepPreviousData,
  });
};

export const useUnreadCount = () => {
  const {signedIn} = useAuth();
  return useQuery({
    queryKey: [PRIVATE, 'notifications', 'unread-count'],
    queryFn: () => api.get<{unread: number}>('/store/notifications/unread'),
    enabled: signedIn,
    refetchInterval: 60_000,
  });
};

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | 'all') => (id === 'all' ? api.post('/store/notifications/read-all') : api.post(`/store/notifications/${id}/read`)),
    onSuccess: () => qc.invalidateQueries({queryKey: [PRIVATE, 'notifications']}),
  });
};

/* Profile, help, password -------------------------------------------------- */

export const useProfile = () => {
  const {signedIn} = useAuth();
  return useQuery({queryKey: [PRIVATE, 'profile'], queryFn: () => api.get<Profile>('/store/profile'), enabled: signedIn});
};

export type ProfileInput = {
  fullname: string;
  email: string;
  alternatePhone?: string;
  gender: Profile['gender'];
  dateOfBirth: string;
};
export const useSaveProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: ProfileInput) => api.patch<Profile>('/store/profile', v),
    onSuccess: (p) => {
      qc.setQueryData([PRIVATE, 'profile'], p);
      qc.invalidateQueries({queryKey: ['me']});
      qc.invalidateQueries({queryKey: [PRIVATE, 'notifications']});
      toast.success('Profile saved');
    },
  });
};

export const useHelpInfo = () =>
  useQuery({queryKey: ['help'], queryFn: () => api.get<{topics: string[]; returnReasons: string[]}>('/store/help'), staleTime: Infinity});

export type SupportInput = {name: string; email: string; phone?: string; topic: string; orderNumber?: string; message: string};
export const sendSupport = (v: SupportInput, signedIn: boolean) =>
  api.post<{id: string; ticket: string}>(signedIn ? '/store/support/mine' : '/store/support', v);

export const passwordApi = {
  forgot: (identifier: string) => api.post('/store/auth/forgot-password', {identifier}),
  reset: (v: {token: string; newPassword: string; confirmPassword: string}) => api.post('/store/auth/reset-password', v),
  change: (v: {currentPassword: string; newPassword: string; confirmPassword: string}) =>
    api.post<{accessToken: string; refreshToken: string}>('/store/profile/password', v),
};
